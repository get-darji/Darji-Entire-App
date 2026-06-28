import { BadgeCheck, Bell, Boxes, CalendarCheck, CreditCard, MapPinned, Ruler, Scissors, Shirt, Sparkles, Truck, Wand2 } from "lucide-react";

export const navItems = [
  { label: "How it works", href: "#how" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQs", href: "#faq" }
];

export const services = [
  { title: "Alterations", copy: "Hems, sleeves, waist adjustments, and fit corrections.", icon: Scissors },
  { title: "Repairs", copy: "Zippers, seams, buttons, lining repair, and restoration.", icon: Wand2 },
  { title: "Custom Stitching", copy: "Made-to-measure garments from your fabric or sample.", icon: Ruler },
  { title: "Men's Wear", copy: "Shirts, trousers, kurta sets, jackets, and formal wear.", icon: Shirt },
  { title: "Women's Wear", copy: "Blouses, suits, dresses, lehengas, and daily wear.", icon: Sparkles },
  { title: "Kids Wear", copy: "Comfort-first tailoring for school, events, and festivals.", icon: Boxes }
];

export const howItWorks = [
  { title: "Upload Photos", copy: "Add garment photos, videos, notes, measurements, or sample references.", icon: Shirt },
  { title: "Schedule Pickup", copy: "Choose an address and slot. A verified delivery partner comes home.", icon: CalendarCheck },
  { title: "Verified Tailor Accepts", copy: "Local tailors quote and accept with transparent pricing.", icon: BadgeCheck },
  { title: "Live Tracking", copy: "Track pickup, tailor handoff, work status, and delivery.", icon: MapPinned },
  { title: "Delivered Home", copy: "Get your finished clothes back with photo proof and invoices.", icon: Truck }
];

export const dashboardTabs = [
  { id: "home", label: "Home", icon: Sparkles },
  { id: "book", label: "Book Pickup", icon: CalendarCheck },
  { id: "orders", label: "Orders", icon: Boxes },
  { id: "tracking", label: "Tracking", icon: MapPinned },
  { id: "wallet", label: "Wallet", icon: CreditCard },
  { id: "coupons", label: "Coupons", icon: Sparkles },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: BadgeCheck }
] as const;

export const faq = [
  ["How does pickup work?", "Book a slot, upload garment details, and Darji assigns a verified pickup partner for doorstep collection."],
  ["Can I place multi-cloth orders?", "Yes. Add multiple garments with separate photos, notes, measurement details, sample garment references, and home measurement preference."],
  ["How is pricing decided?", "Tailors quote for the service. Darji shows tailor charges, delivery fee, platform fee, coupon discount, and final payable amount before checkout."],
  ["Do you support COD?", "Yes, COD is supported where enabled by the backend. Online and UPI checkout use the existing Razorpay flow."],
  ["Can I track the order?", "Yes. The dashboard shows status timelines, delivery handoff progress, ETA windows, and notifications from the backend."]
];
