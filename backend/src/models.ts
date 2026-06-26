import { randomUUID } from "node:crypto";
import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { orderStatuses, paymentMethods, paymentStatuses, roles, supportStatuses } from "@darzi/shared";

const baseOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
} as const;

const stringId = {
  type: String,
  default: () => randomUUID()
};

export enum DeliveryType {
  PICKUP = "PICKUP",
  DROP = "DROP"
}

export enum DeliveryRound {
  ONE_PM = "ONE_PM",
  SIX_PM = "SIX_PM"
}

export const deliveryTypes = [DeliveryType.PICKUP, DeliveryType.DROP] as const;
export const deliveryRounds = [DeliveryRound.ONE_PM, DeliveryRound.SIX_PM] as const;


const userSchema = new Schema(
  {
    _id: stringId,
    phone: { type: String, required: true, unique: true, index: true },
    name: String,
    email: { type: String, sparse: true, unique: true },
    avatarUrl: String,
    role: { type: String, enum: roles, default: "CUSTOMER", index: true },
    accountStatus: { type: String, enum: ["ACTIVE", "SUSPENDED", "BANNED"], default: "ACTIVE", index: true },
    suspendedUntil: Date,
    moderationReason: String,
    moderatedAt: Date,
    refreshTokenHash: String,
    fcmToken: String,
    fcmTokens: [
      {
        token: { type: String, required: true },
        platform: String,
        app: String,
        updatedAt: { type: Date, default: Date.now }
      }
    ],
    expoPushTokens: [
      {
        token: { type: String, required: true },
        platform: String,
        app: String,
        updatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  baseOptions
);

const addressSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String,
    latitude: Number,
    longitude: Number,
    isDefault: { type: Boolean, default: false }
  },
  baseOptions
);

const serviceCategorySchema = new Schema(
  {
    _id: stringId,
    name: { type: String, required: true, unique: true },
    imageUrl: String
  },
  baseOptions
);

const serviceSchema = new Schema(
  {
    _id: stringId,
    categoryId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    estimatedDelivery: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: String,
    isActive: { type: Boolean, default: true }
  },
  baseOptions
);
serviceSchema.index({ categoryId: 1, name: 1 }, { unique: true });

const measurementSchema = new Schema(
  {
    label: String,
    fields: { type: Schema.Types.Mixed, default: {} },
    imageUrl: String
  },
  { _id: false, versionKey: false }
);

const orderItemSchema = new Schema(
  {
    _id: stringId,
    serviceId: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    referenceImageUrl: String,
    instructions: String,
    measurement: measurementSchema
  },
  {
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

const timelineEventSchema = new Schema(
  {
    status: { type: String, required: true },
    description: String,
    timestamp: { type: Date, default: Date.now },
    userId: String,
    userName: String
  },
  { _id: false, versionKey: false }
);

const orderSchema = new Schema(
  {
    _id: stringId,
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    addressId: { type: String, required: true },
    tailorId: { type: String, index: true },
    pickupPartnerId: { type: String, index: true },
    deliveryPartnerId: { type: String, index: true },
    deliveryType: { type: String, enum: deliveryTypes, index: true },
    deliveryRound: { type: String, index: true },
    batchId: { type: String, index: true },
    assignedDeliveryBoyId: { type: String, index: true },
    status: { type: String, enum: orderStatuses, default: "ORDER_PLACED", index: true },
    paymentMethod: { type: String, enum: paymentMethods, required: true },
    paymentStatus: { type: String, enum: paymentStatuses, default: "PENDING" },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    pickupScheduledAt: { type: Date, required: true },
    instructions: String,
    pickupImageUrl: String,
    deliveryProofUrl: String,
    finalImageUrl: String,
    items: [orderItemSchema],
    timelineEvents: { type: [timelineEventSchema], default: [] }
  },
  baseOptions
);

const tailorSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, unique: true },
    darjiTailorId: { type: String, unique: true, sparse: true },
    shopName: { type: String, required: true },
    specialization: [String],
    rating: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    workingHours: { type: Schema.Types.Mixed },
    settings: { type: Schema.Types.Mixed },
    verificationStatus: { type: String, enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"], default: "NOT_SUBMITTED", index: true },
    verificationSubmittedAt: Date,
    verificationReviewedAt: Date,
    verificationRejectionReason: String,
    verification: { type: Schema.Types.Mixed },
    verificationDraft: { type: Schema.Types.Mixed },
    earnings: { type: Number, default: 0 }
  },
  baseOptions
);

const deliveryPartnerSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, unique: true },
    vehicleNumber: String,
    deliveryType: { type: String, enum: deliveryTypes, default: "PICKUP", index: true },
    assignedArea: { type: String, default: "unassigned", index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    rating: { type: Number, default: 0 },
    dailyEarnings: { type: Number, default: 0 },
    weeklyEarnings: { type: Number, default: 0 },
    monthlyEarnings: { type: Number, default: 0 },
    workingHours: { type: Schema.Types.Mixed },
    settings: { type: Schema.Types.Mixed },
    verificationStatus: { type: String, enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"], default: "VERIFIED", index: true },
    verificationSubmittedAt: Date,
    verificationReviewedAt: Date,
    verificationRejectionReason: String,
    verification: { type: Schema.Types.Mixed },
    verificationDraft: { type: Schema.Types.Mixed }
  },
  baseOptions
);

