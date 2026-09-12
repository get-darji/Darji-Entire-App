import type { Metadata } from "next";
import { BlogListPage } from "@/src/features/marketing/blog-list-page";

export const metadata: Metadata = {
  title: "Journal & Tailoring Notes",
  description: "Read Darji articles about doorstep tailoring, measurements, customer experience, and company updates.",
  alternates: {
    canonical: "https://www.getdarji.in/blogs"
  },
  openGraph: {
    title: "Darji Journal | Company Updates & Tailoring Notes",
    description: "Read Darji articles about doorstep tailoring, measurements, customer experience, and company updates.",
    url: "https://www.getdarji.in/blogs",
    siteName: "Darji",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://www.getdarji.in/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Darji Journal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Darji Journal | Company Updates & Tailoring Notes",
    description: "Read Darji articles about doorstep tailoring, measurements, customer experience, and company updates.",
    images: ["https://www.getdarji.in/og-image.jpg"]
  }
};

export default function Page() {
  return <BlogListPage />;
}
