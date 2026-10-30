import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { submitTailorVerificationController } from "../controllers/resource.controller.js";
import { errorHandler } from "../middleware/error.js";
import { TailorModel, UserModel } from "../models.js";

const payload = () => ({
  personal: { name: "Registration Test", address: "Test workshop, Delhi 110001", dob: "1990-01-01" },
  shop: { workFromHome: true, shopName: "Test workshop", shopAddress: "Test workshop, Delhi 110001", employeeCount: 1, yearsExperience: 5, shopPhotos: ["https://example.com/shop.jpg"] },
  specializationRows: [{ gender: "Both", clothType: "Kurta", stitchingType: "New Stitching", price: 0 }],
  specialties: ["Kurta"],
  idVerification: { idType: "Aadhaar", idNumber: "123412341234", aadhaarFrontUrl: "https://example.com/front.jpg", aadhaarBackUrl: "https://example.com/back.jpg", facePhotoUrl: "https://example.com/face.jpg" }
});

test("tailor registration saves a complete application with optional payout details", async () => {
  const database = await MongoMemoryServer.create();
  const app = express();
  app.use(express.json());
  app.post("/submit", (req, _res, next) => { req.user = { id: "registration-user", role: "TAILOR" }; next(); }, submitTailorVerificationController);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  try {
    await mongoose.connect(database.getUri(), { dbName: "darji_registration_test" });
    await UserModel.collection.insertOne({ _id: "registration-user", phone: "9876543210", role: "TAILOR" } as any);
    const address = server.address() as { port: number };
    const response = await fetch(`http://127.0.0.1:${address.port}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.data.tailorProfile.verificationStatus, "PENDING");
    assert.equal(await TailorModel.countDocuments({ userId: "registration-user" }), 1);
    const submit = async (changes: Record<string, unknown>) => {
      const result = await fetch(`http://127.0.0.1:${address.port}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload(), ...changes }) });
      return { status: result.status, body: await result.json() };
    };
    // Older app builds include empty strings for optional bank inputs.
    const blankBank = await submit({ bank: { accountHolder: "", accountNumber: "  ", ifsc: "", upi: "" } });
    assert.equal(blankBank.status, 200, JSON.stringify(blankBank.body));
    assert.equal(blankBank.body.data.tailorProfile.id, body.data.tailorProfile.id);
    assert.equal((await submit({ bank: { upi: "example@upi" } })).status, 200);
    const incompleteBank = await submit({ bank: { accountHolder: "Test Holder" } });
    assert.equal(incompleteBank.status, 400);
    assert.match(incompleteBank.body.message, /account holder, account number and IFSC together/);
    const invalidExperience = await submit({ shop: { ...payload().shop, yearsExperience: 5.5 } });
    assert.equal(invalidExperience.status, 400);
    assert.match(invalidExperience.body.message, /years of experience.*whole number/);
    const longSpecialty = await submit({ specialties: ["a".repeat(81)] });
    assert.equal(longSpecialty.status, 400);
    assert.match(longSpecialty.body.message, /2 to 80 characters/);
    assert.equal((await TailorModel.findOne({ userId: "registration-user" }).lean())?.verificationStatus, "PENDING");
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect(); await database.stop();
  }
});
