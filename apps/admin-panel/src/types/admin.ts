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
  avatarPreset?: string;
  gender?: string;
  dateOfBirth?: string;
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
  isDefault?: boolean;
};

export type Payment = {
  id: string;
  darjiId?: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  providerRef?: string;
  paidAt?: string;
  refundedAt?: string;
  customerPaid?: number;
  recognizedAmount?: number;
  tailorQuote?: number;
  measurementVisitCost?: number;
  deliveryEarnings?: number;
  netRevenue?: number | null;
  packagingCost?: number;
  realized?: boolean;
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
  tailorRoles?: string[];
  measurementPartner?: { isEnabled?: boolean; visitPayout?: number; serviceAreas?: string[] };
  verificationStatus?: string;
  verificationSubmittedAt?: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  verificationReuploadFields?: string[];
  verificationRejectedUntil?: string;
  verificationLastRejectedAt?: string;
  verification?: Record<string, unknown>;
  verificationDraft?: Record<string, unknown>;
  registrationSnapshot?: Record<string, unknown>;
  registrationSnapshotCapturedAt?: string;
  sampleGallery?: TailorSample[];
  earnings?: number;
  user?: BasicUser;
  createdAt?: string;
  updatedAt?: string;
};

export type CatalogService = {
  id: string;
  category: string;
  name: string;
  price: number;
  estimatedDelivery?: string;
  description?: string;
  imageUrl?: string;
};

