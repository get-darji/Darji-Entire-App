"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  Layers,
  MapPin,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Zap
} from "lucide-react";
import Link from "next/link";
import { MarketingHeader, LaunchSoonModal } from "./site-actions";
import { EditorialFooter } from "@/src/components/editorial-footer";

const reveal = {
  initial: { opacity: 0, y: 28, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "0px 0px -12% 0px" },
  transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1] }
} as const;

const stats = [
  { value: "Craftsmanship First", label: "", desc: "Every garment is handled by experienced tailoring professionals." },
  { value: "Doorstep Convenience", label: "", desc: "Pickup, alteration, stitching, and delivery — without leaving home." },
  { value: "Built Around Your Fit", label: "", desc: "Measurements, preferences, and notes saved for future orders." },
  { value: "Human Support, Always", label: "", desc: "Real people helping you through every step of your order." }
];

const problems = [
  {
    step: "01",
    title: "FIND",
    label: "Finding a tailor you can trust.",
    problem: "Asking friends for recommendations, visiting multiple shops, and hoping the quality matched expectations.",
    solution: "Darji connects you with verified tailoring professionals matched to your specific stitching or alteration needs."
  },
  {
    step: "02",
    title: "EXPLAIN",
    label: "Explaining your fit, again and again.",
    problem: "Measurements written on paper, forgotten preferences, and repeated conversations every time you place an order.",
    solution: "Your measurements, style preferences, and garment notes stay securely saved for future orders."
  },
  {
    step: "03",
    title: "WAIT",
    label: "Never knowing when it’s ready.",
    problem: "Calling shops for updates, unexpected delays, and uncertainty about delivery timelines.",
    solution: "Track every order digitally, from pickup to delivery, with clear updates at every stage."
  },
  {
    step: "04",
    title: "TRAVEL",
    label: "Spending hours on something simple.",
    problem: "Travelling through traffic just to drop off clothes, explain changes, and collect them later.",
    solution: "Doorstep pickup and delivery make tailoring fit into your schedule, not the other way around."
  }
];

const ecosystemSteps = [
  {
    id: "customer",
    num: "01",
    role: "BOOK YOUR SERVICE",
    headline: "Great clothing should begin with excitement.",
    desc: "Choose stitching, alterations, or repairs. Select a convenient doorstep fitting slot, and let Darji take care of the rest.",
    highlight: "Book your service in under 60 seconds.",
    icon: Users
  },
  {
    id: "concierge",
    num: "02",
    role: "WE TAKE YOUR MEASUREMENTS",
    headline: "No guesswork. No awkward explanations.",
    desc: "A trained Darji expert visits your doorstep to take precise measurements and understand your style, fabric and fit preferences.",
    highlight: "Your measurements are securely saved for future orders.",
    icon: Ruler
  },
  {
    id: "artisan",
    num: "03",
    role: "EXPERTS GET TO WORK",
    headline: "Crafted by specialists who understand the details.",
    desc: "Your garments are handled by experienced tailors who focus on fit, finish, and the finer details — just the way you like it.",
    highlight: "Your order is crafted with care by expert tailors.",
    icon: Scissors
  },
  {
    id: "audit",
    num: "04",
    role: "EVERY DETAIL IS CHECKED",
    headline: "Nothing leaves until it meets our standards.",
    desc: "Each garment is carefully checked for fit, finish, and quality, so you receive exactly what you expect — and more.",
    highlight: "Quality checked at every step.",
    icon: ShieldCheck
  },
  {
    id: "return",
    num: "05",
    role: "DELIVERED TO YOUR DOOR",
    headline: "Ready to wear. Perfected if needed.",
    desc: "Your tailored garments are delivered to your doorstep, and if any final adjustments are needed, we’re just a message away.",
    highlight: "Hassle-free delivery, with support even after delivery.",
    icon: Truck
  }
];

