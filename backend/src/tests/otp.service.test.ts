import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyOtpSchema } from "@darzi/shared";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { OtpCooldownModel, OtpRequestModel, UserModel } from "../models.js";
import { requestOtp, verifyOtp } from "../services/otp.service.js";

test("all OTP modes send SMS and enforce cooldown without silent fallback", async () => {
  const original = {
    nodeEnv: env.NODE_ENV,
    enabled: env.TWOFACTOR_ENABLED,
    key: env.TWOFACTOR_API_KEY,
    template: env.TWOFACTOR_TEMPLATE_NAME,
    fallback: env.OTP_DEV_FALLBACK_ENABLED,
    phones: env.OTP_TEST_CUSTOMER_PHONES,
    expiry: env.OTP_TEST_EXPIRES_AT,
    userFindOne: UserModel.findOne,
    fetch: globalThis.fetch
  };
  const model = OtpRequestModel as unknown as {
    create: (doc: Record<string, unknown>) => Promise<unknown>;
    findOne: (query: { phone: string }) => { sort: (order: unknown) => Promise<Record<string, unknown> | undefined> };
    findByIdAndUpdate: (id: string, update: Record<string, unknown>) => Promise<unknown>;
  };
  const originalCreate = model.create;
  const originalFindOne = model.findOne;
  const originalFindByIdAndUpdate = model.findByIdAndUpdate;
  const cooldownModel = OtpCooldownModel as unknown as {
    findOneAndUpdate: (filter: { _id: string }, update: { $set: { nextAllowedAt: Date; reservationId: string } }) => Promise<unknown>;
    findById: (phone: string) => Promise<{ nextAllowedAt: Date } | undefined>;
    deleteOne: (filter: { _id: string; reservationId: string }) => Promise<unknown>;
  };
  const originalCooldown = {
    findOneAndUpdate: cooldownModel.findOneAndUpdate,
    findById: cooldownModel.findById,
    deleteOne: cooldownModel.deleteOne
  };
  const reservations = new Map<string, { nextAllowedAt: Date; reservationId: string }>();
  const saved: Record<string, unknown>[] = [];
  let providerCalls = 0;

  try {
    for (const otp of ["1234", "123456"]) {
      assert.equal(verifyOtpSchema.safeParse({ phone: "9876543211", otp }).success, true);
    }
    assert.equal(verifyOtpSchema.safeParse({ phone: "9876543211", otp: "123" }).success, false);
    env.NODE_ENV = "development";
    env.TWOFACTOR_ENABLED = true;
    env.TWOFACTOR_API_KEY = "test-key";
    env.TWOFACTOR_TEMPLATE_NAME = "OTP1";
    env.OTP_DEV_FALLBACK_ENABLED = true;
    model.create = async (doc) => { const record = { ...doc, id: String(saved.length + 1), attempts: 0 }; saved.push(record); return record; };
    model.findOne = (query) => ({ sort: async () => [...saved].reverse().find((record) => record.phone === query.phone && !record.consumedAt) });
    model.findByIdAndUpdate = async (id, update) => {
      const record = saved.find((item) => item.id === id);
      if (record) {
        if (update.$inc) record.attempts = Number(record.attempts) + 1;
        if (update.consumedAt) record.consumedAt = update.consumedAt;
      }
      return record;
    };
    cooldownModel.findOneAndUpdate = async (filter, update) => {
      const current = reservations.get(filter._id);
      if (current && current.nextAllowedAt.getTime() > Date.now()) throw { code: 11000 };
      reservations.set(filter._id, update.$set);
      return update.$set;
    };
    cooldownModel.findById = async (phone) => reservations.get(phone);
    cooldownModel.deleteOne = async (filter) => {
      if (reservations.get(filter._id)?.reservationId === filter.reservationId) reservations.delete(filter._id);
    };
    globalThis.fetch = async (input, init) => {
      providerCalls += 1;
      const segments = new URL(String(input)).pathname.split("/");
      assert.deepEqual(segments.slice(1, 6), ["API", "V1", "test-key", "SMS", "9876543211"]);
      assert.equal(segments[6], "AUTOGEN");
      assert.equal(segments[7], "OTP1");
      assert.equal(init?.method, "GET");
      return new Response(JSON.stringify({ Status: "Success", Details: "5D6EBEE6-EC04-4776-846D-3600422BD9EF" }), { status: 200 });
    };

    const live = await requestOtp("9876543211");
    assert.equal(live.provider, "twofactor");
    assert.equal(live.otp, undefined);
    assert.equal(providerCalls, 1);
    assert.equal(saved.at(-1)?.provider, "twofactor");
    assert.equal(saved.at(-1)?.otpHash, undefined);
    assert.equal(saved.at(-1)?.providerSessionId, "5D6EBEE6-EC04-4776-846D-3600422BD9EF");
    await assert.rejects(requestOtp("9876543211"), (error) => error instanceof AppError && error.statusCode === 429 && !!error.retryAfterSeconds);
    assert.equal(providerCalls, 1);

    env.TWOFACTOR_TEMPLATE_NAME = "WRONG_TEMPLATE";
    await assert.rejects(requestOtp("9876543214", "twofactor"), (error) => error instanceof AppError && error.statusCode === 502);
    assert.equal(providerCalls, 1);
    assert.equal(reservations.has("9876543214"), false);
    env.TWOFACTOR_TEMPLATE_NAME = "OTP1";

    globalThis.fetch = async (input, init) => {
      providerCalls += 1;
      assert.match(String(input), /\/SMS\/VERIFY\/5D6EBEE6-EC04-4776-846D-3600422BD9EF\/\d{4,6}$/);
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({ Status: "Error", Details: "OTP Mismatch" }), { status: 200 });
    };
    await assert.rejects(verifyOtp("9876543211", "000000"), (error) => error instanceof AppError && error.statusCode === 400);
    assert.equal(saved.at(-1)?.attempts, 1);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ Status: "Success", Details: "OTP Matched" }), { status: 200 });
    };
    await verifyOtp("9876543211", "1234");
    assert.ok(saved.at(-1)?.consumedAt);
    await assert.rejects(verifyOtp("9876543211", "1234"), (error) => error instanceof AppError && error.statusCode === 400);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ status: "failed" }), { status: 500 });
    };
    await assert.rejects(requestOtp("9876543212", "twofactor"), (error) => error instanceof AppError && error.statusCode === 502);
    assert.equal(saved.length, 1);
    assert.equal(reservations.has("9876543212"), false);

    env.NODE_ENV = "production";
    assert.equal(providerCalls, 4);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ Status: "Success", Details: "5D6EBEE6-EC04-4776-846D-3600422BD9EF" }), { status: 200 });
    };
    const production = await requestOtp("9876543213", "twofactor");
    assert.equal(production.provider, "twofactor");
    assert.equal(production.otp, undefined);
    assert.equal(providerCalls, 5);
    env.OTP_TEST_CUSTOMER_PHONES = "9876543213";
    env.OTP_TEST_EXPIRES_AT = new Date(Date.now() + 60000).toISOString();
    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ Status: "Error", Details: "OTP Mismatch" }));
    };
    await assert.rejects(verifyOtp("9876543213", env.OTP_DEV_CODE, "ADMIN"));
    UserModel.findOne = (() => Promise.resolve({ role: "SUPER_ADMIN" })) as unknown as typeof UserModel.findOne;
    await assert.rejects(verifyOtp("9876543213", env.OTP_DEV_CODE, "CUSTOMER"));
    env.OTP_TEST_EXPIRES_AT = "2000-01-01T00:00:00Z";
    await assert.rejects(verifyOtp("9876543213", env.OTP_DEV_CODE, "CUSTOMER"));
    env.OTP_TEST_EXPIRES_AT = new Date(Date.now() + 60000).toISOString();
    UserModel.findOne = (() => Promise.resolve({ role: "CUSTOMER" })) as unknown as typeof UserModel.findOne;
    const beforeTestVerification = providerCalls;
    await verifyOtp("9876543213", env.OTP_DEV_CODE, "CUSTOMER");
    assert.equal(providerCalls, beforeTestVerification);
    assert.ok(saved.at(-1)?.consumedAt);
  } finally {
    env.NODE_ENV = original.nodeEnv;
    env.TWOFACTOR_ENABLED = original.enabled;
    env.TWOFACTOR_API_KEY = original.key;
    env.TWOFACTOR_TEMPLATE_NAME = original.template;
    env.OTP_DEV_FALLBACK_ENABLED = original.fallback;
    env.OTP_TEST_CUSTOMER_PHONES = original.phones;
    env.OTP_TEST_EXPIRES_AT = original.expiry;
    UserModel.findOne = original.userFindOne;
    globalThis.fetch = original.fetch;
    model.create = originalCreate;
    model.findOne = originalFindOne;
    model.findByIdAndUpdate = originalFindByIdAndUpdate;
    cooldownModel.findOneAndUpdate = originalCooldown.findOneAndUpdate;
    cooldownModel.findById = originalCooldown.findById;
    cooldownModel.deleteOne = originalCooldown.deleteOne;
  }
});
