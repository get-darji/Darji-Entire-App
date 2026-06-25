import type { Metadata } from "next";
import { Providers } from "@/src/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Darzi Admin",
  description: "Darzi operations admin panel"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