const artisans = [
  {
    name: "Doorstep First",
    experience: "CUSTOMER EXPERIENCE",
    specialty: "No travel. No waiting. No repeated visits.",
    quote: "",
    image: "/hero-tailor-visual.png",
    location: ""
  },
  {
    name: "Measured Once, Remembered Always",
    experience: "SMART PROFILES",
    specialty: "Your preferences stay with you.",
    quote: "",
    image: "/animations/service-womens-wear.png",
    location: ""
  },
  {
    name: "Quality You Can Trust",
    experience: "QUALITY ASSURED",
    specialty: "Every order goes through multiple checks before delivery.",
    quote: "",
    image: "/animations/service-mens-wear.png",
    location: ""
  },
  {
    name: "One Platform, Many Solutions",
    experience: "COMPLETE ECOSYSTEM",
    specialty: "Alterations, repairs, custom stitching, and more.",
    quote: "",
    image: "/animations/service-custom-stitching.png",
    location: ""
  }
];

const values = [
  {
    num: "01",
    title: "CONVENIENT",
    kicker: "सुविधा",
    body: "Tailored to fit your schedule."
  },
  {
    num: "02",
    title: "TRUSTED",
    kicker: "विश्वास",
    body: "Verified professionals, reliable service."
  },
  {
    num: "03",
    title: "PRECISE",
    kicker: "सटीकता",
    body: "Accurate fittings, flawless finishing."
  },
  {
    num: "04",
    title: "CONNECTED",
    kicker: "जुड़ाव",
    body: "Real-time updates, complete transparency."
  }
];

