import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CustomerDashboard } from "@/src/features/dashboard/customer-dashboard";
import { isLocalBookingHost } from "@/src/lib/local-booking";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardPage() {
  if (process.env.NODE_ENV !== "development") redirect("/");
  const host = (await headers()).get("host") ?? "";
  let hostname = "";
  try { hostname = new URL(`http://${host}`).hostname; } catch { redirect("/"); }
  if (!isLocalBookingHost(hostname)) redirect("/");
  return <CustomerDashboard />;
}
