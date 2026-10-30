import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { OtpDeliveryModel, OtpMetricModel } from "../models.js";
import { getOtpDeliveryHistory, otpPeriodStart, preserveOtpDeliveryHistory } from "../services/otp-delivery.service.js";

test("OTP analytics filter rolling periods and destinations, preserve lifetime history, and paginate all tracked sends", async () => {
  const database = await MongoMemoryServer.create();
  try {
    await mongoose.connect(database.getUri(), { dbName: "darji_otp_analytics_test" });
    await OtpDeliveryModel.init();
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    assert.equal(otpPeriodStart("24h", now)?.getTime(), now.getTime() - day);
    assert.equal(otpPeriodStart("7d", now)?.getTime(), now.getTime() - 7 * day);
    assert.equal(otpPeriodStart("30d", now)?.getTime(), now.getTime() - 30 * day);
    assert.equal(otpPeriodStart("lifetime", now), undefined);
    await OtpDeliveryModel.insertMany([
      { _id: "one-hour", phone: "9876543201", status: "PENDING", requestedAt: new Date(now.getTime() - day / 24), acceptedAt: now },
      { _id: "two-days", phone: "9876543202", status: "DELIVERED", requestedAt: new Date(now.getTime() - 2 * day), acceptedAt: now },
      { _id: "eight-days", phone: "9876543203", status: "FAILED", requestedAt: new Date(now.getTime() - 8 * day), acceptedAt: now },
      { _id: "forty-days", phone: "9876543204", status: "REJECTED", requestedAt: new Date(now.getTime() - 40 * day), acceptedAt: now },
      { _id: "old-history", phone: "9876543205", status: "DELIVERED", requestedAt: new Date(now.getTime() - 120 * day), acceptedAt: now },
      { _id: "not-sent", phone: "9876543206", status: "REQUEST_FAILED", requestedAt: new Date(now.getTime() - day / 24) }
    ]);
    await OtpMetricModel.create({ _id: "twofactor-successful-sends", successfulSendCount: 8 });
    await OtpDeliveryModel.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await Promise.all([preserveOtpDeliveryHistory(), preserveOtpDeliveryHistory()]);
    assert.ok(!(await OtpDeliveryModel.collection.listIndexes().toArray()).some((index) => index.expireAfterSeconds !== undefined));
    const lifetime = await getOtpDeliveryHistory(undefined, undefined, { period: "lifetime", pageSize: 2 });
    assert.deepEqual(lifetime.periodCounts, { "24h": 1, "7d": 2, "30d": 3, lifetime: 8 });
    assert.equal(lifetime.legacyAcceptedWithoutDetails, 3);
    assert.equal(lifetime.pagination.total, 5);
    assert.equal(lifetime.pagination.totalPages, 3);
    assert.equal(lifetime.rows.length, 2);
    const lastPage = await getOtpDeliveryHistory(undefined, undefined, { period: "lifetime", page: 99, pageSize: 2 });
    assert.equal(lastPage.pagination.page, 3);
    assert.equal(lastPage.rows[0]?.id, "old-history");
    const daily = await getOtpDeliveryHistory(undefined, undefined, { period: "24h" });
    assert.deepEqual(daily.rows.map((row) => row.phone), ["9876543201"]);
    assert.equal(daily.counts.REQUEST_FAILED, 1);
    assert.equal((await getOtpDeliveryHistory(undefined, "REQUEST_FAILED", { period: "24h" })).rows[0]?.phone, "9876543206");
    assert.equal((await getOtpDeliveryHistory("3202", undefined, { period: "7d" })).rows[0]?.id, "two-days");
    assert.equal((await getOtpDeliveryHistory("3202", undefined, { period: "24h" })).pagination.total, 0);
  } finally {
    await mongoose.disconnect();
    await database.stop();
  }
});