const paymentSchema = new Schema(
  {
    _id: stringId,
    orderId: { type: String, required: true, index: true },
    method: { type: String, enum: paymentMethods, required: true },
    status: { type: String, enum: paymentStatuses, default: "PENDING", index: true },
    amount: { type: Number, required: true },
    providerRef: String
  },
  baseOptions
);

const couponSchema = new Schema(
  {
    _id: stringId,
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ["FLAT", "PERCENTAGE"], required: true },
    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: Number,
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  },
  baseOptions
);

const notificationSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    orderId: String,
    title: { type: String, required: true },
    body: { type: String, required: true },
    readAt: Date
  },
  baseOptions
);

const reviewSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String
  },
  baseOptions
);

const walletSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, unique: true },
    userType: { type: String, enum: ["TAILOR", "DELIVERY_PARTNER", "ADMIN"], default: "TAILOR", index: true },
    balance: { type: Number, default: 0 }
  },
  baseOptions
);

const walletTransactionSchema = new Schema(
  {
    _id: stringId,
    walletId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userType: { type: String, enum: ["TAILOR", "DELIVERY_PARTNER"], required: true, index: true },
    orderId: { type: String, index: true },
    transactionType: { type: String, enum: ["CREDIT", "DEBIT"], required: true, index: true },
    category: { type: String, enum: ["ORDER_EARNING", "WEEKLY_PAYOUT", "BONUS", "PENALTY", "ADJUSTMENT"], required: true, index: true },
    amount: { type: Number, required: true },
    balanceAfterTransaction: { type: Number, required: true },
    remarks: String,
    receiptUrl: String,
    referenceNumber: String,
    weekStart: Date,
    weekEnd: Date,
    createdBy: String
  },
  baseOptions
);
walletTransactionSchema.index(
  { userId: 1, orderId: 1, category: 1, transactionType: 1 },
  { unique: true, partialFilterExpression: { orderId: { $exists: true }, category: "ORDER_EARNING", transactionType: "CREDIT" } }
);

const paymentHistorySchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    userType: { type: String, enum: ["TAILOR", "DELIVERY_PARTNER"], required: true, index: true },
    walletTransactionId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    receiptUrl: { type: String, required: true },
    notes: String,
    paidBy: { type: String, required: true },
    weekStart: Date,
    weekEnd: Date,
    referenceNumber: String,
    status: { type: String, enum: ["PAID", "VOID"], default: "PAID", index: true },
    paidAt: { type: Date, default: Date.now }
  },
  baseOptions
);

const transactionSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    entityType: { type: String, enum: ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER", "ADMIN"], required: true, default: "CUSTOMER" },
    type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
    category: { type: String, enum: ["PAYMENT", "COD", "PAYOUT", "FEE", "REFUND", "OTHER"], required: true, default: "PAYMENT" },
    amount: { type: Number, required: true },
    orderId: { type: String, index: true },
    note: String
  },
  baseOptions
);

const otpRequestSchema = new Schema(
  {
    _id: stringId,
    phone: { type: String, required: true, index: true },
    userId: String,
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: Date,
    attempts: { type: Number, default: 0 }
  },
  baseOptions
);
otpRequestSchema.index({ phone: 1, createdAt: -1 });

const supportMessageSchema = new Schema(
  {
    sender: { type: String, enum: ["client", "admin", "system", "internal"], required: true },
    senderId: String,
    senderName: String,
    text: { type: String, required: true },
    attachments: [String],
    attachmentUrl: String,
    attachmentName: String,
    attachmentSize: Number,
    thumbnail: String,
    read: { type: Boolean, default: false },
    type: { type: String, enum: ["text", "voice", "audio", "image", "video", "document", "system"], default: "text" },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false, versionKey: false }
);

const supportTicketSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    orderId: String,
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: supportStatuses, default: "OPEN", index: true },
    adminResponse: String,
    category: String,
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM", index: true },
    assignedTo: { type: String, index: true },
    attachments: [String],
    messages: { type: [supportMessageSchema], default: [] }
  },
  baseOptions
);

const bugReportSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    screenshot: String,
    deviceInfo: { type: String, required: true },
    appVersion: { type: String, default: "0.1.0" },
    status: { type: String, enum: ["NEW", "INVESTIGATING", "IN_PROGRESS", "FIXED", "CLOSED"], default: "NEW", index: true },
    assignedTo: { type: String, index: true },
    messages: { type: [supportMessageSchema], default: [] }
  },
  baseOptions
);

const accountChangeRequestSchema = new Schema(
  {
    _id: stringId,
    userId: { type: String, required: true, index: true },
    userRole: { type: String, enum: ["TAILOR", "DELIVERY_PARTNER"], required: true, index: true },
    type: { type: String, required: true, index: true },
    requestedValues: { type: Schema.Types.Mixed, required: true },
    documents: [String],
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    adminNotes: String,
    processedBy: String,
    processedByName: String,
    processedAt: Date,
    messages: { type: [supportMessageSchema], default: [] }
  },
  baseOptions
);

const requestMediaSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "video"], required: true },
    bytes: { type: Number, required: true },
    format: String,
    originalName: String
  },
  { _id: false, versionKey: false }
);

