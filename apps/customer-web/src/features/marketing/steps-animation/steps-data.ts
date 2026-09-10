import { MapPin, PackageCheck, Route, Star } from "lucide-react";
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
    copy: "Your chosen tailor reviews the request and starts working on it.",
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
    defaultValue: "100+",
    targetValue: 100,
    step: 10,
    format: (v) => `${Math.round(v).toLocaleString("en-US")}+`,
  },
  {
    icon: Route,
    label: "Tracked Service Stages",
    defaultValue: "5",
    targetValue: 5,
    step: 1,
    format: (v) => `${Math.round(v)}`,
  },
  {
    icon: MapPin,
    label: "Current Service Areas",
    defaultValue: "2",
    targetValue: 2,
    step: 1,
    format: (v) => `${Math.round(v)}`,
  },
  {
    icon: Star,
    label: "Customer Rating",
    defaultValue: "4.9 ★",
    targetValue: 4.9,
    step: 0.1,
    format: (v) => `${v.toFixed(1)} ★`,
  },
];
