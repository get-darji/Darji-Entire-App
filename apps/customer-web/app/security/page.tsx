import type { Metadata } from "next";
import { LegalPage } from "@/src/features/marketing/legal-page";

export const metadata: Metadata = { title: "Security | Darji" };

export default function SecurityPage() {
  return <LegalPage title="Security at Darji." intro="How to use the service safely and report a concern." sections={[
    { title: "Account safety", body: "Keep verification codes private, use trusted devices, and contact support if you notice unfamiliar activity. Darji support will not ask you to share a one-time password outside the normal sign-in or handoff flow." },
    { title: "Payments", body: "Review the payee, amount, and order reference before completing a payment. Report unexpected payment requests or suspicious links to support before taking action." },
    { title: "Responsible reporting", body: "If you believe you found a security issue, send a clear description and reproduction steps to support@darji.in. Please avoid accessing, changing, or sharing other people’s information while investigating." },
    { title: "Operational care", body: "Darji uses technical and organizational safeguards appropriate to the service. Security practices are reviewed as the platform and its delivery and tailoring workflows evolve." }
  ]} />;
}
