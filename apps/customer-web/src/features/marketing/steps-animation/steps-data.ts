import { Clock3, PackageCheck, Star, Users } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface Step {
  title: string;
  copy: string;
  image: string;
}

export interface Stat {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  /** Displayed during SSR / before JS hydrates */
  defaultValue: string;
  /** Raw numeric target for the counter tween */
  targetValue: number;
  /** Smallest visible increment for the counter */
  step?: number;
  /** Formats the raw numeric value for display */
  format: (v: number) => string;
}

export const STEPS: Step[] = [
  {
    title: "Upload & Describe",
    copy: "Upload photos of your clothing and tell us what you need.",
    image: "/animations/s1.png",
  },
  {
    title: "Schedule Pickup",
    copy: "Choose a convenient time. We'll pick it up from your doorstep.",
    image: "/animations/s2.png",
  },
  {
    title: "Tailor Gets to Work",
    copy: "Our verified tailor reviews and starts working on it.",
    image: "/animations/s3.png",
  },
  {
    title: "Live Tracking",
    copy: "Track your order in real time from pickup to delivery.",
    image: "/animations/s4.png",
  },
  {
    title: "Delivered Home",
    copy: "We deliver your perfect clothing back to your doorstep.",
    image: "/animations/s5.png",
  },
];

export const STATS: Stat[] = [
  {
    icon: PackageCheck,
    label: "Orders Completed",
    defaultValue: "10,000+",
    targetValue: 10000,
    step: 10,
    format: (v) => `${Math.round(v).toLocaleString("en-US")}+`,
  },
  {
    icon: Users,
    label: "Verified Tailors",
    defaultValue: "150+",
    targetValue: 150,
    step: 1,
    format: (v) => `${Math.round(v)}+`,
  },
  {
    icon: Clock3,
    label: "Average Pickup Time",
    defaultValue: "30 min",
    targetValue: 30,
    step: 1,
    format: (v) => `${Math.round(v)} min`,
  },
  {
    icon: Star,
    label: "Customer Rating",
    defaultValue: "4.9*",
    targetValue: 4.9,
    step: 0.1,
    format: (v) => `${v.toFixed(1)}*`,
  },
];
