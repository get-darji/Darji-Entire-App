import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import { Providers } from "@/src/providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.getdarji.in"),
  title: {
    default: "Darji — Doorstep Tailoring & Alteration Services",
    template: "%s | Darji"
  },
  description: "Darji makes tailoring easy. Book trusted local tailors for clothing alterations and doorstep tailoring services. Get your clothes tailored from the comfort of your home.",
  applicationName: "Darji",
  keywords: [
    "Darji",
    "doorstep tailoring",
    "clothing alterations",
    "tailors near me",
    "custom stitching",
    "tailoring app",
    "clothes alteration at home",
    "suit alterations",
    "dress alterations",
    "doorstep pickup tailoring"
  ],
  alternates: {
    canonical: "https://www.getdarji.in"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  manifest: "/site.webmanifest",
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
    locale: "en_IN",
    url: "https://www.getdarji.in",
    title: "Darji — Doorstep Tailoring & Alteration Services",
    description: "Darji makes tailoring easy. Book trusted local tailors for clothing alterations and doorstep tailoring services. Get your clothes tailored from the comfort of your home.",
    siteName: "Darji",
    images: [
      {
        url: "https://www.getdarji.in/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Darji — Doorstep Tailoring & Alteration Services"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Darji — Doorstep Tailoring & Alteration Services",
    description: "Darji makes tailoring easy. Book trusted local tailors for clothing alterations and doorstep tailoring services. Get your clothes tailored from the comfort of your home.",
    images: ["https://www.getdarji.in/og-image.jpg"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff7000"
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.getdarji.in/#organization",
      name: "Darji",
      legalName: "Darji Technologies Private Limited",
      url: "https://www.getdarji.in",
      logo: {
        "@type": "ImageObject",
        url: "https://www.getdarji.in/darji-logo-cropped.png",
        caption: "Darji Logo"
      },
      image: "https://www.getdarji.in/og-image.jpg",
      description: "Technology-enabled tailoring ecosystem connecting customers with trusted local tailors for doorstep tailoring and alterations.",
      email: "help.darji@gmail.com"
    },
    {
      "@type": "WebSite",
      "@id": "https://www.getdarji.in/#website",
      url: "https://www.getdarji.in",
      name: "Darji",
      description: "Doorstep Tailoring & Alteration Services",
      publisher: {
        "@id": "https://www.getdarji.in/#organization"
      }
    },
    {
      "@type": "Service",
      "@id": "https://www.getdarji.in/#service",
      name: "Doorstep Tailoring & Alteration Services",
      serviceType: "Clothing alterations, bespoke tailoring, garment repairs, custom stitching",
      provider: {
        "@id": "https://www.getdarji.in/#organization"
      },
      areaServed: {
        "@type": "Country",
        name: "India"
      },
      description: "Professional doorstep pickup, precision fitting by trusted local tailors, and guaranteed doorstep delivery."
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
