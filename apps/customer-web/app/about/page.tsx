import type { Metadata } from "next";
import { AboutPage } from "@/src/features/marketing/about-page";

export const metadata: Metadata = {
  title: "About Darji | Doorstep Tailoring Network",
  description: "Learn how Darji connects customers, verified tailors, and delivery partners into a smoother doorstep tailoring experience."
};

export default function Page() {
  return <AboutPage />;
}
