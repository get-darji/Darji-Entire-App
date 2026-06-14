import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { serviceCatalog } from "@darzi/shared";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://darzi:darzi@localhost:5432/darzi?schema=public"
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: {},
    create: { phone: "9999999999", name: "Darzi Admin", role: "ADMIN", wallet: { create: { balance: 0 } } }
  });

  const customer = await prisma.user.upsert({
    where: { phone: "9876543210" },
    update: {},
    create: { phone: "9876543210", name: "Aarav Sharma", role: "CUSTOMER", wallet: { create: { balance: 250 } } }
  });

  const tailorUser = await prisma.user.upsert({
    where: { phone: "9876500001" },
    update: {},
    create: { phone: "9876500001", name: "Imran Khan", role: "TAILOR", wallet: { create: { balance: 0 } } }
  });

  const deliveryUser = await prisma.user.upsert({
    where: { phone: "9876500002" },
    update: {},
    create: { phone: "9876500002", name: "Rohit Verma", role: "DELIVERY_PARTNER", wallet: { create: { balance: 0 } } }
  });

  const tailor = await prisma.tailor.upsert({
    where: { userId: tailorUser.id },
    update: {},
    create: {
      userId: tailorUser.id,
      shopName: "Perfect Fit Studio",
      specialization: ["Shirt", "Suit", "Blouse"],
      workingHours: { from: "10:00", to: "20:00" }
    }
  });

  const deliveryPartner = await prisma.deliveryPartner.upsert({
    where: { userId: deliveryUser.id },
    update: {},
    create: { userId: deliveryUser.id, vehicleNumber: "DL01AB1234" }
  });

  for (const category of serviceCatalog) {
    const savedCategory = await prisma.serviceCategory.upsert({
      where: { name: category.category },
      update: {},
      create: { name: category.category, imageUrl: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80" }
    });

    for (const [name, price, estimatedDelivery, description] of category.items) {
      await prisma.service.upsert({
        where: { categoryId_name: { categoryId: savedCategory.id, name } },
        update: { price, estimatedDelivery, description },
        create: {
          categoryId: savedCategory.id,
          name,
          price,
          estimatedDelivery,
          description,
          imageUrl: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=900&q=80"
        }
      });
    }
  }

  const address = await prisma.address.upsert({
    where: { id: "seed-address-delhi" },
    update: {},
    create: {
      id: "seed-address-delhi",
      userId: customer.id,
      name: "Aarav Sharma",
      phone: customer.phone,
      line1: "B-42, Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      landmark: "Near Metro Gate 4",
      isDefault: true
    }
  });

  const shirt = await prisma.service.findFirstOrThrow({ where: { name: "Shirt" } });

  const order = await prisma.order.upsert({
    where: { orderNumber: "DRZ-SEED-1001" },
    update: {},
    create: {
      orderNumber: "DRZ-SEED-1001",
      customerId: customer.id,
      tailorId: tailor.id,
      pickupPartnerId: deliveryPartner.id,
      addressId: address.id,
      status: "PICKUP_ASSIGNED",
      paymentMethod: "COD",
      subtotal: 699,
      discount: 0,
      totalAmount: 699,
      pickupScheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      items: {
        create: {
          serviceId: shirt.id,
          quantity: 1,
          price: 699,
          instructions: "Slim fit, white buttons.",
          measurement: {
            create: {
              label: "Shirt measurements",
              fields: { chest: 40, shoulder: 18, length: 29, sleeve: 24 }
            }
          }
        }
      },
      payments: {
        create: { method: "COD", status: "PENDING", amount: 699 }
      }
    }
  });

  await prisma.coupon.upsert({
    where: { code: "DARZI100" },
    update: {},
    create: {
      code: "DARZI100",
      description: "Rs 100 off on first order",
      discountType: "FLAT",
      discountValue: 100,
      minOrderValue: 499,
      isActive: true
    }
  });

  await prisma.setting.upsert({
    where: { key: "platform" },
    update: { value: { supportPhone: "1800-000-000", pickupFee: 49 } },
    create: { key: "platform", value: { supportPhone: "1800-000-000", pickupFee: 49 } }
  });

  console.log({ admin: admin.phone, customer: customer.phone, tailor: tailorUser.phone, delivery: deliveryUser.phone, order: order.orderNumber });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