const tailoringRequestSchema = new Schema(
  {
    _id: stringId,
    customerId: { type: String, required: true, index: true },
    description: { type: String, required: true },
    gender: String,
    clothType: { type: String, required: true },
    workType: { type: String, required: true },
    urgency: { type: String, required: true },
    measurement: measurementSchema,
    measurementNotes: String,
    pickupAddress: { type: String, required: true },
    media: [requestMediaSchema],
    sampleProvided: { type: Boolean, default: false },
    sampleMedia: [requestMediaSchema],
    receivedMedia: [requestMediaSchema],
    stitchedMedia: [requestMediaSchema],
    selectedQuoteId: { type: String, index: true },
    paymentMethod: { type: String, enum: paymentMethods },
    paymentStatus: { type: String, enum: paymentStatuses, default: "PENDING", index: true },
    quoteAmount: Number,
    deliveryFee: Number,
    platformFee: Number,
    homeMeasurementFee: Number,
    couponCode: String,
    discountAmount: { type: Number, default: 0 },
    itemCount: { type: Number, default: 1 },
    additionalItems: { type: [Schema.Types.Mixed], default: [] },
    totalAmount: Number,
    deliveryType: { type: String, enum: deliveryTypes, index: true },
    deliveryRound: { type: String, index: true },
    batchId: { type: String, index: true },
    assignedDeliveryBoyId: { type: String, index: true },
    assignedTailorId: { type: String, index: true },
    pickupPartnerId: { type: String, index: true },
    deliveryPartnerId: { type: String, index: true },
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationFee: Number,
    cancellationReason: String,
    orderStatus: {
      type: String,
      enum: ["payment_pending", "tailor_accepted", "pickup_started", "picked_up_from_customer", "received_by_tailor", "ready_for_delivery", "out_for_delivery", "delivery_retry_scheduled", "delivery_issue", "completed", "cancelled"],
      index: true
    },
    workStatus: { type: String, enum: ["ACCEPTED", "WORKING", "READY"], default: "ACCEPTED", index: true },
    status: { type: String, enum: ["QUOTE_REQUESTED", "PAYMENT_PENDING", "TAILOR_SELECTED", "CANCELLED"], default: "QUOTE_REQUESTED", index: true },
    timelineEvents: { type: [timelineEventSchema], default: [] }
  },
  baseOptions
);

const tailorQuoteSchema = new Schema(
  {
    _id: stringId,
    requestId: { type: String, required: true, index: true },
    tailorId: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    estimatedDays: { type: Number, required: true },
    estimatedHours: Number,
    message: String,
    pickupIncluded: { type: Boolean, default: true },
    status: { type: String, enum: ["SUBMITTED", "RESERVED", "ACCEPTED", "REJECTED"], default: "SUBMITTED", index: true }
  },
  baseOptions
);
tailorQuoteSchema.index({ requestId: 1, tailorId: 1 }, { unique: true });

const deliveryRequestSchema = new Schema(
  {
    _id: stringId,
    taskId: { ...stringId, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    tailorId: { type: String, index: true },
    customerId: { type: String, required: true, index: true },
    type: { type: String, enum: ["customer_to_tailor", "tailor_to_customer", "darji_to_customer"], required: true, index: true },
    deliveryType: { type: String, enum: deliveryTypes, required: true, index: true },
    deliveryRound: { type: String, required: true, index: true },
    roundAt: { type: Date, required: true, index: true },
    assignedArea: { type: String, default: "unassigned", index: true },
    batchId: { type: String, index: true },
    assignedDeliveryPartnerId: { type: String, index: true },
    assignedDeliveryBoyId: { type: String, index: true },
    taskStatus: { type: String, enum: ["pending", "accepted", "picked_up", "delivered", "cancelled"], default: "pending", index: true },
    shift: { type: String, enum: ["morning", "evening"], required: true, index: true },
    estimatedDistanceKm: Number,
    estimatedEarnings: { type: Number, required: true },
    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },
    pickupLocation: { type: Schema.Types.Mixed },
    dropLocation: { type: Schema.Types.Mixed },
    customerName: String,
    customerPhone: String,
    tailorName: String,
    tailorPhone: String,
    clothType: String,
    workType: String,
    paymentMethod: { type: String, enum: paymentMethods },
    paymentStatus: { type: String, enum: paymentStatuses, default: "PENDING" },
    totalAmount: Number,
    cashCollectionRequired: { type: Boolean, default: false },
    cashCollected: { type: Boolean, default: false },
    cashCollectedAt: Date,
    sampleProvided: { type: Boolean, default: false },
    sampleMedia: [requestMediaSchema],
    partnerLocation: { type: Schema.Types.Mixed },
    lastLocationAt: Date,
    deadlineAt: Date,
    retryStatus: { type: String, enum: ["ACTIVE", "PENDING_RETRY", "ACTION_REQUIRED", "CANCELLED", "RESOLVED"], default: "ACTIVE", index: true },
    retryCount: { type: Number, default: 0, index: true },
    lastFailureReason: String,
    lastFailureAt: Date,
    nextScheduledBatch: { type: Date, index: true },
    nextDeliveryRound: String,
    routePosition: Number,
    routeTotal: Number,
    etaWindowStart: Date,
    etaWindowEnd: Date,
    failureHistory: {
      type: [{
        reason: String,
        note: String,
        failedAt: Date,
        action: String,
        nextScheduledBatch: Date,
        deliveryRound: String,
        actorId: String
      }],
      default: []
    },
    acceptedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    pickupOtpVerifiedAt: Date,
    dropOtpVerifiedAt: Date,
    notificationSentAt: Date,
    clothPhotos: [requestMediaSchema],
    samplePhotos: [requestMediaSchema],
    timelineEvents: { type: [timelineEventSchema], default: [] }
  },
  baseOptions
);
deliveryRequestSchema.index({ orderId: 1, type: 1 }, { unique: true });

