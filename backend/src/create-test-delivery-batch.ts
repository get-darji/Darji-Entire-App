import "dotenv/config";
import { randomUUID } from "node:crypto";
import { connectDatabase, disconnectDatabase } from "./db.js";
import {
  DeliveryBatchModel,
  DeliveryRequestModel,
  DeliveryRound,
  DeliveryType,
  TailoringRequestModel,
  TailorModel,
  UserModel
} from "./models.js";
import { recalculateBatchTotals } from "./services/hybrid-delivery.service.js";

const TEST_AREA = "Darji Test Route - West Delhi";
const TEST_PAYOUT = 195;
const TEST_OTP = "1234";

const jobs = [
  {
    customerName: "Aarav Sharma",
    customerPhone: "9000003101",
    pickupAddress: "Tower 5, DLF Capital Greens, Moti Nagar, New Delhi, Delhi 110015",
    pickupLocation: { lat: 28.6573, lng: 77.1427 },
    tailorName: "Perfect Fit Studio",
    tailorPhone: "9000004101",
    dropAddress: "J-13/7, Rajouri Garden Main Market, New Delhi, Delhi 110027",
    dropLocation: { lat: 28.6469, lng: 77.1202 },
    clothType: "Shirt",
    workType: "Alteration"
  },
  {
    customerName: "Neha Kapoor",
    customerPhone: "9000003102",
    pickupAddress: "B-1 Community Centre, Janakpuri District Centre, New Delhi, Delhi 110058",
    pickupLocation: { lat: 28.6292, lng: 77.0815 },
    tailorName: "Needle Craft Tailors",
    tailorPhone: "9000004102",
    dropAddress: "3/12, Tilak Nagar Main Market, New Delhi, Delhi 110018",
    dropLocation: { lat: 28.6366, lng: 77.0967 },
    clothType: "Kurta",
    workType: "Stitching"
  },
  {
    customerName: "Kabir Malhotra",
    customerPhone: "9000003103",
    pickupAddress: "Sector 12 Dwarka Metro Station, Dwarka, New Delhi, Delhi 110075",
    pickupLocation: { lat: 28.5921, lng: 77.0407 },
    tailorName: "Classic Darzi House",
    tailorPhone: "9000004103",
    dropAddress: "Shop 22, Jail Road Market, Hari Nagar, New Delhi, Delhi 110064",
    dropLocation: { lat: 28.6244, lng: 77.1073 },
    clothType: "Trousers",
    workType: "Alteration"
  },
  {
    customerName: "Riya Mehta",
    customerPhone: "9000003104",
    pickupAddress: "Pacific Mall, Tagore Garden, Najafgarh Road, New Delhi, Delhi 110018",
    pickupLocation: { lat: 28.6421, lng: 77.1066 },
    tailorName: "Ajmal Khan Stitch Works",
    tailorPhone: "9000004104",
    dropAddress: "Ajmal Khan Road, Karol Bagh, New Delhi, Delhi 110005",
    dropLocation: { lat: 28.6517, lng: 77.1907 },
    clothType: "Blouse",
    workType: "Stitching"
  },
  {
    customerName: "Ishaan Batra",
    customerPhone: "9000003105",
    pickupAddress: "A-2/45, Paschim Vihar, New Delhi, Delhi 110063",
    pickupLocation: { lat: 28.6688, lng: 77.1019 },
    tailorName: "Janpath Tailor Studio",
    tailorPhone: "9000004105",
    dropAddress: "Janpath Market, Connaught Place, New Delhi, Delhi 110001",
    dropLocation: { lat: 28.6289, lng: 77.2187 },
    clothType: "Suit",
    workType: "Alteration"
  }
] as const;

async function upsertUser(phone: string, name: string, role: "CUSTOMER" | "TAILOR") {
  return UserModel.findOneAndUpdate(
    { phone },
    { $set: { name, role }, $setOnInsert: { phone } },
    { upsert: true, returnDocument: "after" }
  );
}

function nextRound() {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const target = new Date(istNow);
  target.setDate(target.getDate() + 1);
  target.setHours(13, 0, 0, 0);
  const offsetMs = istNow.getTime() - now.getTime();
  const roundAt = new Date(target.getTime() - offsetMs);
  const lockAt = new Date(now.getTime() - 60 * 1000);
  return { roundAt, lockAt };
}

