import type { Metadata } from "next";
import { LegalPage } from "@/src/features/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy | Darji" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy, in plain language." intro="How information is used to provide Darji’s website and tailoring services." sections={[
    { title: "Information we receive", body: "When you contact Darji, subscribe to the journal, or use a Darji service, you may provide contact details, delivery information, garment instructions, measurements, photos, and payment-related records." },
    { title: "How it is used", body: "Information is used to respond to requests, coordinate tailoring and delivery, provide support, improve the service, prevent misuse, and meet applicable operational or legal requirements." },
    { title: "Your choices", body: "You can ask about your information, request corrections, unsubscribe from journal emails, or contact support about deletion requests. Some records may need to be retained where required for completed transactions or disputes." },
    { title: "Service providers", body: "Darji may rely on carefully selected technology, payment, communication, hosting, and delivery providers to operate the service. They receive only the information needed for their role." }
  ]} />;
}
