export type UploadedMedia = {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "audio";
  bytes: number;
  format?: string;
  originalName?: string;
};

export type TailoringRequestItem = {
  id?: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string | null };
  measurementNotes?: string;
  media?: UploadedMedia[];
  sampleProvided?: boolean;
  sampleMedia?: UploadedMedia[];
  homeMeasurementBooked?: boolean;
};

export type TailorQuote = {
  id: string;
  requestId: string;
  tailorId: string;
  price: number;
  estimatedDays: number;
  estimatedHours?: number;
  message?: string;
  pickupIncluded?: boolean;
  status: "SUBMITTED" | "RESERVED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  deliveryEstimate?: {
    deliveryMode?: string;
    oneWayDistanceMeters?: number;
    totalChargeableDistanceMeters?: number;
    deliveryFee?: number;
  };
  tailor?: {
    id: string;
    shopName?: string;
    rating?: number;
    specialization?: string[];
    verification?: {
      shop?: {
        shopAddress?: string;
        shopAddressLine?: string;
        shopArea?: string;
        shopCity?: string;
        shopState?: string;
        shopPincode?: string;
        address?: string;
        area?: string;
        city?: string;
      };
      personal?: {
        address?: string;
        area?: string;
        city?: string;
      };
    };
    user?: {
      name?: string;
      phone?: string;
      avatarUrl?: string;
    };
  };
};

export type TailoringRequest = {
  id: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  urgency: string;
  pickupAddress: string;
  media?: UploadedMedia[];
  items?: TailoringRequestItem[];
  itemCount?: number;
  status: "QUOTE_REQUESTED" | "PAYMENT_PENDING" | "TAILOR_SELECTED" | "CANCELLED";
  orderStatus?: string;
  workStatus?: "ACCEPTED" | "WORKING" | "READY";
  paymentMethod?: "ONLINE" | "UPI" | "COD";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  quoteAmount?: number;
  deliveryFee?: number;
  platformFee?: number;
  homeMeasurementFee?: number;
  couponCode?: string;
  discountAmount?: number;
  totalAmount?: number;
  createdAt: string;
  selectedQuote?: TailorQuote | null;
};

export type Coupon = {
  id?: string;
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
};

export type Address = {
  id: string;
  label?: string;
  address?: string;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export type WalletSummary = {
  balance?: number;
  transactions?: Array<{ id: string; amount: number; type?: string; remarks?: string; createdAt?: string }>;
};

export type NotificationRow = {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
  data?: { orderId?: string; requestId?: string; screen?: string };
};

export type HandoffOtp = {
  taskId: string;
  orderId: string;
  type: "customer_to_tailor" | "tailor_to_customer";
  stage: "pickup" | "drop";
  otp: string;
  verified: boolean;
  taskStatus?: string;
  retryStatus?: string;
  retryCount?: number;
  lastFailureReason?: string;
  deliveryRound?: string;
  roundAt?: string;
  nextScheduledBatch?: string;
  etaWindowStart?: string;
  etaWindowEnd?: string;
  routePosition?: number;
  routeTotal?: number;
  batchId?: string;
  batchStatus?: string;
  batchLockAt?: string;
};

export type CustomerTailor = NonNullable<TailorQuote["tailor"]> & { ratingCount?: number; isAvailable?: boolean; verificationStatus?: string };
export type NotificationPreferences = Partial<Record<"notifications" | "orderUpdates" | "offersPromotions" | "pickupReminders" | "deliveryUpdates" | "quietHours" | "receivingNotifications", boolean>>;
export type CustomerStory = { id: string; name: string; location?: string; rating: number; review: string; createdAt?: string };
export type MeasurementVisit = { id?: string; status: string; otp?: string; preferredMeasurementSlot?: string };
export type DeliverySlot = { label: string; deliveryRound: string; roundAt: string };

export type CheckoutResponse =
  | { mode: "cod"; request: TailoringRequest }
  | {
      mode: "online";
      request: TailoringRequest;
      quote: TailorQuote;
      razorpay: {
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        name: string;
        description: string;
        prefill?: { name?: string; contact?: string };
      };
    };
