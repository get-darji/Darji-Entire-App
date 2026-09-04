import type { Metadata } from "next";
import { BlogListPage } from "@/src/features/marketing/blog-list-page";

export const metadata: Metadata = {
  title: "Darji Blog | Company Updates and Tailoring Notes",
  description: "Read Darji articles about doorstep tailoring, measurements, customer experience, and company updates."
};

export default function Page() {
  return <BlogListPage />;
}
