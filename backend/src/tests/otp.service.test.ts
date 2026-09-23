import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { OtpCooldownModel, OtpRequestModel } from "../models.js";
import { requestOtp } from "../services/otp.service.js";

test("development OTP uses no SMS; explicit 2Factor mode never silently falls back", async () => {
  const original = {
    nodeEnv: env.NODE_ENV,
    enabled: env.TWOFACTOR_ENABLED,
    key: env.TWOFACTOR_API_KEY,
    fallback: env.OTP_DEV_FALLBACK_ENABLED,
    fetch: globalThis.fetch
  };
  const model = OtpRequestModel as unknown as { create: (doc: Record<string, unknown>) => Promise<unknown> };
  const originalCreate = model.create;
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
    env.NODE_ENV = "development";
    env.TWOFACTOR_ENABLED = true;
    env.TWOFACTOR_API_KEY = "test-key";
    env.OTP_DEV_FALLBACK_ENABLED = true;
    model.create = async (doc) => { saved.push(doc); return doc; };
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
    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ status: "sent" }), { status: 200 });
    };

    const local = await requestOtp("9876543210");
    assert.equal(local.provider, "dev");
    assert.equal(local.otp, env.OTP_DEV_CODE);
    assert.equal(providerCalls, 0);
    assert.equal(saved.at(-1)?.provider, "dev");
    await assert.rejects(requestOtp("9876543210"), (error) => error instanceof AppError && error.statusCode === 429 && !!error.retryAfterSeconds);
    assert.equal(providerCalls, 0);

    const live = await requestOtp("9876543211", "twofactor");
    assert.equal(live.provider, "twofactor");
    assert.equal(live.otp, undefined);
    assert.equal(providerCalls, 1);
    assert.equal(saved.at(-1)?.provider, "twofactor");

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ status: "failed" }), { status: 500 });
    };
    await assert.rejects(requestOtp("9876543212", "twofactor"), (error) => error instanceof AppError && error.statusCode === 502);
    assert.equal(saved.length, 2);
    assert.equal(reservations.has("9876543212"), false);

    env.NODE_ENV = "production";
    await assert.rejects(requestOtp("9876543213", "twofactor"), (error) => error instanceof AppError && error.statusCode === 400);
    assert.equal(providerCalls, 2);

    globalThis.fetch = async () => {
      providerCalls += 1;
      return new Response(JSON.stringify({ status: "sent" }), { status: 200 });
    };
    const production = await requestOtp("9876543213");
    assert.equal(production.provider, "twofactor");
    assert.equal(production.otp, undefined);
    assert.equal(providerCalls, 3);
  } finally {
    env.NODE_ENV = original.nodeEnv;
    env.TWOFACTOR_ENABLED = original.enabled;
    env.TWOFACTOR_API_KEY = original.key;
    env.OTP_DEV_FALLBACK_ENABLED = original.fallback;
    globalThis.fetch = original.fetch;
    model.create = originalCreate;
    cooldownModel.findOneAndUpdate = originalCooldown.findOneAndUpdate;
    cooldownModel.findById = originalCooldown.findById;
    cooldownModel.deleteOne = originalCooldown.deleteOne;
  }
});
