import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/src/features/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Darji",
  description: "How Darji collects, uses, shares, and protects information for customers, tailors, and delivery partners."
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Who this policy covers",
    audience: "Everyone",
    paragraphs: [
      "This Privacy Policy explains how Darji Technologies Private Limited (“Darji”, “we”, “us”, or “our”) handles personal data when you use our website, customer services, tailor tools, delivery-partner tools, or contact our support team.",
      "The information we need depends on your role and what you choose to do. Some people may use Darji in more than one role, in which case each relevant section applies."
    ]
  },
  {
    id: "common-information",
    title: "Information common to every account",
    audience: "Everyone",
    paragraphs: [
      "We may receive account and profile information such as your name, phone number, email address, profile image, date of birth, gender, role, notification preferences, and account status. We also create Darji identifiers that help us connect your account to orders and operational records.",
      "When you sign in or use the service, we process authentication records, session identifiers, verification-code records, device and app information, push-notification tokens, support conversations, attachments, bug reports, and security or administrative audit records."
    ],
    note: "Keep one-time passwords private. Darji support will never ask you to send an OTP outside the normal sign-in, pickup, or delivery flow."
  },
  {
    id: "customers",
    title: "Information we collect from customers",
    audience: "Customers",
    paragraphs: ["We use customer information to arrange tailoring, measurement, pickup, payment, delivery, and after-service support."],
    bullets: [
      "Contact and address details, including recipient name, phone number, address lines, landmark, city, state, PIN code, and location coordinates when you provide or select them.",
      "Garment and service details, including measurements, fit preferences, instructions, fabric or alteration notes, reference images, photos, videos, voice notes, and samples you submit.",
      "Order and visit information, including requested services, selected slots, quotes, assigned professionals, status updates, pickup and delivery records, OTP confirmations, and proof images.",
      "Payment and transaction information, including payment method, amount, payment status, provider references, refunds, fees, discounts, and coupon use. Darji does not need your full card number or UPI PIN.",
      "Reviews, ratings, support tickets, messages, and any files you choose to share while asking for help."
    ]
  },
  {
    id: "tailors",
    title: "Information we collect from tailors",
    audience: "Tailors",
    paragraphs: ["We use tailor information to verify professionals, show suitable services, assign work, coordinate customer orders, and calculate earnings and payouts."],
    bullets: [
      "Profile and business details, such as shop name, address, service areas, specialisations, working hours, availability, garment capabilities, ratings, and sample-work gallery.",
      "Identity and verification information, including the selected identity type, government-ID details and document images (such as Aadhaar or PAN where selected), face photo, shop information, and verification decisions or reasons.",
      "Bank and payout details, including account-holder name, account number, IFSC, UPI ID, wallet activity, earnings, payout periods, references, and receipts.",
      "Work records, including quotes, accepted assignments, measurements submitted, order notes, customer communications needed for the job, progress updates, completion media, quality checks, and disputes."
    ]
  },
  {
    id: "delivery-partners",
    title: "Information we collect from delivery partners",
    audience: "Delivery partners",
    paragraphs: ["We use delivery-partner information to verify eligibility, offer and coordinate assignments, support safe handoffs, provide route information, and calculate earnings and payouts."],
    bullets: [
      "Profile, service-area, working-hours, availability, rating, and delivery-preference information.",
      "Identity and verification information, including selected government-ID details and images, face photo, driving-licence details and images, and vehicle number, type, model, and registration-certificate image.",
      "Bank and payout details, including account-holder name, account number, IFSC, UPI ID, wallet activity, earnings, payout references, and receipts.",
      "Location and movement data while location access is enabled for delivery work, including coordinates, accuracy, direction, speed, and timestamps. We use this for assignment, routing, live progress, safety, and delivery records.",
      "Task records, including pickup and drop details, customer and tailor contact details needed for the task, garment summaries, distance, route, OTP confirmations, proof photos, cash-on-delivery status, failed-attempt reasons, and delivery history."
    ]
  },
  {
    id: "use",
    title: "Why we use information",
    audience: "Everyone",
    paragraphs: [
      "We process information to provide the service you request, operate accounts, match and assign work, calculate prices and payouts, process payments, coordinate pickup and delivery, save measurements for future orders, send service notifications, provide support, and maintain an accurate order history.",
      "We also use relevant records to prevent fraud and misuse, verify professionals, investigate incidents and complaints, improve reliability, audit administrative actions, enforce our terms, and meet legal, tax, accounting, safety, or regulatory obligations. Where the law requires consent, you may withdraw it, but this does not affect processing already completed and may limit features that need that information."
    ]
  },
  {
    id: "sharing",
    title: "Who receives information",
    audience: "Everyone",
    paragraphs: [
      "We share only the information reasonably needed to complete a task. For example, a tailor may receive the customer’s garment instructions, measurements, and relevant contact or handoff details; a delivery partner may receive pickup and drop details and necessary contact information; and the customer receives relevant professional, order, and tracking information.",
      "Authorised Darji operations, support, verification, finance, and administration personnel may access records when their work requires it. We also use service providers for hosting and databases, media storage, payment processing, maps and geocoding, push notifications, communications, and technical operations. These providers process information for their contracted role.",
      "We may disclose information when required by law, to protect users or the service, to investigate suspected fraud or harm, or as part of a business reorganisation subject to appropriate protections."
    ]
  },
  {
    id: "retention",
    title: "How long we keep information",
    audience: "Everyone",
    paragraphs: [
      "Retention depends on why the record exists. We keep account and operational data while an account is active or while it is needed to provide the service. Transaction, payout, verification, safety, complaint, and audit records may be kept longer where needed for legal obligations, fraud prevention, dispute handling, or the establishment or defence of claims.",
      "When information is no longer required for a stated purpose or a legal reason, we will delete it or make it no longer identifiable, using a reasonable operational process. Backup copies may remain for a limited period before being overwritten."
    ]
  },
  {
    id: "security",
    title: "How we protect information",
    audience: "Everyone",
    paragraphs: [
      "We use role-based access, authentication controls, protected session and verification records, operational logging, provider access controls, and other reasonable technical and organisational safeguards appropriate to the service. Payment credentials are handled through the payment flow; never share a card PIN, UPI PIN, or OTP with Darji staff.",
      "No online system is completely secure. If you believe your account or information has been affected, contact us promptly and include only the details needed to investigate."
    ]
  },
  {
    id: "rights",
    title: "Your choices and privacy rights",
    audience: "Everyone",
    paragraphs: [
      "Subject to applicable law, you may ask for a summary of personal data being processed, request correction or completion, request erasure, withdraw consent where processing relies on consent, and raise a grievance. You may also update available profile or notification settings directly in the relevant Darji app.",
      "Send requests to help.darji@gmail.com from the contact details connected to your account. We may verify your identity before acting and may retain information that must be kept for completed transactions, payouts, legal duties, safety, fraud prevention, or unresolved disputes. You may nominate another person to exercise rights where applicable law provides for it."
    ]
  },
  {
    id: "children-and-changes",
    title: "Children, policy changes, and contact",
    audience: "Everyone",
    paragraphs: [
      "Darji accounts and partner work are intended for adults. A person under 18 should not create or operate an account independently. If we learn that a child’s personal data was provided without the legally required involvement of a parent or lawful guardian, we will take appropriate steps.",
      "We may update this policy as the service or law changes. We will post the revised version with a new update date and provide additional notice where required. Privacy questions and grievances can be sent to help.darji@gmail.com."
    ]
  }
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy, explained clearly." intro="A role-by-role account of the information Darji handles, why it is needed, who receives it, and the choices available to you." updatedOn="8 September 2026" sections={sections} companion={{ label: "Read the Terms", href: "/terms" }} />;
}
