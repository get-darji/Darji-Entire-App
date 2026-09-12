import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/src/features/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for customers, tailors, and delivery partners using Darji.",
  alternates: {
    canonical: "https://www.getdarji.in/terms"
  },
  openGraph: {
    title: "Terms of Service | Darji",
    description: "Terms for customers, tailors, and delivery partners using Darji.",
    url: "https://www.getdarji.in/terms",
    siteName: "Darji",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://www.getdarji.in/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Darji Terms of Service"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Darji",
    description: "Terms for customers, tailors, and delivery partners using Darji.",
    images: ["https://www.getdarji.in/og-image.jpg"]
  }
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Your agreement with Darji",
    audience: "Everyone",
    paragraphs: [
      "These Terms govern your use of the Darji website and the customer, tailor, and delivery-partner services operated by Darji Technologies Private Limited. By creating an account, placing or accepting an order, or using the service, you agree to these Terms and our Privacy Policy.",
      "You must be at least 18 years old and legally able to enter into this agreement. Keep your information accurate, protect your account and one-time passwords, and tell us promptly if you suspect unauthorised use. You are responsible for activity completed through your account unless applicable law says otherwise."
    ]
  },
  {
    id: "platform",
    title: "How the service works",
    audience: "Everyone",
    paragraphs: [
      "Darji coordinates tailoring, measurement, pickup, delivery, payments, updates, and support through one service. The exact features, service areas, professionals, prices, and time slots available to you may change based on location, garment, capacity, and operational conditions.",
      "Role-specific onboarding, assignment, payout, or service conditions shown in a Darji app or agreed separately also apply. If a specific confirmed order term conflicts with a general statement here, the confirmed order term applies to that order unless prohibited by law."
    ]
  },
  {
    id: "customer-terms",
    title: "Customer responsibilities",
    audience: "Customers",
    paragraphs: ["Provide an accurate address, contact number, garment description, measurements or measurement access, requested fit, deadline, and any information that could affect the work. Tell us about delicate fabric, embellishment, prior alterations, existing damage, sentimental or unusually high value, and special-care requirements before the order is confirmed."],
    bullets: [
      "Review the service scope, quote, fees, pickup and delivery method, and estimated timing before confirming.",
      "Make the garment safely available at the agreed time and ensure an authorised person can complete any required OTP handoff.",
      "Use only photos, recordings, instructions, and other content that you have the right to provide.",
      "Inspect completed work promptly and contact support with the order number, explanation, and relevant photos if something is not right."
    ],
    note: "Alteration results depend on garment construction, fabric condition, available seam allowance, prior work, and the accuracy of measurements and instructions."
  },
  {
    id: "tailor-terms",
    title: "Tailor responsibilities",
    audience: "Tailors",
    paragraphs: ["Keep your identity, shop, specialisation, service-area, availability, banking, and verification information accurate. Accept only work you are qualified and equipped to complete, and follow the confirmed scope, measurements, quality requirements, and timeline."],
    bullets: [
      "Give clear and accurate quotes, including work covered, timing, and any known limitations or additional requirements.",
      "Protect garments in your custody and record progress, measurements, completion checks, and approved media honestly.",
      "Use customer contact, address, measurement, image, and order information only to perform the assigned Darji service.",
      "Do not move an assigned transaction off-platform, substitute another professional without authorisation, manipulate ratings, or misrepresent completion.",
      "Follow applicable safety, labour, tax, consumer, and business requirements and cooperate with quality reviews and dispute investigations."
    ]
  },
  {
    id: "delivery-terms",
    title: "Delivery-partner responsibilities",
    audience: "Delivery partners",
    paragraphs: ["Keep your identity, driving-licence, vehicle, service-area, availability, and payout details current. Maintain every licence, registration, permit, insurance, and safety requirement applicable to the vehicle and delivery work you perform."],
    bullets: [
      "Use location services during active delivery work so Darji can assign, route, track, and support the task.",
      "Handle garments and packages carefully, follow pickup and drop instructions, and never open, use, alter, or replace them.",
      "Complete OTP and proof-of-delivery steps truthfully; never ask a user for an OTP before the relevant handoff.",
      "Account accurately for cash collected, report delays or failed attempts with the true reason, and follow road-safety laws.",
      "Use customer and tailor contact or address information only for the assigned delivery."
    ]
  },
  {
    id: "orders-payments",
    title: "Orders, prices, payments, and payouts",
    audience: "Everyone",
    paragraphs: [
      "Prices may include tailoring, measurement, pickup, delivery, urgency, taxes, or other fees shown before confirmation. Additional work requires customer approval and may change the total or timeline. Online payments are completed through the payment provider’s checkout; cash-on-delivery is available only when shown for the order.",
      "Partner earnings, incentives, adjustments, deductions, and payout timing are shown in the relevant workflow or partner terms. Tailors and delivery partners are responsible for the tax and account information legally required for their earnings. Darji may hold or adjust a payout while investigating a cancellation, duplicate payment, fraud concern, cash discrepancy, chargeback, or genuine service dispute."
    ]
  },
  {
    id: "changes-cancellations",
    title: "Changes, cancellations, and refunds",
    audience: "Everyone",
    paragraphs: [
      "A change or cancellation may affect pricing, professional availability, delivery fees, material already used, and work already completed. The options and any charge or refund applicable to an order will be shown in the service flow or explained by support based on the order stage.",
      "Approved refunds are returned using an available method appropriate to the original transaction and may take additional time to appear after processing. Nothing in these Terms limits a refund, replacement, repeat performance, or other remedy that cannot legally be excluded."
    ]
  },
  {
    id: "garment-issues",
    title: "Garment issues and service resolution",
    audience: "Customers",
    paragraphs: [
      "If a garment is delayed, lost, damaged, incorrectly altered, or materially different from the confirmed scope, contact support promptly. Keep the garment and relevant packaging available, avoid further alteration where practical, and provide the order record and clear photos so the issue can be assessed.",
      "Darji may review measurements, instructions, condition notes, pickup and delivery proof, communications, and work-stage images; speak with the people involved; and offer a lawful remedy appropriate to the facts. Pre-existing damage, hidden defects, colour variation, normal wear, fabric weakness, and outcomes made unavoidable by the garment’s construction may affect the available resolution."
    ]
  },
  {
    id: "conduct-content",
    title: "Safe conduct and content",
    audience: "Everyone",
    paragraphs: [
      "Do not use Darji to break the law, threaten or harass another person, discriminate unlawfully, commit fraud, interfere with the service, access another account, submit malicious code, create false orders, misuse location or contact data, manipulate payments or ratings, or upload content that is illegal or infringes another person’s rights.",
      "You retain ownership of content you provide. You give Darji a limited, non-exclusive permission to host, process, reproduce, and share that content only as needed to operate, support, secure, and improve the service or as otherwise permitted by you. Public display of a review or work sample must follow the applicable product setting, permission, or moderation process."
    ]
  },
  {
    id: "suspension",
    title: "Verification, suspension, and ending use",
    audience: "Everyone",
    paragraphs: [
      "We may request information needed to verify an account, order, professional credential, payment, delivery, or safety concern. We may restrict features, pause assignments or payouts, remove content, suspend an account, or end access where information is materially false, verification fails, these Terms are breached, users or garments may be at risk, payment is overdue, or the law requires it.",
      "Where appropriate, we will consider the available record and provide a reason or review path. You may stop using Darji and request account closure, but open orders, payouts, disputes, legal duties, and records that must be retained may still be completed or preserved."
    ]
  },
  {
    id: "availability-liability",
    title: "Availability and responsibility",
    audience: "Everyone",
    paragraphs: [
      "We work to keep Darji reliable, but the service may occasionally be unavailable or affected by traffic, weather, emergencies, connectivity, third-party systems, professional availability, or other conditions outside reasonable control. Estimated times are estimates unless expressly confirmed as guaranteed.",
      "To the extent permitted by law, Darji is not responsible for indirect or consequential loss that was not reasonably foreseeable from the service issue. We do not exclude responsibility that cannot legally be excluded, including applicable consumer rights, fraud, or liability arising from our wilful misconduct or gross negligence."
    ]
  },
  {
    id: "law-contact",
    title: "Governing law, changes, and contact",
    audience: "Everyone",
    paragraphs: [
      "These Terms are governed by the laws of India. Courts with jurisdiction under applicable law may hear disputes, and customer rights under consumer law remain unaffected. Before formal proceedings, please contact support so we can try to resolve the issue using the order and communication record.",
      "We may update these Terms when the service or law changes. The revised version will show a new update date, and we will provide additional notice where required. Questions, complaints, and service disputes can be sent to help.darji@gmail.com."
    ]
  }
];

export default function TermsPage() {
  return <LegalPage title="Terms built around every role." intro="The shared rules for using Darji, followed by clear responsibilities for customers, tailors, and delivery partners." updatedOn="8 September 2026" sections={sections} companion={{ label: "Read the Privacy Policy", href: "/privacy" }} />;
}
