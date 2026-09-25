import "dotenv/config";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const SOURCE_DB_NAME = "test";
const targetUri = process.env.MIGRATION_TARGET_MONGODB_URI;
const targetDbName = process.env.MIGRATION_TARGET_DB_NAME;
const apply = process.argv.includes("--apply");
const resume = process.argv.includes("--resume");

const collections = [
  "accountchangerequests", "addresses", "admin_audit_logs", "admin_order_metadata",
  "bugreports", "coupon_redemptions", "coupons", "darjicounters", "delivery_batches",
  "delivery_tasks", "deliverypartners", "launchrequests", "marketing_signups",
  "measurement_visits", "notification_campaigns", "operational_alerts", "orders",
  "paymenthistories", "payments", "reviews", "serviceareas", "servicecategories",
  "services", "settings", "supporttickets", "tailoringrequests", "tailorquotes",
  "tailors", "transactions", "translation_cache", "wallets", "wallettransactions"
] as const;

const testPeople = [
  { name: "Aman", prefix: "91000011" },
  { name: "Ishita", prefix: "91000012" },
  { name: "Solo", prefix: "91000013" },
  { name: "Prachi", prefix: "91000014" }
] as const;

function recoveredUser(id: unknown, phone: string, name: string, role: string, createdAt?: Date) {
  if (typeof id !== "string" || !id) throw new Error(`Missing original user ID for ${name} ${role}`);
  return {
    _id: id,
    phone,
    name,
    role,
    accountStatus: "ACTIVE",
    preferredLanguage: "en",
    createdAt: createdAt ?? new Date(),
    updatedAt: new Date()
  };
}

async function main() {
  const sourceUri = process.env.MONGODB_URI;
  if (!sourceUri || !targetUri || !targetDbName || !/^darji(?:_dev)?$/.test(targetDbName)) {
    throw new Error("Set MONGODB_URI, MIGRATION_TARGET_MONGODB_URI and MIGRATION_TARGET_DB_NAME=darji or darji_dev");
  }

  const source = await mongoose.createConnection(sourceUri, { dbName: SOURCE_DB_NAME }).asPromise();
  const target = await mongoose.createConnection(targetUri, { dbName: targetDbName }).asPromise();
  try {
    if (source.host === target.host && source.name === target.name) throw new Error("Source and target databases are the same");
    const sourceDb = source.db!;
    const targetDb = target.db!;
    const occupied = await targetDb.listCollections({}, { nameOnly: true }).toArray();
    if (occupied.length && !resume) throw new Error(`Target database ${targetDbName} is not empty; use --resume only after checking its contents`);
    if (resume && occupied.some((item) => item.name !== "users" && !collections.includes(item.name as typeof collections[number]))) {
      throw new Error(`Target database ${targetDbName} contains unexpected collections`);
    }

    const addresses = await sourceDb.collection("addresses").find({}).toArray();
    const tailors = await sourceDb.collection("tailors").find({ verificationStatus: "VERIFIED" }).toArray();
    const deliveries = await sourceDb.collection("deliverypartners").find({ verificationStatus: "VERIFIED" }).toArray();
    const recovered = [];
    for (const person of testPeople) {
      const address = addresses.find((item) => item.phone === `${person.prefix}01` && item.name === person.name);
      const tailor = tailors.find((item) => item.verification?.personal?.name === person.name);
      const delivery = deliveries.find((item) => item.verification?.personal?.name === person.name);
      if (!address || !tailor || !delivery || !tailor.verificationReviewedAt || !delivery.verificationReviewedAt) {
        throw new Error(`Cannot safely recover all three verified identities for ${person.name}`);
      }
      recovered.push(recoveredUser(address.userId, `${person.prefix}01`, person.name, "CUSTOMER", address.createdAt));
      recovered.push(recoveredUser(tailor.userId, `${person.prefix}02`, person.name, "TAILOR", tailor.createdAt));
      recovered.push(recoveredUser(delivery.userId, `${person.prefix}03`, person.name, "DELIVERY_PARTNER", delivery.createdAt));
    }

    const knownPhones = new Set(recovered.map((user) => user.phone));
    const sourceUsers = await sourceDb.collection<{ _id: string; phone: string }>("users").find({
      role: { $in: ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"] }
    }).toArray();
    const users = [...recovered, ...sourceUsers.filter((user) => !knownPhones.has(String(user.phone)))];
    if (targetDbName === "darji_dev") {
      users.push(recoveredUser(randomUUID(), "9999999999", "Development Admin", "SUPER_ADMIN"));
    }
    if (new Set(users.map((user) => String(user.phone))).size !== users.length || new Set(users.map((user) => String(user._id))).size !== users.length) {
      throw new Error("Recovered users have duplicate phone numbers or IDs");
    }

    const counts = await Promise.all(collections.map(async (name) => ({ name, count: await sourceDb.collection(name).countDocuments() })));
    console.log(JSON.stringify({ sourceDb: SOURCE_DB_NAME, targetDb: targetDbName, apply, collections: counts, recoveredTestUsers: recovered.length, copiedExistingUsers: users.length - recovered.length - (targetDbName === "darji_dev" ? 1 : 0), devAdmin: targetDbName === "darji_dev" }, null, 2));
    if (!apply) return;

    for (const { name, count } of counts) {
      if (!count) continue;
      const destination = targetDb.collection(name);
      for await (const document of sourceDb.collection(name).find({})) {
        if (resume && await destination.findOne({ _id: document._id })) continue;
        await destination.insertOne(document);
      }
      const sourceIndexes = await sourceDb.collection(name).listIndexes().toArray();
      for (const index of sourceIndexes.filter((item) => item.name !== "_id_")) {
        const options: Parameters<typeof destination.createIndex>[1] = { name: index.name };
        if (index.unique != null) options.unique = index.unique;
        if (index.sparse != null) options.sparse = index.sparse;
        if (index.expireAfterSeconds != null) options.expireAfterSeconds = index.expireAfterSeconds;
        if (index.partialFilterExpression != null) options.partialFilterExpression = index.partialFilterExpression;
        await destination.createIndex(index.key, options);
      }
    }
    const destinationUsers = targetDb.collection<{ _id: string; phone: string }>("users");
    for (const user of users) {
      if (resume && await destinationUsers.findOne({ _id: String(user._id) })) continue;
      await destinationUsers.insertOne(user);
    }
    await destinationUsers.createIndex({ phone: 1 }, { unique: true });
    const copiedUsers = await targetDb.collection("users").countDocuments();
    const copiedProfiles = await targetDb.collection("deliverypartners").countDocuments({ verificationStatus: "VERIFIED" });
    if (copiedUsers !== users.length || copiedProfiles !== deliveries.length) throw new Error("Migration read-back failed");
    for (const { name, count } of counts) {
      if (await targetDb.collection(name).countDocuments() !== count) throw new Error(`Migration read-back failed for ${name}`);
    }
    console.log(`Migration verified: ${copiedUsers} users, ${copiedProfiles} verified delivery profiles in ${targetDbName}`);
  } finally {
    await Promise.all([source.close(), target.close()]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
});
