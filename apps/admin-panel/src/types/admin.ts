export type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

export type UserRole = "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export type BasicUser = {
  id: string;
  phone: string;
  name?: string;
  role?: UserRole | string;
  accountStatus?: AccountStatus | string;
  suspendedUntil?: string | null;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AnalyticsSummary = {
  revenue: number;
  customers: number;
  activeTailors: number;
  activeDeliveryPartners: number;
  orders: number;
  openTickets: number;
};

export type Address = {
  id: string;
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
};

export type Payment = {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  providerRef?: string;
  createdAt?: string;
  updatedAt?: string;
  order?: {
    id?: string;
    orderNumber?: string;
    customerId?: string;
  };
};

export type TailorProfile = {
  id: string;
  userId: string;
  darjiTailorId?: string;
  shopName?: string;
  specialization?: string[];
  rating?: number;
  isAvailable: boolean;
  workingHours?: unknown;
  settings?: unknown;
  verificationStatus?: string;
  verificationSubmittedAt?: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  verification?: Record<string, unknown>;
  verificationDraft?: Record<string, unknown>;
  earnings?: number;
  user?: BasicUser;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryPartnerProfile = {
  id: string;
  userId: string;
  vehicleNumber?: string;
  isAvailable: boolean;
  deliveryType?: "PICKUP" | "DROP";
  assignedArea?: string;
  rating?: number;
  dailyEarnings?: number;
  weeklyEarnings?: number;
  monthlyEarnings?: number;
  workingHours?: unknown;
  settings?: unknown;
  verificationStatus?: string;
  verificationSubmittedAt?: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  verification?: Record<string, unknown>;
  verificationDraft?: Record<string, unknown>;
  user?: BasicUser;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  id?: string;
  serviceId: string;
  quantity: number;
  price?: number;
  instructions?: string;
  referenceImageUrl?: string;
  service?: {
    id: string;
    name: string;
    price: number;
    estimatedDelivery?: string;
    description?: string;
    category?: {
      id?: string;
      name?: string;
    };
  } | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  addressId: string;
  tailorId?: string;
  pickupPartnerId?: string;
  deliveryPartnerId?: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  pickupScheduledAt?: string;
  instructions?: string;
  pickupImageUrl?: string;
  deliveryProofUrl?: string;
  finalImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  address?: Address | null;
  customer?: BasicUser | null;
  tailor?: TailorProfile | null;
  pickupPartner?: DeliveryPartnerProfile | null;
  deliveryPartner?: DeliveryPartnerProfile | null;
  items: OrderItem[];
  payments?: Payment[];
};

export type SupportTicket = {
  id: string;
  userId: string;
  orderId?: string;
  subject: string;
  message?: string;
  status: string;
  adminResponse?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: BasicUser | null;
  order?: {
    id?: string;
    orderNumber?: string;
    status?: string;
  } | null;
};

export type Coupon = {
  id: string;
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SettingRecord = {
  id: string;
  key: string;
  value: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type TailorQuote = {
  id: string;
  requestId: string;
  tailorId: string;
  price: number;
  estimatedDays: number;
  message?: string;
  pickupIncluded?: boolean;
  status: string;
  tailor?: TailorProfile | null;
  createdAt?: string;
};

export type TailoringRequest = {
  id: string;
  customerId: string;
  description: string;
  gender?: string;
  clothType: string;
  workType: string;
  urgency: string;
  measurementNotes?: string;
  pickupAddress: string;
  media?: Array<{ url: string; resourceType: string; originalName?: string }>;
  sampleProvided?: boolean;
  sampleMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
  receivedMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
  stitchedMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
  orderStatus?: string;
  workStatus?: string;
  status: string;
  customer?: BasicUser | null;
  ownQuote?: TailorQuote | null;
  quoteCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryRequest = {
  id: string;
  taskId: string;
  orderId: string;
  tailorId: string;
  customerId: string;
  type: "customer_to_tailor" | "tailor_to_customer";
  assignedDeliveryPartnerId?: string;
  taskStatus: string;
  shift: string;
  estimatedDistanceKm?: number;
  estimatedEarnings: number;
  pickupAddress: string;
  dropAddress: string;
  customerName?: string;
  customerPhone?: string;
  tailorName?: string;
  tailorPhone?: string;
  clothType?: string;
  workType?: string;
  sampleProvided?: boolean;
  deadlineAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MeResponse = BasicUser & {
  wallet?: { balance: number };
  tailorProfile?: TailorProfile | null;
  deliveryProfile?: DeliveryPartnerProfile | null;
};

export type AdminUser = BasicUser & {
  tailorProfile?: TailorProfile | null;
  deliveryProfile?: DeliveryPartnerProfile | null;
};

export type AuthSession = {
  user: BasicUser;
  accessToken: string;
  refreshToken: string;
};
