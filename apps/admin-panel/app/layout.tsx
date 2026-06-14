import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Darzi Admin",
  description: "Darzi operations admin panel"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
