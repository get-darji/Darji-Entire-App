export type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

export type UserRole = "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export type BasicUser = {
  id: string;
  phone: string;
  darjiCustomerId?: string;
  darjiAdminId?: string;
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
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  activeTailors: number;
  activeDeliveryPartners: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  pendingPayouts: number;
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
  darjiId?: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  providerRef?: string;
  customerPaid?: number;
  tailorQuote?: number;
  deliveryEarnings?: number;
  netRevenue?: number;
  source?: "ORDER" | "TAILORING_REQUEST";
  createdAt?: string;
  updatedAt?: string;
  order?: {
    id?: string;
    orderNumber?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    status?: string;
  };
};

export type TailorProfile = {
  id: string;
  darjiId?: string;
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
  verificationReuploadFields?: string[];
  verificationRejectedUntil?: string;
  verificationLastRejectedAt?: string;
  verification?: Record<string, unknown>;
  verificationDraft?: Record<string, unknown>;
  earnings?: number;
  user?: BasicUser;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryPartnerProfile = {
  id: string;
  darjiId?: string;
  userId: string;
  darjiPartnerId?: string;
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
  darjiId?: string;
  orderNumber: string;
  customerId: string;
  addressId: string;
  tailorId?: string;
  pickupPartnerId?: string;
  deliveryPartnerId?: string;
  deliveryType?: "PICKUP" | "DROP";
  deliveryRound?: string;
  batchId?: string;
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
  timelineEvents?: TimelineEvent[];
  request?: any;
};

export type TimelineEvent = {
  status: string;
  description?: string;
  timestamp: string;
  userId?: string;
  userName?: string;
};

export type SupportMessage = {
  id?: string;
  sender: "client" | "admin" | "system" | "internal";
  senderId?: string;
  senderName?: string;
  text: string;
  attachments?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  thumbnail?: string;
  type?: "text" | "voice" | "audio" | "image" | "video" | "document" | "system" | "internal";
  read?: boolean;
  isInternal?: boolean;
  createdAt?: string;
};

export type SupportStatus =
  | "OPEN"
  | "WAITING_FOR_CUSTOMER"
  | "WAITING_FOR_ADMIN"
  | "IN_REVIEW"
  | "RESOLVED"
  | "CLOSED";

export type SupportPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type SupportTicket = {
  id: string;
  darjiId?: string;
  userId: string;
  orderId?: string;
  subject: string;
  message?: string;
  status: SupportStatus | string;
  adminResponse?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: BasicUser | null;
  order?: {
    id?: string;
    orderNumber?: string;
    status?: string;
  } | null;
  category?: string | null;
  supportType?: string | null;
  priority?: SupportPriority | string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  ownedBy?: string | null;
  ownedByName?: string | null;
  attachments?: string[];
  messages?: SupportMessage[];
};

export type BugReport = {
  id: string;
  darjiId?: string;
  userId: string;
  title: string;
  description: string;
  screenshot?: string | null;
  deviceInfo: string;
  appVersion: string;
  status: "NEW" | "INVESTIGATING" | "IN_PROGRESS" | "FIXED" | "CLOSED";
  priority?: SupportPriority | string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: BasicUser | null;
  messages?: SupportMessage[];
};

export type AccountChangeRequestHistoryEntry = {
  requestedValues: Record<string, any>;
  status: "APPROVED" | "REJECTED";
  processedBy?: string;
  processedByName?: string;
  processedAt?: string;
  adminNotes?: string;
  createdAt?: string;
};

export type AccountChangeRequest = {
  id: string;
  darjiId?: string;
  userId: string;
  userRole?: "TAILOR" | "DELIVERY_PARTNER";
  type: "ShopName" | "BankAccount" | "UPI" | "Address" | "ContactNumber" | "Vehicle" | "RC" | "DrivingLicense" | "AccountDeletion";
  currentValues?: Record<string, any>;
  requestedValues: Record<string, any>;
  documents?: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes?: string | null;
  processedBy?: string | null;
  processedByName?: string | null;
  processedAt?: string | null;
  history?: AccountChangeRequestHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
  user?: BasicUser | null;
  messages?: SupportMessage[];
};


export type SupportStats = {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResponseTimeMs?: number | null;
  avgResolutionTimeMs?: number | null;
  volumeByCategory: Record<string, number>;
  volumeByUserRole: Record<string, number>;
};


export type Coupon = {
  id: string;
  darjiId?: string;
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
  darjiId?: string;
  key: string;
  value: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type WalletTransaction = {
  id: string;
  darjiId?: string;
  walletId: string;
  userId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  orderId?: string;
  transactionType: "CREDIT" | "DEBIT";
  category: "ORDER_EARNING" | "WEEKLY_PAYOUT" | "BONUS" | "PENALTY" | "ADJUSTMENT";
  amount: number;
  balanceAfterTransaction: number;
  remarks?: string;
  receiptUrl?: string;
  referenceNumber?: string;
  weekStart?: string;
  weekEnd?: string;
  createdBy?: string;
  createdAt?: string;
};

export type PaymentHistory = {
  id: string;
  darjiId?: string;
  userId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  amount: number;
  receiptUrl: string;
  notes?: string;
  paidBy: string;
  paidAt?: string;
  weekStart?: string;
  weekEnd?: string;
  referenceNumber?: string;
  status: "PAID" | "VOID";
};

export type WalletPayoutRow = {
  userId: string;
  profileId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  name: string;
  phone: string;
  walletBalance: number;
  currentWeekEarnings: number;
  pendingAmount: number;
  lastPayment?: PaymentHistory | null;
  status: "DUE" | "SETTLED";
};

export type WalletDetail = {
  user: BasicUser;
  balance: number;
  currentWeekEarnings: number;
  pendingAmount: number;
  lastPayment?: PaymentHistory | null;
  transactions: WalletTransaction[];
  payments: PaymentHistory[];
};

export type DeliveryFareOption = {
  partnerFare: number;
  customerCharge: number;
};

export type DeliveryFareSettings = {
  normal: DeliveryFareOption;
  express: DeliveryFareOption;
  instant: DeliveryFareOption;
};

export type TailorQuote = {
  id: string;
  darjiId?: string;
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
  darjiId?: string;
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
  selectedQuote?: TailorQuote | null;
  selectedQuoteId?: string;
  assignedTailorId?: string;
  assignedDeliveryBoyId?: string;
  pickupPartnerId?: string;
  deliveryPartnerId?: string;
  quoteCount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  quoteAmount?: number;
  deliveryFee?: number;
  platformFee?: number;
  homeMeasurementFee?: number;
  totalAmount?: number;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryRequest = {
  id: string;
  darjiId?: string;
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
  retryStatus?: "ACTIVE" | "PENDING_RETRY" | "ACTION_REQUIRED" | "CANCELLED" | "RESOLVED";
  retryCount?: number;
  lastFailureReason?: string;
  lastFailureAt?: string;
  nextScheduledBatch?: string;
  nextDeliveryRound?: string;
  routePosition?: number;
  routeTotal?: number;
  etaWindowStart?: string;
  etaWindowEnd?: string;
  deadlineAt?: string;
  acceptedAt?: string;
  notificationSentAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryBatch = {
  id: string;
  darjiId?: string;
  batchId: string;
  deliveryPartnerId?: string;
  deliveryType: "PICKUP" | "DROP";
  serviceLevel?: "STANDARD" | "EXPRESS";
  deliveryRound: string;
  roundAt: string;
  lockAt?: string;
  lockedAt?: string;
  routeOptimizedAt?: string;
  shift: string;
  area: string;
  slotIndex?: number;
  tasks: Array<DeliveryRequest & { request?: Partial<TailoringRequest> | null }>;
  ordersCount?: number;
  estimatedEarnings: number;
  totalDistance?: number;
  status: "scheduled" | "locked" | "active" | "completed" | "cancelled" | string;
  partner?: DeliveryPartnerProfile | null;
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
