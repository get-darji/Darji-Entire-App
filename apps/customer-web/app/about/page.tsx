import type { Metadata } from "next";
import { AboutPage } from "@/src/features/marketing/about-page";

export const metadata: Metadata = {
  title: "About Us — Doorstep Tailoring Network",
  description: "Learn how Darji connects customers, local tailors, and delivery partners into a smoother doorstep tailoring experience.",
  alternates: {
    canonical: "https://www.getdarji.in/about"
  },
  openGraph: {
    title: "About Darji | Doorstep Tailoring Network",
    description: "Learn how Darji connects customers, local tailors, and delivery partners into a smoother doorstep tailoring experience.",
    url: "https://www.getdarji.in/about",
    siteName: "Darji",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://www.getdarji.in/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "About Darji"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "About Darji | Doorstep Tailoring Network",
    description: "Learn how Darji connects customers, local tailors, and delivery partners into a smoother doorstep tailoring experience.",
    images: ["https://www.getdarji.in/og-image.jpg"]
  }
};

export default function Page() {
  return <AboutPage />;
}