export type DashboardAnalytics = {
  period: { start: string; endExclusive: string; previousStart: string | null; previousEndExclusive: string | null; lifetime: boolean };
  orders: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    completionRate: number;
    cancellationRate: number;
  };
  finance: {
    grossPaid: number;
    paidOrders: number;
    tailorCost: number;
    deliveryCost: number;
    partnerCost: number;
    packagingCost: number;
    packagingCostPerOrder: number;
    netRevenue: number;
    realizedGrossPaid: number;
    realizedTailorCost: number;
    realizedDeliveryCost: number;
    realizedPartnerCost: number;
    realizedPackagingCost: number;
    realizedCompletedOrders: number;
    unrealizedCompletedOrders: number;
    averageOrderValue: number;
    pendingPayouts: number;
    pendingPayoutAsOf: string;
    onlineCollections: number;
    codCollections: number;
    refunds: number;
    completedCollections: number;
    incompleteCollections: number;
    cancelledCollections: number;
    cancellationFees: number;
    unrefundedCancelledCollections: number;
    duplicatePaymentRecordsIgnored: number;
    paidPartnerCost: number;
    pendingPartnerCost: number;
    pendingStitching: number;
    pendingMeasurement: number;
    pendingDelivery: number;
    rawWalletLiability: number;
  };
  financeDetails?: {
    grossPaid: {
      summary: {
        grossPaid: number;
        onlineCollections: number;
        codCollections: number;
        refunds: number;
        completedCollections: number;
        incompleteCollections: number;
        cancelledCollections: number;
        cancellationFees: number;
        unrefundedCancelledCollections: number;
        paidOrders: number;
        duplicatePaymentRecordsIgnored: number;
      };
      rows: Array<{
        key: string;
        paymentId: string;
        orderId: string;
        customerId?: string;
        customerName?: string;
        orderNumber?: string;
        paymentMethod: string;
        paymentDate?: string;
        refundDate?: string;
        orderStatus: string;
        completed: boolean;
        cancelled: boolean;
        cancellationFee: number;
        collectedAmount: number;
        refundedAmount: number;
        netCollectedAmount: number;
        duplicateRecords: number;
        codRemittanceStatus: "NOT_APPLICABLE" | "COLLECTED_UNRECONCILED";
      }>;
    };
    partnerCost: {
      summary: FinancialPartnerSummary;
      rows: FinancialPartnerRow[];
    };
    pendingPayouts: {
      asOf: string;
      summary: FinancialPartnerSummary;
      rows: FinancialPartnerRow[];
    };
    realizedRevenue: {
      summary: { completedOrders: number; grossPaid: number; tailorCost: number; deliveryCost: number; partnerCost: number; packagingCost: number; netRevenue: number };
      rows: Array<{
        orderId: string;
        orderNumber?: string;
        completionDate: string;
        collectedAmount: number;
        stitchingCost: number;
        measurementCost: number;
        deliveryCost: number;
        operationalAllowance: number;
        partnerCost: number;
        realizedRevenue: number;
        marginPercentage: number | null;
      }>;
    };
    reconciliation: {
      collectedInPeriod: number;
      completedOrderCollectionsInPeriod: number;
      advanceOrOtherCollectionsInPeriod: number;
      eligibleCompletedPartnerCost: number;
      currentEligiblePendingPayouts: number;
      rawWalletLiability: number;
      exceptions: Array<{ type: string; orderId?: string; sourceId?: string; message: string }>;
    };
  };
  partners: { activeTailors: number; activeDeliveryPartners: number };
  growth: { newCustomers: number; newTailors: number; newDeliveryPartners: number };
  drilldowns?: {
    orders: {
      total: string[];
      pending: string[];
      active: string[];
      completed: string[];
      cancelled: string[];
      resolved: string[];
      realized: string[];
    };
    finance: {
      paidPaymentIds: string[];
      partnerCostUserIds: string[];
      pendingPayoutUserIds: string[];
    };
    partners: {
      activeTailorIds: string[];
      activeDeliveryPartnerIds: string[];
    };
    growth: {
      newCustomerIds: string[];
      newTailorIds: string[];
      newDeliveryPartnerIds: string[];
    };
  };
  comparison: {
    orders: number | null;
    grossPaid: number | null;
    netRevenue: number | null;
    newCustomers: number | null;
    newTailors: number | null;
    newDeliveryPartners: number | null;
  };
  series: {
    orders: Array<{ label: string; completed: number; active: number; pending: number; cancelled: number }>;
    growth: Array<{ label: string; customers: number; tailors: number; partners: number }>;
    revenue: Array<{ label: string; grossPaid: number; partnerCost: number; packagingCost: number; netRevenue: number }>;
  };
  liveStages: Array<{ stage: string; count: number }>;
  topTailors: Array<{ profileId: string; userId: string; name: string; avatarUrl?: string; avatarSeed?: string; amount: number; completedOrders: number; rating: number }>;
  topDeliveryPartners: Array<{ profileId: string; userId: string; name: string; avatarUrl?: string; avatarGender?: string; amount: number; completedDeliveries: number; rating: number }>;
  limitations: string[];
};

export type FinancialPartnerSummary = {
  partnerCost: number;
  stitchingCost: number;
  measurementCost: number;
  deliveryCost: number;
  paidPartnerCost: number;
  pendingPartnerCost: number;
  pendingStitching: number;
  pendingMeasurement: number;
  pendingDelivery: number;
};

export type FinancialPartnerRow = {
  id: string;
  orderId: string;
  partnerId: string;
  partnerName: string;
  partnerType: "TAILOR" | "DELIVERY_PARTNER";
  category: "STITCHING" | "MEASUREMENT" | "DELIVERY";
  sourceId: string;
  sourceType: "ORDER" | "MEASUREMENT_VISIT" | "DELIVERY_TASK" | "DELIVERY_BATCH";
  taskId?: string;
  batchId?: string;
  amount: number;
  amountPaid: number;
  amountPending: number;
  payoutStatus: "PAID" | "PARTIALLY_PAID" | "PENDING";
  earningDate: string;
  completionDate?: string;
  recognitionDate: string;
  creditId?: string;
  creditAmount?: number;
};