const deliveryBatchSchema = new Schema(
  {
    _id: stringId,
    batchId: { ...stringId, unique: true, index: true },
    deliveryPartnerId: { type: String, required: true, index: true },
    deliveryType: { type: String, enum: deliveryTypes, required: true, index: true },
    deliveryRound: { type: String, required: true, index: true },
    roundAt: { type: Date, required: true, index: true },
    shift: { type: String, enum: ["morning", "evening"], required: true, index: true },
    area: { type: String, required: true, default: "unassigned" },
    tasks: [{ type: String, required: true }],
    estimatedEarnings: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active", index: true }
  },
  baseOptions
);
deliveryBatchSchema.index({ deliveryPartnerId: 1, deliveryType: 1, deliveryRound: 1, roundAt: 1, area: 1 }, { unique: true });

const settingSchema = new Schema(
  {
    _id: stringId,
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true }
  },
  baseOptions
);

export const UserModel = mongoose.model("User", userSchema);
export const AddressModel = mongoose.model("Address", addressSchema);
export const ServiceCategoryModel = mongoose.model("ServiceCategory", serviceCategorySchema);
export const ServiceModel = mongoose.model("Service", serviceSchema);
export const OrderModel = mongoose.model("Order", orderSchema);
export const TailorModel = mongoose.model("Tailor", tailorSchema);
export const DeliveryPartnerModel = mongoose.model("DeliveryPartner", deliveryPartnerSchema);
export const PaymentModel = mongoose.model("Payment", paymentSchema);
export const CouponModel = mongoose.model("Coupon", couponSchema);
export const NotificationModel = mongoose.model("Notification", notificationSchema);
export const ReviewModel = mongoose.model("Review", reviewSchema);
export const WalletModel = mongoose.model("Wallet", walletSchema);
export const WalletTransactionModel = mongoose.model("WalletTransaction", walletTransactionSchema);
export const PaymentHistoryModel = mongoose.model("PaymentHistory", paymentHistorySchema);
export const TransactionModel = mongoose.model("Transaction", transactionSchema);
export const OtpRequestModel = mongoose.model("OtpRequest", otpRequestSchema);
export const SupportTicketModel = mongoose.model("SupportTicket", supportTicketSchema);
export const BugReportModel = mongoose.model("BugReport", bugReportSchema);
export const AccountChangeRequestModel = mongoose.model("AccountChangeRequest", accountChangeRequestSchema);
export const TailoringRequestModel = mongoose.model("TailoringRequest", tailoringRequestSchema);
export const TailorQuoteModel = mongoose.model("TailorQuote", tailorQuoteSchema);
export const DeliveryRequestModel = mongoose.model("DeliveryTask", deliveryRequestSchema, "delivery_tasks");
export const DeliveryBatchModel = mongoose.model("DeliveryBatch", deliveryBatchSchema, "delivery_batches");
export const SettingModel = mongoose.model("Setting", settingSchema);

export type UserDoc = InferSchemaType<typeof userSchema> & { id: string; _id: string };
