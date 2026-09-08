import type { Metadata } from "next";
import { LegalPage } from "@/src/features/marketing/legal-page";

export const metadata: Metadata = { title: "Terms | Darji" };

export default function TermsPage() {
  return <LegalPage title="Terms of service." intro="The basic agreement for using Darji’s website and services." sections={[
    { title: "Using Darji", body: "Use the service lawfully and provide accurate contact, garment, pickup, measurement, and delivery information. Do not attempt to disrupt the website, misuse another person’s account, or submit harmful content." },
    { title: "Quotes and orders", body: "Tailoring scope, prices, timing, pickup, delivery, and any additional work should be reviewed before confirmation. Material changes may require a revised quote or schedule." },
    { title: "Garments and fit", body: "Customers should disclose delicate materials, prior damage, special-care requirements, and the intended fit. Tailoring outcomes depend on garment construction, available seam allowance, fabric condition, and the measurements supplied or recorded." },
    { title: "Support and disputes", body: "If something is not right, contact support promptly with the relevant order details. Darji will review the available order record and work with the parties involved toward an appropriate resolution." }
  ]} />;
}