export function AboutPage() {
  const [activeProblem, setActiveProblem] = useState<number>(0);
  const [activeEcosystemStep, setActiveEcosystemStep] = useState<number>(0);
  const [activeCraftTab, setActiveCraftTab] = useState<"craft" | "tech">("craft");
  const [launchOpen, setLaunchOpen] = useState(false);
  const dualityPanels = activeCraftTab === "craft"
    ? {
        left: {
          kicker: "The People Behind Your Garment",
          title: "Experience you can trust.",
          body: "Your garments are handled by skilled tailors who understand fit, fabric and the finer details.",
          bullets: [
            "Expert stitching and alteration specialists",
            "Attention to fit and finishing",
            "Years of craftsmanship in every garment"
          ],
          icon: Scissors
        },
        right: {
          kicker: "The Craft Behind the Finish",
          title: "Details make the difference.",
          body: "From measurement to finishing, experienced tailors give every garment the attention it deserves.",
          bullets: [
            "Careful cutting and precise stitching",
            "Fit and finishing checked by hand",
            "Specialists matched to each garment"
          ],
          icon: Sparkles
        }
      }
    : {
        left: {
          kicker: "Your Smart Fit Profile",
          title: "Measured once. Remembered always.",
          body: "Your measurements, style preferences, and garment notes stay securely saved for future orders.",
          bullets: [
            "Measurements securely saved",
            "Preferences kept with your profile",
            "Faster, simpler repeat orders"
          ],
          icon: Layers
        },
        right: {
          kicker: "The System That Keeps It Simple",
          title: "Convenience you can feel.",
          body: "From saved measurements to doorstep updates, technology keeps your experience smooth and hassle-free.",
          bullets: [
            "Live order tracking and updates",
            "Clear progress at every stage",
            "Faster turnaround with fewer mistakes"
          ],
          icon: Zap
        }
      };
  const LeftDualityIcon = dualityPanels.left.icon;
  const RightDualityIcon = dualityPanels.right.icon;

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#101010] font-sans selection:bg-black selection:text-white">
      <MarketingHeader active="about" />

      {/* SECTION 01 — CINEMATIC INTRO HERO */}
      <section className="relative overflow-hidden bg-[#080808] pb-28 pt-20 text-white sm:pb-36 sm:pt-28">

        <div className="shell relative">
          <motion.div {...reveal} className="max-w-5xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffb35f]">
              About Darji
            </p>

            <h1 className="mt-6 font-editorial text-[clamp(3.2rem,8.2vw,7.6rem)] font-normal leading-[0.92] tracking-[-0.03em] text-white">
              Some clothes are more than clothes. <br />
              <span className="italic text-white/62">They’re memories.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg sm:text-xl font-normal leading-relaxed text-white/75">
              Darji makes tailoring effortless. We connect you with skilled, trusted local tailors for alterations, repairs, and custom stitching — all from the comfort of your home.
            </p>
          </motion.div>

          {/* Masked full-width editorial image banner with floating quote */}
          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.15 }}
            className="mt-14 relative overflow-hidden rounded-3xl border border-white/12 shadow-[0_32px_88px_rgba(0,0,0,0.4)]"
          >
            <div className="relative h-[380px] sm:h-[540px] w-full bg-[#08111f]">
              <img
                src="/editorial/hero-tailor.jpg"
                alt="Master tailor cutting raw linen at traditional workbench"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040810] via-transparent to-black/20" />

              {/* Floating asymmetrical badge */}
              <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-auto max-w-md rounded-2xl bg-[#08111f]/90 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7000]">A Word from a Master</p>
                <p className="mt-2 font-editorial text-xl sm:text-2xl text-white font-normal leading-snug">
                  “Good tailoring is an act of care — it respects the person, the cloth, and the story behind it.”
                </p>
                <p className="mt-2 text-xs text-white/50 font-bold uppercase tracking-wider">— Sabyasachi Mukherjee</p>
              </div>
            </div>
          </motion.div>

          {/* Live Metrics Ticker */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 border-t border-white/12 pt-10">
            {stats.map((item, idx) => (
              <motion.div
                key={item.label}
                {...reveal}
                transition={{ ...reveal.transition, delay: 0.2 + idx * 0.08 }}
                className="border-l border-white/15 pl-5"
              >
                <p className="font-editorial text-3xl sm:text-4xl font-normal text-white">{item.value}</p>
                <p className="mt-1 text-sm font-bold text-[#ffb35f]">{item.label}</p>
                <p className="mt-1 text-xs text-white/50">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 02 — THE STORY / WHY DARJI (ASYMMETRICAL EDITORIAL LAYOUT) */}
      <section id="story" className="py-20 sm:py-32 overflow-hidden border-b border-[#e6edf5]">
        <div className="shell">
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            {/* Left Column: Asymmetrical Heading & Offset Visuals */}
            <motion.div {...reveal} className="space-y-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff7000]">
                  01 / The Origin Story
                </p>
                <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,4.8rem)] font-normal leading-[0.98] tracking-[-0.025em] text-[#08111f]">
                  A childhood memory became a mission.
                </h2>
              </div>

              {/* Offset Visual Composition */}
              <div className="relative pt-6">
                <div className="relative z-10 overflow-hidden rounded-3xl border border-[#e6edf5] bg-white p-3 shadow-xl">
                  <img
                    src="/animations/cta-tailoring.png"
                    alt="Artisanal tailor tools and measuring tape"
                    className="h-72 sm:h-88 w-full object-cover rounded-2xl"
                  />
                </div>
                {/* Secondary Offset Overlap Card */}
                <div className="absolute -bottom-8 -right-4 sm:-right-8 z-20 w-48 sm:w-60 overflow-hidden rounded-2xl border border-white bg-[#08111f] p-4 text-white shadow-2xl">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffb35f]">From Home to Darji</span>
                  <p className="mt-1 text-xs sm:text-sm text-white/80 font-normal leading-relaxed">
                    A simple observation became a mission to modernize India’s tailoring ecosystem.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Rich Editorial Prose */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.12 }} className="space-y-6 lg:pt-8">
              <p className="drop-cap text-xl sm:text-2xl font-normal leading-relaxed text-[#1e293b]">
                For Aman Kumar Sah, the idea behind Darji did not begin in a boardroom. It began at home.
              </p>

              <p className="text-base sm:text-lg leading-relaxed text-[#4b5a70]">
                Growing up, he watched his mother collect clothes from local tailors, spend hours hemming and finishing garments herself, and earn barely ₹20–30 per piece. Behind every stitched garment was skill, patience, and hard work — yet countless talented tailors remained invisible to customers and opportunities.
              </p>

              <p className="text-base sm:text-lg leading-relaxed text-[#4b5a70]">
                Years later, while almost every service had moved online, tailoring remained stuck offline. Finding a trusted tailor still meant multiple visits, uncertain timelines, and no easy way to track progress. Darji was created to bridge that gap — connecting customers, local tailoring professionals, and doorstep logistics through one seamless experience. What was once a neighborhood service can now reach every doorstep.
              </p>

              <div className="border border-black/12 bg-white p-6 shadow-[0_16px_42px_rgba(0,0,0,0.06)]">
                <p className="font-editorial text-xl italic text-[#08111f] leading-snug">
                  “If food, groceries and taxis can reach our doorstep, why can’t tailoring?”
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#ff7000]">
                  — Aman Kumar Sah, Founder &amp; CEO, Darji
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 03 — THE PROBLEM (4-STAGE SEQUENTIAL PROGRESSION) */}
      <section className="py-20 sm:py-32 bg-[#f6f8fb] border-b border-[#e6edf5]">
        <div className="shell">
          <motion.div {...reveal} className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff7000]">
              02 / The Problem
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.5vw,4.4rem)] font-normal leading-[1] tracking-[-0.025em] text-[#08111f]">
              Tailoring shouldn’t feel harder than ordering food.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              Millions of people still struggle with a process that should have become simple years ago.
            </p>
          </motion.div>

          {/* Interactive 4-Stage Breakdown */}
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problems.map((item, idx) => {
              const isSelected = activeProblem === idx;
              return (
                <motion.button
                  type="button"
                  key={item.step}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: idx * 0.08 }}
                  onClick={() => setActiveProblem(idx)}
                  aria-pressed={isSelected}
                  className={`focus-ring cursor-pointer p-7 text-left transition-[transform,box-shadow,border-color,background-color] duration-500 ${
                    isSelected
                      ? "border border-black bg-white shadow-[0_22px_54px_rgba(0,0,0,0.11)] -translate-y-1"
                      : "border border-black/10 bg-white/70 hover:border-black/35 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-editorial text-3xl font-bold ${isSelected ? "text-black" : "text-[#8c9aa8]"}`}>
                      {item.step}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase ${
                      isSelected ? "bg-black text-white" : "bg-[#eef2f7] text-[#687589]"
                    }`}>
                      {item.title}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-bold text-[#08111f] leading-snug">
                    {item.label}
                  </h3>

                  <div className="mt-7 divide-y divide-black/10 border-y border-black/10 text-sm leading-relaxed">
                    <div className="py-4">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-black/42">The Old Way</span>
                      <p className="mt-2 text-xs leading-relaxed text-[#555]">{item.problem}</p>
                    </div>
                    <div className="py-4">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-black">The Darji Way</span>
                      <p className="mt-2 text-xs leading-relaxed text-[#242424]">{item.solution}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 04 — THE DARJI SOLUTION (THE LIVING TAILORING ECOSYSTEM) */}
      <section id="ecosystem" className="overflow-hidden border-b border-white/10 bg-[#080808] py-20 text-white sm:py-32">
        <div className="shell relative">

          <motion.div {...reveal} className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb35f]">
              03 / The Living Ecosystem
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,5rem)] font-normal leading-[0.98] tracking-[-0.025em] text-white">
              From uncertainty to complete peace of mind.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
              Every step is designed to remove friction, so you can focus on what matters while we handle the rest.
            </p>
          </motion.div>

          {/* Interactive Step Switcher */}
          <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.3fr] items-start">
            {/* Step Navigation Column */}
            <div className="space-y-3">
              {ecosystemSteps.map((step, idx) => {
                const isCurrent = activeEcosystemStep === idx;
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveEcosystemStep(idx)}
                    className={`focus-ring w-full text-left rounded-2xl p-5 transition-all duration-300 flex items-center justify-between border ${
                      isCurrent
                        ? "bg-white/10 border-[#ff7000] text-white shadow-lg"
                        : "bg-white/4 border-white/8 text-white/60 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`grid h-10 w-10 place-items-center rounded-xl font-editorial text-lg font-bold ${
                        isCurrent ? "bg-[#ff7000] text-white" : "bg-white/10 text-white/70"
                      }`}>
                        {step.num}
                      </span>
                      <div>
                        <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#ffb35f]">
                          {step.role}
                        </span>
                        <span className="block text-sm font-bold text-white mt-0.5">
                          {step.headline}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 transition-transform ${isCurrent ? "text-[#ff7000] translate-x-1" : "text-white/30"}`} />
                  </button>
                );
              })}
            </div>

            {/* Step Deep-Dive Showcase Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/3 p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
              <AnimatePresence mode="wait">
                {(() => {
                  const active = ecosystemSteps[activeEcosystemStep];
                  const Icon = active.icon;
                  return (
                    <motion.div
                      key={active.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#ff7000]/20 border border-[#ff7000]/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#ffb35f]">
                          <Icon className="h-4 w-4 text-[#ff7000]" /> Stage {active.num} of 05
                        </span>
                        <span className="font-editorial text-4xl text-white/30 font-bold">{active.num}</span>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7000]">{active.role}</p>
                        <h3 className="mt-2 font-editorial text-3xl sm:text-4xl font-normal text-white">
                          {active.headline}
                        </h3>
                      </div>

                      <p className="text-base sm:text-lg text-white/75 leading-relaxed font-normal">
                        {active.desc}
                      </p>

                      <div className="rounded-2xl bg-white/6 border border-white/10 p-5 flex items-center gap-3.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span className="text-sm font-bold text-white/90">{active.highlight}</span>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05 — CRAFT + TECHNOLOGY (SPLIT INTERACTIVE SYNTHESIS) */}
      <section className="py-20 sm:py-32 overflow-hidden border-b border-[#e6edf5]">
        <div className="shell">
          <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff7000]">
              04 / The Duality
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.8vw,4.6rem)] font-normal leading-[1] tracking-[-0.025em] text-[#08111f]">
              Technology makes tailoring easier. Skilled hands make it perfect.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              At Darji, we combine the expertise of skilled tailors with smart technology to give you a seamless, reliable experience.
            </p>

            {/* Interactive Toggle Switch */}
            <div className="mt-8 inline-flex rounded-2xl border border-[#e6edf5] bg-white p-1.5 shadow-sm">
              <button
                onClick={() => setActiveCraftTab("craft")}
                className={`rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                  activeCraftTab === "craft"
                    ? "bg-[#ff7000] text-white shadow-md shadow-[#ff7000]/25"
                    : "text-[#4b5a70] hover:text-[#08111f]"
                }`}
              >
                The People Behind Your Garment
              </button>
              <button
                onClick={() => setActiveCraftTab("tech")}
                className={`rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                  activeCraftTab === "tech"
                    ? "bg-[#08111f] text-white shadow-md"
                    : "text-[#4b5a70] hover:text-[#08111f]"
                }`}
              >
                The System That Keeps It Simple
              </button>
            </div>
          </motion.div>

          {/* Split Comparison Cards */}
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Craft Card */}
            <motion.div
              {...reveal}
              className={`rounded-3xl border p-8 sm:p-12 transition-all duration-500 ${
                activeCraftTab === "craft"
                  ? "bg-white border-[#ff7000] shadow-[0_24px_64px_rgba(255,112,0,0.1)] scale-[1.01]"
                  : "bg-white/60 border-[#e6edf5] opacity-80"
              }`}
            >
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#ff7000]">
                <LeftDualityIcon className="h-4 w-4" /> {dualityPanels.left.kicker}
              </div>
              <h3 className="mt-4 font-editorial text-3xl sm:text-4xl font-normal text-[#08111f]">
                {dualityPanels.left.title}
              </h3>
              <p className="mt-4 text-base text-[#4b5a70] leading-relaxed">
                {dualityPanels.left.body}
              </p>
              <ul className="mt-6 space-y-3.5 text-sm font-semibold text-[#1e293b]">
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
                  {dualityPanels.left.bullets[0]}
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
                  {dualityPanels.left.bullets[1]}
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
                  {dualityPanels.left.bullets[2]}
                </li>
              </ul>
            </motion.div>

            {/* Technology Card */}
            <motion.div
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.1 }}
              className={`rounded-3xl border p-8 sm:p-12 transition-all duration-500 ${
                activeCraftTab === "tech"
                  ? "bg-[#08111f] text-white border-white/20 shadow-[0_24px_64px_rgba(8,17,31,0.25)] scale-[1.01]"
                  : "bg-white/60 border-[#e6edf5] opacity-80"
              }`}
            >
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#ffb35f]">
                <RightDualityIcon className="h-4 w-4" /> {dualityPanels.right.kicker}
              </div>
              <h3 className="mt-4 font-editorial text-3xl sm:text-4xl font-normal">
                {dualityPanels.right.title}
              </h3>
              <p className={`mt-4 text-base leading-relaxed ${
                activeCraftTab === "tech" ? "text-white/70" : "text-[#4b5a70]"
              }`}>
                {dualityPanels.right.body}
              </p>
              <ul className={`mt-6 space-y-3.5 text-sm font-semibold ${
                activeCraftTab === "tech" ? "text-white/85" : "text-[#1e293b]"
              }`}>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ffb35f]" />
                  {dualityPanels.right.bullets[0]}
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ffb35f]" />
                  {dualityPanels.right.bullets[1]}
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ffb35f]" />
                  {dualityPanels.right.bullets[2]}
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 06 — THE PEOPLE / THE GUILD (EDITORIAL ARTISAN SHOWCASE) */}
      <section id="artisans" className="py-20 sm:py-32 bg-[#fdfaf6] border-b border-[#e6edf5]">
        <div className="shell">
          <motion.div {...reveal} className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff7000]">
              05 / Why Darji
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,4.8rem)] font-normal leading-[1] tracking-[-0.025em] text-[#08111f]">
              Because convenience shouldn’t come at the cost of quality.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              We bring together skilled expertise, modern technology, and doorstep service into one seamless experience.
            </p>
          </motion.div>

          {/* Editorial Portrait Cards Grid */}
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {artisans.map((artisan, idx) => (
              <motion.div
                key={artisan.name}
                {...reveal}
                transition={{ ...reveal.transition, delay: idx * 0.1 }}
                className="group relative overflow-hidden rounded-3xl border border-[#e6edf5] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(8,17,31,0.08)]"
              >
                <div className="relative h-72 sm:h-80 overflow-hidden bg-[#08111f]">
                  <img
                    src={artisan.image}
                    alt={artisan.name}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08111f] via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ff7000]">
                    {artisan.experience}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-xs text-white/60 font-bold uppercase tracking-wider">{artisan.location}</p>
                    <h3 className="font-editorial text-2xl sm:text-3xl text-white font-normal">{artisan.name}</h3>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ff7000]"></span>
                    <p className="text-sm font-bold text-[#08111f] mt-0.5">{artisan.specialty}</p>
                  </div>
                  <div className="border-t border-[#f0f4f8] pt-4">
                    <p className="text-xs italic text-[#5c6a7d] leading-relaxed">
                      {artisan.quote}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 07 — VALUES (OVERSIZED TYPOGRAPHIC STATEMENTS) */}
      <section className="border-b border-white/10 bg-[#080808] py-20 text-white sm:py-32">
        <div className="shell">
          <motion.div {...reveal} className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb35f]">
              06 / The Darji Values
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.5vw,4.4rem)] font-normal leading-[1] tracking-[-0.025em] text-white">
              The little details make all the difference.
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((val, idx) => (
              <motion.div
                key={val.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: idx * 0.08 }}
                className="space-y-4 border-t border-white/15 pt-8"
              >
                <div className="flex items-center justify-between">
                  <span className="font-editorial text-3xl text-white/40 font-bold">{val.num}</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff7000]">{val.kicker}</span>
                </div>
                <h3 className="font-editorial text-4xl sm:text-5xl font-normal tracking-tight text-white">
                  {val.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/65 font-normal">
                  {val.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 08 — FINAL CTA (CINEMATIC CLOSING) */}
      <section className="relative overflow-hidden bg-[#080808] py-24 text-center text-white sm:py-36">

        <div className="shell relative max-w-4xl mx-auto">
          <motion.div {...reveal} className="space-y-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffb35f]">
              Start Your Darji Journey
            </p>

            <h2 className="font-editorial text-[clamp(2.8rem,6.5vw,5.8rem)] font-normal leading-[0.96] tracking-[-0.025em] text-white">
              Great service begins <br />
              <span className="italic text-white/62">at your doorstep.</span>
            </h2>

            <p className="mx-auto max-w-xl text-base sm:text-lg text-white/70 leading-relaxed font-normal">
              Book a pickup, schedule a measurement, or start your next alteration in minutes.
            </p>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setLaunchOpen(true)}
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#ff7000] px-8 text-sm font-black text-white transition hover:bg-[#e56500] hover:-translate-y-0.5 shadow-lg shadow-[#ff7000]/25"
              >
                Book a Pickup <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                href="/blogs"
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/6 px-8 text-sm font-bold text-white transition hover:bg-white/12"
              >
                Explore Services
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Editorial Footer */}
      <EditorialFooter />

      {/* Launch Soon Booking Modal */}
      <LaunchSoonModal open={launchOpen} onClose={() => setLaunchOpen(false)} />
    </main>
  );
}
