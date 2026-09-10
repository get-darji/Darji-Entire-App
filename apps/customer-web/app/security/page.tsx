import type { Metadata } from "next";
import { LegalPage } from "@/src/features/marketing/legal-page";

export const metadata: Metadata = { title: "Security | Darji" };

export default function SecurityPage() {
  return <LegalPage title="Security at Darji." intro="How to use the service safely and report a concern." updatedOn="8 September 2026" companion={{ label: "Read the Privacy Policy", href: "/privacy" }} sections={[
    { id: "account-safety", title: "Account safety", audience: "Everyone", paragraphs: ["Keep verification codes private, use trusted devices, and contact support if you notice unfamiliar activity. Darji support will not ask you to share a one-time password outside the normal sign-in or handoff flow."] },
    { id: "payments", title: "Payments", audience: "Everyone", paragraphs: ["Review the payee, amount, and order reference before completing a payment. Report unexpected payment requests or suspicious links to support before taking action."] },
    { id: "responsible-reporting", title: "Responsible reporting", audience: "Everyone", paragraphs: ["If you believe you found a security issue, send a clear description and reproduction steps to help.darji@gmail.com. Please avoid accessing, changing, or sharing other people’s information while investigating."] },
    { id: "operational-care", title: "Operational care", audience: "Everyone", paragraphs: ["Darji uses technical and organisational safeguards appropriate to the service. Security practices are reviewed as the platform and its delivery and tailoring workflows evolve."] }
  ]} />;
}
