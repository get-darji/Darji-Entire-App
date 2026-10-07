import type { Metadata } from "next";
import { DeleteAccountPage } from "@/src/features/marketing/delete-account-page";

export const metadata: Metadata = {
  title: "Delete Your Darji Account",
  description: "Request permanent deletion of your Darji account and associated personal data.",
  alternates: { canonical: "https://www.getdarji.in/delete-account" },
  openGraph: {
    title: "Delete Your Darji Account | Darji",
    description: "Request permanent deletion of your Darji account and associated personal data.",
    url: "https://www.getdarji.in/delete-account",
    siteName: "Darji",
    locale: "en_IN",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function Page() {
  return <DeleteAccountPage />;
}
