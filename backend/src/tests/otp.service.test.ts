import assert from "node:assert/strict";
import { test } from "node:test";
import { requestOtpSchema, verifyOtpSchema } from "@darji/shared";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { OtpCooldownModel, OtpDeliveryModel, OtpMetricModel, OtpRequestModel } from "../models.js";
import { requestOtp, verifyOtp } from "../services/otp.service.js";

test("login requires real TwoFactor verification in every environment and rejects legacy development sessions", async () => {
  const original = {
    nodeEnv: env.NODE_ENV,
    enabled: env.TWOFACTOR_ENABLED,
    key: env.TWOFACTOR_API_KEY,
    fetch: globalThis.fetch
  };
  const requestModel = OtpRequestModel as unknown as {
    create: (doc: Record<string, unknown>) => Promise<unknown>;
    updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
    findOne: (query: { phone: string }) => { sort: (order: unknown) => Promise<Record<string, any> | undefined> };
    findByIdAndUpdate: (id: string, update: Record<string, any>) => Promise<unknown>;
  };
  const originalRequestModel = { create: requestModel.create, updateMany: requestModel.updateMany, findOne: requestModel.findOne, findByIdAndUpdate: requestModel.findByIdAndUpdate };
  const cooldownModel = OtpCooldownModel as unknown as {
    findOneAndUpdate: (filter: { _id: string }, update: { $set: { nextAllowedAt: Date; reservationId: string } }) => Promise<unknown>;
    findById: (phone: string) => Promise<{ nextAllowedAt: Date } | undefined>;
    deleteOne: (filter: { _id: string; reservationId: string }) => Promise<unknown>;
  };
  const originalCooldownModel = { findOneAndUpdate: cooldownModel.findOneAndUpdate, findById: cooldownModel.findById, deleteOne: cooldownModel.deleteOne };
  const metricModel = OtpMetricModel as unknown as {
    findByIdAndUpdate: (id: string, update: Record<string, any>, options: Record<string, unknown>) => Promise<unknown>;
  };
  const originalMetricUpdate = metricModel.findByIdAndUpdate;
  const originalDeliveryUpdate = OtpDeliveryModel.updateOne;
  const originalDeliveryCreate = OtpDeliveryModel.create;

  const reservations = new Map<string, { nextAllowedAt: Date; reservationId: string }>();
  const saved: Array<Record<string, any>> = [];
  let providerCalls = 0;
  let successfulSendCount = 0;

  try {
    env.NODE_ENV = "development";
    OtpDeliveryModel.updateOne = (async () => ({})) as any;
    OtpDeliveryModel.create = (async () => ({})) as any;
    assert.equal("mode" in requestOtpSchema.parse({ phone: "9876543210", mode: "default" }), false);
    for (const otp of ["1234", "123456"]) assert.equal(verifyOtpSchema.safeParse({ phone: "9876543211", otp }).success, true);
    assert.equal(verifyOtpSchema.safeParse({ phone: "9876543211", otp: "123" }).success, false);
    requestModel.create = async (doc) => {
      const record = { ...doc, id: String(saved.length + 1), attempts: 0 };
      saved.push(record);
      return record;
    };
    requestModel.updateMany = async (query, update) => {
      saved.filter((record) => record.phone === query.phone && !record.consumedAt).forEach((record) => { record.consumedAt = (update as any).$set.consumedAt; });
      return { modifiedCount: 1 };
    };
    requestModel.findOne = (query) => ({ sort: async () => [...saved].reverse().find((record) => record.phone === query.phone && !record.consumedAt) });
    requestModel.findByIdAndUpdate = async (id, update) => {
      const record = saved.find((item) => item.id === id);
      if (record) {
        if (update.$inc) record.attempts = Number(record.attempts) + Number(update.$inc.attempts ?? 0);
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
    cooldownModel.deleteOne = async (filter) => { if (reservations.get(filter._id)?.reservationId === filter.reservationId) reservations.delete(filter._id); };
    metricModel.findByIdAndUpdate = async (id, update, options) => {
      assert.equal(id, "twofactor-successful-sends");
      assert.equal(options.upsert, true);
      successfulSendCount += Number(update.$inc.successfulSendCount ?? 0);
      return { successfulSendCount, lastSentAt: update.$set.lastSentAt };
    };

    saved.push({ id: "legacy-dev-session", phone: "9876543210", provider: "dev", attempts: 0 });
    await assert.rejects(verifyOtp("9876543210", "123456"), (error) => error instanceof AppError && error.statusCode === 400);
    assert.equal(providerCalls, 0);
    env.TWOFACTOR_ENABLED = false;
    env.TWOFACTOR_API_KEY = undefined;
    await assert.rejects(requestOtp("9876543211"), (error) => error instanceof AppError && error.statusCode === 503);
    env.TWOFACTOR_ENABLED = true;
    env.TWOFACTOR_API_KEY = "test-key";
    globalThis.fetch = async (input, init) => {
      providerCalls += 1;
      const url = new URL(String(input));
      assert.equal(url.origin, "https://2factor.in");
      assert.match(url.pathname, /^\/API\/V1\/test-key\/SMS\/987654321[12]\/AUTOGEN\/OTP1$/);
      assert.equal(init?.method, "GET");
      return new Response(JSON.stringify({ Status: "Success", Details: "5D6EBEE6-EC04-4776-846D-3600422BD9EF" }), { status: 200 });
    };
    const sent = await requestOtp("9876543211", "TAILOR");
    assert.equal(sent.provider, "twofactor");
    assert.equal("fallback" in sent, false);
    assert.equal(providerCalls, 1);
    assert.equal(successfulSendCount, 1);
    assert.equal(saved.at(-1)?.otpHash, undefined);
    await assert.rejects(requestOtp("9876543211"), (error) => error instanceof AppError && error.statusCode === 429);
    assert.equal(providerCalls, 1);
    env.NODE_ENV = "production";
    await requestOtp("9876543212", "DELIVERY_PARTNER");
    assert.equal(successfulSendCount, 2);
    globalThis.fetch = async (input, init) => {
      providerCalls += 1;
      assert.match(String(input), /\/SMS\/VERIFY\/5D6EBEE6-EC04-4776-846D-3600422BD9EF\/123456$/);
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({ Status: "Error", Details: "OTP Mismatch" }), { status: 200 });
    };
    await assert.rejects(verifyOtp("9876543212", "123456"), (error) => error instanceof AppError && error.statusCode === 400);
    assert.equal(saved.at(-1)?.attempts, 1);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ Status: "Success", Details: "OTP Matched" }), { status: 200 });
    };
    await verifyOtp("9876543212", "654321");
    assert.ok(saved.at(-1)?.consumedAt);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ status: "failed" }), { status: 500 });
    };
    await assert.rejects(requestOtp("9876543213"), (error) => error instanceof AppError && error.statusCode === 502);
    assert.equal(successfulSendCount, 2);
    assert.equal(reservations.has("9876543213"), false);
  } finally {
    env.NODE_ENV = original.nodeEnv;
    OtpDeliveryModel.updateOne = originalDeliveryUpdate;
    OtpDeliveryModel.create = originalDeliveryCreate;
    env.TWOFACTOR_ENABLED = original.enabled;
    env.TWOFACTOR_API_KEY = original.key;
    globalThis.fetch = original.fetch;
    requestModel.create = originalRequestModel.create;
    requestModel.updateMany = originalRequestModel.updateMany;
    requestModel.findOne = originalRequestModel.findOne;
    requestModel.findByIdAndUpdate = originalRequestModel.findByIdAndUpdate;
    cooldownModel.findOneAndUpdate = originalCooldownModel.findOneAndUpdate;
    cooldownModel.findById = originalCooldownModel.findById;
    cooldownModel.deleteOne = originalCooldownModel.deleteOne;
    metricModel.findByIdAndUpdate = originalMetricUpdate;
  }
});
