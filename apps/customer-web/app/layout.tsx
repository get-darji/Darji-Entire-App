import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/src/providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Darji | Tailoring Picked Up From Your Doorstep",
  description: "Premium doorstep tailoring, alterations, repairs, live tracking, and transparent checkout.",
  applicationName: "Darji Customer Web",
  keywords: ["Darji", "tailoring", "alterations", "doorstep pickup", "custom stitching", "premium tailoring", "express tailoring"],
  metadataBase: new URL("https://darji.in"),
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://darji.in",
    title: "Darji | Tailoring Picked Up From Your Doorstep",
    description: "Premium doorstep tailoring, alterations, repairs, live tracking, and transparent checkout.",
    siteName: "Darji",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Darji - Doorstep Premium Tailoring"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Darji | Tailoring Picked Up From Your Doorstep",
    description: "Premium doorstep tailoring, alterations, repairs, live tracking, and transparent checkout.",
    images: ["/og-image.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff7000"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
