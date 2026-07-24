export type AppLanguage = "en" | "hi";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export function getLanguageLabel(language: AppLanguage) {
  return language === "hi" ? "\u0939\u093f\u0902\u0926\u0940" : "English";
}

const translations = {
  chooseLanguage: {
    en: "Choose your language",
    hi: "\u0905\u092a\u0928\u0940 \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902"
  },
  chooseLanguageCopy: {
    en: "Pick a language for this app. You can change it later from profile settings.",
    hi: "\u0907\u0938 \u090f\u092a \u0915\u0947 \u0932\u093f\u090f \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902\u0964 \u0906\u092a \u0907\u0938\u0947 \u092c\u093e\u0926 \u092e\u0947\u0902 \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u0938\u0947 \u092c\u0926\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964"
  },
  appLanguage: {
    en: "App Language",
    hi: "\u090f\u092a \u092d\u093e\u0937\u093e"
  },
  currentLanguage: {
    en: "Current language",
    hi: "\u092e\u094c\u091c\u0942\u0926\u093e \u092d\u093e\u0937\u093e"
  },
  languagePreferenceSaved: {
    en: "Saved on this device for future logins.",
    hi: "\u0906\u0917\u0947 \u0915\u0947 \u0932\u0949\u0917\u093f\u0928 \u0915\u0947 \u0932\u093f\u090f \u0907\u0938 \u0921\u093f\u0935\u093e\u0907\u0938 \u092a\u0930 \u0938\u0947\u0935 \u0915\u0930 \u0926\u093f\u092f\u093e \u0917\u092f\u093e \u0939\u0948\u0964"
  },
  languageUpdated: {
    en: "Language updated",
    hi: "\u092d\u093e\u0937\u093e \u0905\u092a\u0921\u0947\u091f \u0939\u094b \u0917\u0908"
  },
  languageUpdatedMessage: {
    en: "Your app language preference has been saved for future logins.",
    hi: "\u0906\u092a\u0915\u0940 \u090f\u092a \u092d\u093e\u0937\u093e \u092a\u0938\u0902\u0926 \u0906\u0917\u0947 \u0915\u0947 \u0932\u0949\u0917\u093f\u0928 \u0915\u0947 \u0932\u093f\u090f \u0938\u0947\u0935 \u0915\u0930 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964"
  },
  language: {
    en: "Language",
    hi: "\u092d\u093e\u0937\u093e"
  },
  english: {
    en: "English",
    hi: "\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940"
  },
  hindi: {
    en: "Hindi",
    hi: "\u0939\u093f\u0902\u0926\u0940"
  },
  login: {
    en: "LOGIN",
    hi: "\u0932\u0949\u0917\u093f\u0928"
  },
  verifyOtp: {
    en: "VERIFY OTP",
    hi: "\u0913\u091f\u0940\u092a\u0940 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902"
  },
  sendOtp: {
    en: "Send OTP",
    hi: "\u0913\u091f\u0940\u092a\u0940 \u092d\u0947\u091c\u0947\u0902"
  },
  verifyOtpButton: {
    en: "Verify OTP",
    hi: "\u0913\u091f\u0940\u092a\u0940 \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 \u0915\u0930\u0947\u0902"
  },
  changeNumber: {
    en: "Change number",
    hi: "\u0928\u0902\u092c\u0930 \u092c\u0926\u0932\u0947\u0902"
  },
  enterMobileNumber: {
    en: "Enter mobile number",
    hi: "\u092e\u094b\u092c\u093e\u0907\u0932 \u0928\u0902\u092c\u0930 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902"
  },
  invalidMobileNumber: {
    en: "Enter a valid 10 digit mobile number.",
    hi: "\u0915\u0943\u092a\u092f\u093e \u0938\u0939\u0940 10 \u0905\u0902\u0915\u094b\u0902 \u0915\u093e \u092e\u094b\u092c\u093e\u0907\u0932 \u0928\u0902\u092c\u0930 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964"
  },
  enterOtp: {
    en: "Enter OTP",
    hi: "\u0913\u091f\u0940\u092a\u0940 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902"
  },
  otpRequired: {
    en: "Enter the OTP to continue.",
    hi: "\u0906\u0917\u0947 \u092c\u0922\u093c\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0913\u091f\u0940\u092a\u0940 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902\u0964"
  },
  home: {
    en: "Home",
    hi: "\u0939\u094b\u092e"
  },
  search: {
    en: "Search",
    hi: "\u0916\u094b\u091c"
  },
  newRequest: {
    en: "New Request",
    hi: "\u0928\u092f\u093e \u0930\u093f\u0915\u094d\u0935\u0947\u0938\u094d\u091f"
  },
  requests: {
    en: "Requests",
    hi: "\u0930\u093f\u0915\u094d\u0935\u0947\u0938\u094d\u091f\u094d\u0938"
  },
  queues: {
    en: "Queues",
    hi: "\u0915\u094d\u092f\u0942"
  },
  alerts: {
    en: "Alerts",
    hi: "\u0905\u0932\u0930\u094d\u091f"
  },
  earnings: {
    en: "Earnings",
    hi: "\u0915\u092e\u093e\u0908"
  },
  profile: {
    en: "Profile",
    hi: "\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932"
  },
  completeProfile: {
    en: "Complete your profile",
    hi: "\u0905\u092a\u0928\u0940 \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u092a\u0942\u0930\u0940 \u0915\u0930\u0947\u0902"
  },
  onboardingCopy: {
    en: "This helps us personalize orders, invoices, tailor assignment, and future delivery updates.",
    hi: "\u0907\u0938\u0938\u0947 \u0939\u092e \u0911\u0930\u094d\u0921\u0930, \u0907\u0928\u0935\u0949\u0907\u0938, \u0926\u0930\u094d\u091c\u0940 \u0905\u0938\u093e\u0907\u0928\u092e\u0947\u0902\u091f \u0914\u0930 \u0906\u0917\u0947 \u0915\u0940 \u0921\u093f\u0932\u093f\u0935\u0930\u0940 \u0905\u092a\u0921\u0947\u091f\u094d\u0938 \u0915\u094b \u092c\u0947\u0939\u0924\u0930 \u092c\u0928\u093e \u092a\u093e\u0924\u0947 \u0939\u0948\u0902\u0964"
  },
  fullName: {
    en: "Full Name",
    hi: "\u092a\u0942\u0930\u093e \u0928\u093e\u092e"
  },
  enterYourName: {
    en: "Enter your name",
    hi: "\u0905\u092a\u0928\u093e \u0928\u093e\u092e \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902"
  },
  gender: {
    en: "Gender",
    hi: "\u0932\u093f\u0902\u0917"
  },
  male: {
    en: "Male",
    hi: "\u092a\u0941\u0930\u0941\u0937"
  },
  female: {
    en: "Female",
    hi: "\u092e\u0939\u093f\u0932\u093e"
  },
  other: {
    en: "Other",
    hi: "\u0905\u0928\u094d\u092f"
  },
  dateOfBirth: {
    en: "Date of Birth",
    hi: "\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f"
  },
  continue: {
    en: "Continue",
    hi: "\u091c\u093e\u0930\u0940 \u0930\u0916\u0947\u0902"
  },
  notifications: {
    en: "Notifications",
    hi: "\u0928\u094b\u091f\u093f\u092b\u093f\u0915\u0947\u0936\u0928"
  },
  pushNotifications: {
    en: "Push notifications",
    hi: "\u092a\u0941\u0936 \u0928\u094b\u091f\u093f\u092b\u093f\u0915\u0947\u0936\u0928"
  },
  orderUpdates: {
    en: "Order updates",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u0905\u092a\u0921\u0947\u091f"
  },
  orderAlertsAndOffers: {
    en: "Order alerts and offers",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u0905\u0932\u0930\u094d\u091f \u0914\u0930 \u0911\u092b\u0930"
  },
  pickupQuoteDeliveryAlerts: {
    en: "Pickup, quote and delivery alerts",
    hi: "\u092a\u093f\u0915\u0905\u092a, \u0915\u094b\u091f \u0914\u0930 \u0921\u093f\u0932\u093f\u0935\u0930\u0940 \u0905\u0932\u0930\u094d\u091f"
  },
  saveChanges: {
    en: "Save Changes",
    hi: "\u092c\u0926\u0932\u093e\u0935 \u0938\u0947\u0935 \u0915\u0930\u0947\u0902"
  },
  saveProfile: {
    en: "Save Profile",
    hi: "\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u0938\u0947\u0935 \u0915\u0930\u0947\u0902"
  },
  logout: {
    en: "Logout",
    hi: "\u0932\u0949\u0917\u0906\u0909\u091f"
  },
  signOut: {
    en: "Sign Out",
    hi: "\u0938\u093e\u0907\u0928 \u0906\u0909\u091f"
  },
  logoutConfirm: {
    en: "Are you sure you want to sign out of your Darji account?",
    hi: "\u0915\u094d\u092f\u093e \u0906\u092a \u0935\u093e\u0915\u0908 \u0905\u092a\u0928\u0947 Darji \u0905\u0915\u093e\u0909\u0902\u091f \u0938\u0947 \u0938\u093e\u0907\u0928 \u0906\u0909\u091f \u0915\u0930\u0928\u093e \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902?"
  },
  yesSignOut: {
    en: "Yes, Sign Out",
    hi: "\u0939\u093e\u0901, \u0938\u093e\u0907\u0928 \u0906\u0909\u091f \u0915\u0930\u0947\u0902"
  },
  cancel: {
    en: "Cancel",
    hi: "\u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902"
  },
  account: {
    en: "Account",
    hi: "\u0905\u0915\u093e\u0909\u0902\u091f"
  },
  orders: {
    en: "Orders",
    hi: "\u0911\u0930\u094d\u0921\u0930"
  },
  preferences: {
    en: "Preferences",
    hi: "\u092a\u0938\u0902\u0926"
  },
  support: {
    en: "Support",
    hi: "\u0938\u0939\u093e\u092f\u0924\u093e"
  },
  performance: {
    en: "Performance",
    hi: "\u092a\u094d\u0930\u0926\u0930\u094d\u0936\u0928"
  },
  app: {
    en: "App",
    hi: "\u090f\u092a"
  },
  accountSettings: {
    en: "Account Settings",
    hi: "\u0905\u0915\u093e\u0909\u0902\u091f \u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938"
  },
  appVersion: {
    en: "App Version",
    hi: "\u090f\u092a \u0935\u0930\u094d\u091c\u0928"
  },
  allServices: {
    en: "All Services",
    hi: "\u0938\u092d\u0940 \u0938\u0947\u0935\u093e\u090f\u0901"
  },
  launchingSoon: {
    en: "Launching Soon",
    hi: "\u091c\u0932\u094d\u0926 \u0932\u0949\u0928\u094d\u091a \u0939\u094b\u0917\u093e"
  },
  howToMeasure: {
    en: "How to Measure",
    hi: "\u0928\u093e\u092a \u0915\u0948\u0938\u0947 \u0932\u0947\u0902"
  },
  clothDetails: {
    en: "Cloth Details",
    hi: "\u0915\u092a\u0921\u093c\u0947 \u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940"
  },
  orderSummary: {
    en: "Order Summary",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u0938\u093e\u0930\u093e\u0902\u0936"
  },
  tailorQuotes: {
    en: "Tailor Quotes",
    hi: "\u0926\u0930\u094d\u091c\u0940 \u0915\u094b\u091f"
  },
  confirmOrder: {
    en: "Confirm Order",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u092a\u0941\u0937\u094d\u091f\u093f \u0915\u0930\u0947\u0902"
  },
  orderDetails: {
    en: "Order Details",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u0935\u093f\u0935\u0930\u0923"
  },
  trackOrder: {
    en: "Track Order",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u091f\u094d\u0930\u0948\u0915 \u0915\u0930\u0947\u0902"
  },
  safeSecure: {
    en: "Safe & Secure",
    hi: "\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924"
  },
  fast: {
    en: "Fast",
    hi: "\u0924\u0947\u091c\u093c"
  },
  bestServices: {
    en: "Best Services",
    hi: "\u092c\u0947\u0938\u094d\u091f \u0938\u0947\u0935\u093e\u090f\u0901"
  },
  editProfile: {
    en: "Edit Profile",
    hi: "\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u0938\u0902\u092a\u093e\u0926\u093f\u0924 \u0915\u0930\u0947\u0902"
  },
  savedAddresses: {
    en: "Saved Addresses",
    hi: "\u0938\u0947\u0935 \u0915\u093f\u090f \u0917\u090f \u092a\u0924\u0947"
  },
  addAddress: {
    en: "Add Address",
    hi: "\u092a\u0924\u093e \u091c\u094b\u0921\u093c\u0947\u0902"
  },
  walletPayments: {
    en: "Wallet & Payments",
    hi: "\u0935\u0949\u0932\u0947\u091f \u0914\u0930 \u092d\u0941\u0917\u0924\u093e\u0928"
  },
  transactionHistory: {
    en: "Transaction History",
    hi: "\u0932\u0947\u0928\u0926\u0947\u0928 \u0907\u0924\u093f\u0939\u093e\u0938"
  },
  coupons: {
    en: "Coupons",
    hi: "\u0915\u0942\u092a\u0928"
  },
  helpCenter: {
    en: "Help Center",
    hi: "\u0939\u0947\u0932\u094d\u092a \u0938\u0947\u0902\u091f\u0930"
  },
  contactSupport: {
    en: "Contact Support",
    hi: "\u0938\u092a\u094b\u0930\u094d\u091f \u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0902"
  },
  reportBug: {
    en: "Report a Bug",
    hi: "\u092c\u0917 \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0915\u0930\u0947\u0902"
  },
  customerStories: {
    en: "Customer Stories",
    hi: "\u0917\u094d\u0930\u093e\u0939\u0915 \u0915\u0939\u093e\u0928\u093f\u092f\u093e\u0901"
  },
  rateReview: {
    en: "Rate & Review",
    hi: "\u0930\u0947\u091f \u0914\u0930 \u0930\u093f\u0935\u094d\u092f\u0942"
  },
  appInfo: {
    en: "App Info",
    hi: "\u090f\u092a \u091c\u093e\u0928\u0915\u093e\u0930\u0940"
  },
  aboutDarji: {
    en: "About Darji",
    hi: "Darji \u0915\u0947 \u092c\u093e\u0930\u0947 \u092e\u0947\u0902"
  },
  privacyPolicy: {
    en: "Privacy Policy",
    hi: "\u092a\u094d\u0930\u093e\u0907\u0935\u0947\u0938\u0940 \u092a\u0949\u0932\u093f\u0938\u0940"
  },
  termsOfUse: {
    en: "Terms of Use",
    hi: "\u0909\u092a\u092f\u094b\u0917 \u0915\u0940 \u0936\u0930\u094d\u0924\u0947\u0902"
  },
  orderHistory: {
    en: "Order History",
    hi: "\u0911\u0930\u094d\u0921\u0930 \u0907\u0924\u093f\u0939\u093e\u0938"
  },
  deleteAccount: {
    en: "Delete Account",
    hi: "\u0905\u0915\u093e\u0909\u0902\u091f \u0921\u093f\u0932\u0940\u091f \u0915\u0930\u0947\u0902"
  },
  permanentlyRemoveAccount: {
    en: "Permanently remove account",
    hi: "\u0905\u0915\u093e\u0909\u0902\u091f \u0939\u092e\u0947\u0936\u093e \u0915\u0947 \u0932\u093f\u090f \u0939\u091f\u093e\u090f\u0902"
  },
  signOutOfAccount: {
    en: "Sign out of your account",
    hi: "\u0905\u092a\u0928\u0947 \u0905\u0915\u093e\u0909\u0902\u091f \u0938\u0947 \u0938\u093e\u0907\u0928 \u0906\u0909\u091f \u0915\u0930\u0947\u0902"
  },
  viewActiveAndPastOrders: {
    en: "View active and past orders",
    hi: "\u0938\u0915\u094d\u0930\u093f\u092f \u0914\u0930 \u092a\u0941\u0930\u093e\u0928\u0947 \u0911\u0930\u094d\u0921\u0930 \u0926\u0947\u0916\u0947\u0902"
  },
  nameGenderDob: {
    en: "Name, gender, Date of Birth",
    hi: "\u0928\u093e\u092e, \u0932\u093f\u0902\u0917, \u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f"
  },
  savedCount: {
    en: "saved",
    hi: "\u0938\u0947\u0935"
  },
  faqWorkflows: {
    en: "FAQs & workflows",
    hi: "\u090f\u092b\u090f\u0915\u094d\u092f\u0942 \u0914\u0930 \u092a\u094d\u0930\u094b\u0938\u0947\u0938"
  },
  chatWithSupportTeam: {
    en: "Chat with support team",
    hi: "\u0938\u092a\u094b\u0930\u094d\u091f \u091f\u0940\u092e \u0938\u0947 \u091a\u0948\u091f \u0915\u0930\u0947\u0902"
  },
  submitBugReport: {
    en: "Submit an application bug report",
    hi: "\u090f\u092a\u094d\u0932\u093f\u0915\u0947\u0936\u0928 \u092c\u0917 \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u092d\u0947\u091c\u0947\u0902"
  },
  refundAndCancellationRules: {
    en: "Refund and cancellation rules",
    hi: "\u0930\u093f\u092b\u0902\u0921 \u0914\u0930 \u0915\u0948\u0902\u0938\u0932\u0947\u0936\u0928 \u0928\u093f\u092f\u092e"
  },
  whoWeAreHowItWorks: {
    en: "Who we are & how it works",
    hi: "\u0939\u092e \u0915\u094c\u0928 \u0939\u0948\u0902 \u0914\u0930 \u092f\u0939 \u0915\u0948\u0938\u0947 \u0915\u093e\u092e \u0915\u0930\u0924\u093e \u0939\u0948"
  },
  readPrivacyPolicy: {
    en: "Read privacy policy",
    hi: "\u092a\u094d\u0930\u093e\u0907\u0935\u0947\u0938\u0940 \u092a\u0949\u0932\u093f\u0938\u0940 \u092a\u0922\u093c\u0947\u0902"
  },
  readTermsOfService: {
    en: "Read terms of service",
    hi: "\u0938\u0947\u0935\u093e \u0915\u0940 \u0936\u0930\u094d\u0924\u0947\u0902 \u092a\u0922\u093c\u0947\u0902"
  },
  supportCenter: {
    en: "Support Center",
    hi: "\u0938\u092a\u094b\u0930\u094d\u091f \u0938\u0947\u0902\u091f\u0930"
  },
  deliveryHistory: {
    en: "Delivery History",
    hi: "\u0921\u093f\u0932\u093f\u0935\u0930\u0940 \u0907\u0924\u093f\u0939\u093e\u0938"
  },
  transactionHistoryPayouts: {
    en: "Transaction history & payouts",
    hi: "\u0932\u0947\u0928\u0926\u0947\u0928 \u0907\u0924\u093f\u0939\u093e\u0938 \u0914\u0930 \u092a\u0947\u0906\u0909\u091f"
  },
  newOrderAlerts: {
    en: "New Order Alerts",
    hi: "\u0928\u090f \u0911\u0930\u094d\u0921\u0930 \u0905\u0932\u0930\u094d\u091f"
  },
  showRequestPopups: {
    en: "Show request popups.",
    hi: "\u0930\u093f\u0915\u094d\u0935\u0947\u0938\u094d\u091f \u092a\u0949\u092a\u0905\u092a \u0926\u093f\u0916\u093e\u090f\u0902\u0964"
  },
  soundNotifications: {
    en: "Sound Notifications",
    hi: "\u0938\u093e\u0909\u0902\u0921 \u0928\u094b\u091f\u093f\u092b\u093f\u0915\u0947\u0936\u0928"
  },
  playSoundForImportantAlerts: {
    en: "Play sound for important alerts.",
    hi: "\u092e\u0939\u0924\u094d\u0935\u092a\u0942\u0930\u094d\u0923 \u0905\u0932\u0930\u094d\u091f \u0915\u0947 \u0932\u093f\u090f \u0938\u093e\u0909\u0902\u0921 \u091a\u0932\u093e\u090f\u0902\u0964"
  },
  vibration: {
    en: "Vibration",
    hi: "\u0935\u093e\u0907\u092c\u094d\u0930\u0947\u0936\u0928"
  },
  vibrateOnUrgentAlerts: {
    en: "Vibrate on urgent alerts.",
    hi: "\u091c\u0930\u0942\u0930\u0940 \u0905\u0932\u0930\u094d\u091f \u092a\u0930 \u0935\u093e\u0907\u092c\u094d\u0930\u0947\u091f \u0915\u0930\u0947\u0902\u0964"
  },
  goOnline: {
    en: "Go Online",
    hi: "\u0911\u0928\u0932\u093e\u0907\u0928 \u091c\u093e\u090f\u0902"
  },
  updating: {
    en: "Updating...",
    hi: "\u0905\u092a\u0921\u0947\u091f \u0939\u094b \u0930\u0939\u093e \u0939\u0948..."
  },
  receivePickupDeliveryRequests: {
    en: "Receive pickup and delivery requests.",
    hi: "\u092a\u093f\u0915\u0905\u092a \u0914\u0930 \u0921\u093f\u0932\u093f\u0935\u0930\u0940 \u0930\u093f\u0915\u094d\u0935\u0947\u0938\u094d\u091f \u092a\u093e\u090f\u0902\u0964"
  },
  headsUpAlertsForNewJobs: {
    en: "Heads-up alerts for new jobs.",
    hi: "\u0928\u090f \u091c\u0949\u092c \u0915\u0947 \u0932\u093f\u090f \u0905\u0932\u0930\u094d\u091f \u092a\u093e\u090f\u0902\u0964"
  },
  playDeliverySounds: {
    en: "Play the Darji delivery sounds.",
    hi: "Darji \u0921\u093f\u0932\u093f\u0935\u0930\u0940 \u0938\u093e\u0909\u0902\u0921 \u091a\u0932\u093e\u090f\u0902\u0964"
  },
  vibrateOnUrgentTasks: {
    en: "Vibrate on urgent tasks.",
    hi: "\u091c\u0930\u0942\u0930\u0940 \u091f\u093e\u0938\u094d\u0915 \u092a\u0930 \u0935\u093e\u0907\u092c\u094d\u0930\u0947\u091f \u0915\u0930\u0947\u0902\u0964"
  },
  policiesInformation: {
    en: "Policies & Information",
    hi: "\u0928\u0940\u0924\u093f\u092f\u093e\u0901 \u0914\u0930 \u091c\u093e\u0928\u0915\u093e\u0930\u0940"
  }
} as const;

export type TranslationKey = keyof typeof translations;

export function t(language: AppLanguage, key: TranslationKey) {
  return translations[key][language] ?? translations[key].en;
}

export function localize(language: AppLanguage, english: string, hindi: string) {
  return language === "hi" ? hindi : english;
}
