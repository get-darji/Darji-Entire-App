import type { Metadata, Viewport } from "next";
import { Providers } from "@/src/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Darji | Tailoring Picked Up From Your Doorstep",
  description: "Premium doorstep tailoring, alterations, repairs, live tracking, and transparent checkout.",
  applicationName: "Darji Customer Web",
  keywords: ["Darji", "tailoring", "alterations", "doorstep pickup", "custom stitching"],
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6a313"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