export type MeasurementVisit = {
  id: string;
  darjiId?: string;
  requestId: string;
  customerId: string;
  stitchingTailorId: string;
  offeredTailorId?: string;
  assignedTailorId?: string;
  status: "OFFERED_TO_STITCHING_TAILOR" | "POOL" | "ACCEPTED" | "IN_PROGRESS" | "SUBMITTED" | "CANCELLED" | "EXPIRED" | string;
  scheduledAt: string;
  visitPayout?: number;
  customerName?: string;
  customerPhone?: string;
  pickupAddress?: string;
  garmentSummary?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  submission?: {
    measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
    fitPreferences?: string[];
    notes?: string;
    specialInstructions?: string;
    voiceNotes?: Array<{ url: string; originalName?: string; durationMs?: number; mimeType?: string }>;
    photos?: Array<{ url: string; originalName?: string; mimeType?: string }>;
  };
};

export type TailorSample = {
  _id?: string;
  id?: string;
  url: string;
  publicId?: string;
  bytes?: number;
  format?: string;
  originalName?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
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
  registrationSnapshot?: Record<string, unknown>;
  registrationSnapshotCapturedAt?: string;
  // Live location fields (optional — only present if rider has sent a heartbeat)
  currentLocation?: { type: string; coordinates: [number, number] } | null;
  lastLocationAccuracy?: number | null;
  lastLocationUpdatedAt?: string | null;
  lastLocationHeading?: number | null;
  lastLocationSpeed?: number | null;
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
  description?: string;
  gender?: string;
  clothType?: string;
  workType?: string;
  serviceCategory?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  measurementNotes?: string;
  media?: Array<{ url: string; resourceType: string; originalName?: string }>;
  voiceNotes?: Array<{ url: string; resourceType: string; originalName?: string }>;
  sampleProvided?: boolean;
  sampleMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
  designMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
  homeMeasurementBooked?: boolean;
  preferredMeasurementSlot?: string;
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
  platformFee?: number;
  smallOrderFee?: number;
  discount: number;
  couponCode?: string;
  deliveryFee?: number;
  deliveryMode?: "STANDARD" | "EXPRESS" | "INSTANT" | string;
  customerToTailorDistanceMeters?: number;
  totalChargeableDistanceMeters?: number;
  deliveryFeeLockedAt?: string;
  homeMeasurementFee?: number;
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
  userRole?: "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER";
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
  userRole?: "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER";
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
  userRole?: "CUSTOMER" | "TAILOR" | "DELIVERY_PARTNER";
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
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount?: number;
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
  allocations?: PayoutAllocation[];
  allocationMode?: "EXACT" | "RECONSTRUCTED";
  status: "PAID" | "VOID";
};

export type PayoutAllocation = {
  earningTransactionId: string;
  sourceId?: string;
  sourceType: "STITCHING" | "MEASUREMENT" | "DELIVERY_TASK" | "DELIVERY_BATCH" | "BONUS" | "ADJUSTMENT";
  amount: number;
  originalAmount: number;
  label: string;
  earnedAt?: string;
};

export type PayoutBreakdown = Record<PayoutAllocation["sourceType"], number>;

export type WalletPayoutRow = {
  userId: string;
  profileId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  payoutKind?: "TAILOR" | "DELIVERY" | "MEASUREMENT";
  name: string;
  phone: string;
  walletBalance: number;
  currentWeekEarnings: number;
  periodPendingAmount?: number;
  pendingAmount: number;
  pendingBreakdown?: PayoutBreakdown;
  unpaidItemCount?: number;
  oldestUnpaidAt?: string | null;
  lastPayment?: PaymentHistory | null;
  status: "DUE" | "SETTLED";
};

export type WalletDetail = {
  user: BasicUser;
  balance: number;
  currentWeekEarnings: number;
  pendingAmount: number;
  pendingBreakdown: PayoutBreakdown;
  unpaidItemCount: number;
  oldestUnpaidAt?: string | null;
  outstandingAllocations: PayoutAllocation[];
  lastPayment?: PaymentHistory | null;
  transactions: WalletTransaction[];
  payments: PaymentHistory[];
};