async function main() {
  await connectDatabase();

  const now = new Date();
  const { roundAt, lockAt } = nextRound();
  const existingSlotCount = await DeliveryBatchModel.countDocuments({
    deliveryRound: DeliveryRound.ONE_PM,
    roundAt,
    status: { $ne: "cancelled" }
  });
  const batchId = `TEST-BATCH-${Date.now()}`;

  const batch = await DeliveryBatchModel.create({
    batchId,
    deliveryType: DeliveryType.PICKUP,
    serviceLevel: "STANDARD",
    deliveryRound: DeliveryRound.ONE_PM,
    roundAt,
    lockAt,
    lockedAt: now,
    routeOptimizedAt: now,
    shift: "morning",
    area: TEST_AREA,
    slotIndex: existingSlotCount + 1,
    tasks: [],
    ordersCount: jobs.length,
    pickupCount: jobs.length,
    dropCount: jobs.length,
    estimatedEarnings: TEST_PAYOUT,
    estimatedPayout: TEST_PAYOUT,
    status: "locked"
  });

  const taskIds: string[] = [];

  for (const [index, job] of jobs.entries()) {
    const customer = await upsertUser(job.customerPhone, job.customerName, "CUSTOMER");
    const tailorUser = await upsertUser(job.tailorPhone, job.tailorName, "TAILOR");
    const tailor = await TailorModel.findOneAndUpdate(
      { userId: tailorUser.id },
      {
        $set: {
          shopName: job.tailorName,
          verificationStatus: "VERIFIED",
          isAvailable: true,
          verification: { shop: { address: job.dropAddress, location: job.dropLocation } }
        },
        $setOnInsert: { userId: tailorUser.id, specialization: [job.clothType], workingHours: { from: "10:00", to: "20:00" } }
      },
      { upsert: true, returnDocument: "after" }
    );

    const order = await TailoringRequestModel.create({
      customerId: customer.id,
      description: `Test batch order ${index + 1}`,
      gender: index % 2 === 0 ? "MALE" : "FEMALE",
      clothType: job.clothType,
      workType: job.workType,
      urgency: "STANDARD",
      pickupAddress: job.pickupAddress,
      pickupLocation: job.pickupLocation,
      itemCount: 1,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      quoteAmount: 799,
      deliveryFee: 149,
      deliveryMode: "STANDARD",
      totalAmount: 948,
      deliveryType: DeliveryType.PICKUP,
      deliveryRound: DeliveryRound.ONE_PM,
      batchId,
      assignedTailorId: tailor.id,
      confirmedAt: now,
      orderStatus: "tailor_accepted",
      status: "TAILOR_SELECTED"
    });

    const task = await DeliveryRequestModel.create({
      orderId: order.id,
      tailorId: tailor.id,
      customerId: customer.id,
      type: "customer_to_tailor",
      deliveryType: DeliveryType.PICKUP,
      serviceLevel: "STANDARD",
      deliveryRound: DeliveryRound.ONE_PM,
      roundAt,
      assignedArea: TEST_AREA,
      batchId,
      taskStatus: "pending",
      shift: "morning",
      estimatedDistanceKm: 0,
      distanceMeters: 0,
      estimatedEarnings: TEST_PAYOUT / jobs.length,
      estimatedPayout: TEST_PAYOUT / jobs.length,
      pickupAddress: job.pickupAddress,
      dropAddress: job.dropAddress,
      pickupLocation: job.pickupLocation,
      dropLocation: job.dropLocation,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      tailorName: job.tailorName,
      tailorPhone: job.tailorPhone,
      clothType: job.clothType,
      workType: job.workType,
      itemCount: 1,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      totalAmount: 948,
      cashCollectionRequired: false,
      retryStatus: "ACTIVE",
      deadlineAt: new Date(roundAt.getTime() + 2 * 60 * 60 * 1000),
      pickupOtpOverride: TEST_OTP,
      dropOtpOverride: TEST_OTP,
      notificationSentAt: now,
      timelineEvents: [{ status: "TEST_BATCH_CREATED", description: "Test delivery batch seeded", timestamp: now }]
    });

    taskIds.push(task.id);
  }

  await DeliveryBatchModel.updateOne({ batchId }, { $set: { tasks: taskIds, deliveryJobIds: taskIds } });
  const optimizedBatch = await recalculateBatchTotals(batchId);
  await DeliveryBatchModel.updateOne(
    { batchId },
    {
      $set: {
        status: "locked",
        lockedAt: now,
        routeOptimizedAt: now,
        estimatedEarnings: TEST_PAYOUT,
        estimatedPayout: TEST_PAYOUT
      }
    }
  );
  await DeliveryRequestModel.updateMany(
    { batchId },
    { $set: { notificationSentAt: now } }
  );

  console.log(JSON.stringify({
    batchId,
    status: "locked",
    deliveryType: DeliveryType.PICKUP,
    deliveryRound: DeliveryRound.ONE_PM,
    area: TEST_AREA,
    jobs: jobs.length,
    stops: jobs.length * 2,
    otp: TEST_OTP,
    estimatedPayout: TEST_PAYOUT,
    payableDistanceMeters: optimizedBatch?.payableOptimizedDistanceMeters ?? null,
    taskIds
  }, null, 2));

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