export type FinancialLedgerEntry = {
  id: string;
  darjiId?: string;
  occurredAt?: string;
  entryType: "CUSTOMER_PAYMENT" | "REFUND" | "PARTNER_PAYOUT" | "PARTNER_EARNING";
  direction: "IN" | "OUT" | "ACCRUAL";
  accountingType: "CASH" | "LIABILITY";
  category: string;
  amount: number;
  status: string;
  method?: string;
  referenceNumber?: string;
  sourceId?: string;
  sourceLabel?: string;
  partyId?: string;
  partyType?: "TAILOR" | "DELIVERY_PARTNER";
  partyName?: string;
  receiptUrl?: string;
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
  estimatedHours?: number;
  message?: string;
  pickupIncluded?: boolean;
  status: string;
  deliveryEstimate?: {
    deliveryMode?: string;
    oneWayDistanceMeters?: number;
    totalChargeableDistanceMeters?: number;
    deliveryFee?: number;
  };
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
  serviceCategory?: string;
  selectedWorkItems?: string[];
  otherWorkDescription?: string;
  measurement?: { label?: string; fields?: Record<string, string | number>; imageUrl?: string };
  pickupAddress: string;
  media?: Array<{ url: string; resourceType: string; originalName?: string }>;
  voiceNotes?: Array<{ url: string; resourceType: string; originalName?: string }>;
  designMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
  items?: OrderItem[];
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
  deliveryMode?: "STANDARD" | "EXPRESS" | "INSTANT" | string;
  customerToTailorDistanceMeters?: number;
  totalChargeableDistanceMeters?: number;
  deliveryFeeLockedAt?: string;
  platformFee?: number;
  smallOrderFee?: number;
  homeMeasurementFee?: number;
  couponCode?: string;
  discountAmount?: number;
  homeMeasurementBooked?: boolean;
  preferredMeasurementSlot?: string;
  itemCount?: number;
  totalAmount?: number;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  timelineEvents?: TimelineEvent[];
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
  type: "customer_to_tailor" | "tailor_to_customer" | "darji_to_customer";
  deliveryType?: "PICKUP" | "DROP";
  assignedDeliveryPartnerId?: string;
  batchId?: string;
  serviceLevel?: "STANDARD" | "EXPRESS" | "INSTANT";
  deliveryRound?: string;
  roundAt?: string;
  taskStatus: string;
  shift: string;
  estimatedDistanceKm?: number;
  distanceMeters?: number;
  estimatedEarnings: number;
  estimatedPayout?: number;
  finalPayout?: number;
  pickupAddress: string;
  dropAddress: string;
  customerName?: string;
  customerPhone?: string;
  tailorName?: string;
  tailorPhone?: string;
  clothType?: string;
  workType?: string;
  itemCount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmount?: number;
  cashCollectionRequired?: boolean;
  cashCollected?: boolean;
  cashCollectedAt?: string;
  sampleProvided?: boolean;
  sampleMedia?: Array<{ url: string; resourceType: string; originalName?: string }>;
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
  pickupOtpVerifiedAt?: string;
  dropOtpVerifiedAt?: string;
  clothPhotos?: Array<{ url: string; resourceType: string; originalName?: string }>;
  samplePhotos?: Array<{ url: string; resourceType: string; originalName?: string }>;
  deliveryPhotos?: Array<{ url: string; resourceType: string; originalName?: string }>;
  failureHistory?: Array<{
    reason?: string;
    note?: string;
    failedAt?: string;
    action?: string;
    nextScheduledBatch?: string;
    deliveryRound?: string;
    actorId?: string;
  }>;
  timelineEvents?: TimelineEvent[];
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
  pickupCount?: number;
  dropCount?: number;
  stopsCount?: number;
  payableDistanceMeters?: number;
  estimatedDurationSeconds?: number;
  estimatedEarnings: number;
  estimatedPayout?: number;
  finalPayout?: number;
  totalDistance?: number;
  status: "scheduled" | "locked" | "active" | "completed" | "cancelled" | string;
  partner?: DeliveryPartnerProfile | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OperationalAlert = {
  id: string;
  type: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  dedupeKey: string;
  entityType?: string;
  entityId?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
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
  hasCustomerActivity?: boolean;
  archivedCustomer?: boolean;
};

export type CustomerProfileOrder = {
  id: string;
  publicId: string;
  orderNumber: string;
  source: "ORDER" | "TAILORING_REQUEST";
  title: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  amount: number;
  itemCount: number;
  placedAt?: string;
  updatedAt?: string;
};

export type CustomerProfileActivity = {
  id: string;
  type: string;
  title: string;
  detail?: string;
  timestamp?: string;
  entityId?: string;
  entityType?: "ORDER" | "TAILORING_REQUEST" | "SUPPORT" | "CUSTOMER" | string;
  tone?: "default" | "success" | "danger" | string;
};

export type CustomerProfile = {
  customer: AdminUser & {
    preferredLanguage?: "en" | "hi";
  };
  stats: {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    paidTotal: number;
    supportTickets: number;
    measurementVisits: number;
  };
  access: {
    accountStatus?: string;
    suspendedUntil?: string | null;
    moderationReason?: string | null;
    preferredLanguage?: string;
    notificationPreferences: Record<string, boolean>;
    devicePermissions?: {
      platform: "android" | "ios" | "web";
      permissions: Record<"notifications" | "location" | "camera" | "mediaLibrary" | "microphone", "granted" | "denied" | "undetermined" | "limited" | "unavailable">;
      reportedAt?: string;
    } | null;
    registeredApps: string[];
    hasPushRegistration: boolean;
  };
  addresses: Address[];
  orders: CustomerProfileOrder[];
  recentActivity: CustomerProfileActivity[];
  notifications: Array<{ id: string; title: string; body: string; readAt?: string; createdAt?: string }>;
  supportTickets: Array<{ id: string; darjiId?: string; subject: string; status: string; createdAt?: string; updatedAt?: string }>;
};

export type AuthSession = {
  user: BasicUser;
  accessToken: string;
  refreshToken?: string;
};

export type AdminOrderNote = {
  adminId: string;
  adminName: string;
  note: string;
  createdAt: string;
};

export type AdminOrderMetadata = {
  id: string;
  entityId: string;
  priority: "Normal" | "High" | "Urgent" | "VIP";
  notes: AdminOrderNote[];
  updatedAt?: string;
};

export type AdminActivityLog = {
  id: string;
  actorId: string;
  actorRole: string;
  actorName?: string;
  method: string;
  path: string;
  statusCode: number;
  entityType?: string;
  entityId?: string;
  summary: string;
  metadata?: {
    changes?: Array<{ field: string; before: unknown; after: unknown }>;
    [key: string]: unknown;
  };
  createdAt: string;
};

export type SystemHealth = {
  checkedAt: string;
  overall: "healthy" | "attention";
  checks: Array<{
    key: string;
    label: string;
    status: "healthy" | "degraded" | "unconfigured";
    detail: string;
  }>;
};

export type NotificationCampaign = {
  id: string;
  channel: "push";
  target: "everyone" | "customers" | "tailors" | "delivery" | "customer";
  targetUserId?: string;
  title: string;
  body: string;
  status: "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  eligibleRecipientCount?: number;
  deviceCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  error?: string;
  createdAt: string;
};

export type MarketingSignup = {
  id: string;
  source: "launch_notify" | "footer_newsletter";
  email?: string;
  createdAt: string;
};

export type MarketingAudienceSummary = {
  total: number;
  launchNotifyCount: number;
  newsletterCount: number;
  newsletterSignups: MarketingSignup[];
};
