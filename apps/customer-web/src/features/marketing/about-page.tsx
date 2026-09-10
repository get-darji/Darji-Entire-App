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
  Zap,
  Star
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
  {
    tag: "UNCOMPROMISING",
    value: "Craftsmanship First",
    desc: "Every garment is shaped by experienced tailoring masters."
  },
  {
    tag: "ZERO EFFORT",
    value: "Doorstep Simplicity",
    desc: "Fittings, alterations, and deliveries — without leaving home."
  },
  {
    tag: "BUILT FOR YOUR NEEDS",
    value: "Flexible Tailoring Services",
    desc: "Alterations, repairs, and custom stitching for the garments you already love."
  },
  {
    tag: "REAL PEOPLE",
    value: "Human Support",
    desc: "Direct concierge assistance through every stage of your order."
  }
];

const problems = [
  {
    step: "01",
    title: "FIND",
    label: "Finding a master tailor you can truly trust.",
    problem: "Asking neighbors for recommendations, visiting crowded markets, and hoping the stitching matches expectations.",
    solution: "Darji pairs you with verified master tailoring artisans matched to your specific garment and fabric needs."
  },
  {
    step: "02",
    title: "EXPLAIN",
    label: "Explaining your exact fit, again and again.",
    problem: "Measurements lost on paper slips, forgotten preferences, and repeated trial visits every time you order.",
    solution: "Share measurements, fit preferences, and garment notes with each order so the tailor understands what you need."
  },
  {
    step: "03",
    title: "WAIT",
    label: "Never knowing when your clothes are ready.",
    problem: "Calling shops repeatedly for updates, unexpected festive delays, and total uncertainty around delivery dates.",
    solution: "Live digital tracking from doorstep pickup through cutting, stitching, quality audit, and delivery."
  },
  {
    step: "04",
    title: "TRAVEL",
    label: "Spending wasted hours on routine alterations.",
    problem: "Battling traffic simply to drop off garments, explain minor adjustments, and make a second trip for pickup.",
    solution: "Doorstep pickup and fitting visits schedule around your life, not the tailor’s open hours."
  }
];

const ecosystemSteps = [
  {
    id: "customer",
    num: "01",
    role: "STEP 01 / BOOK YOUR SERVICE",
    headline: "Great clothing should begin with excitement.",
    desc: "Choose custom stitching, alterations, or repairs. Pick a convenient doorstep consultation slot, and let Darji orchestrate everything else.",
    highlight: "Book your doorstep fitting in under 60 seconds.",
    icon: Users
  },
  {
    id: "concierge",
    num: "02",
    role: "STEP 02 / DOORSTEP MEASUREMENTS",
    headline: "No guesswork. No awkward explanations.",
    desc: "A trained Darji tailoring specialist visits your home with precision measurement tools to understand your posture, silhouette, and fabric preferences.",
    highlight: "Measurements and fit notes are recorded for the current order.",
    icon: Ruler
  },
  {
    id: "artisan",
    num: "03",
    role: "STEP 03 / MASTER TAILORS AT WORK",
    headline: "Crafted by artisans who obsess over the details.",
    desc: "Your fabric is cut and stitched by specialized tailoring professionals with decades of expertise in drape, seam strength, and refined finishing.",
    highlight: "Dedicated specialists assigned by garment category.",
    icon: Scissors
  },
  {
    id: "audit",
    num: "04",
    role: "STEP 04 / DUAL-STAGE QUALITY CHECK",
    headline: "Nothing leaves until it meets perfection standards.",
    desc: "Every seam, hem, buttonhole, and sleeve line is checked against the measurements and instructions for your order.",
    highlight: "Multi-point precision audit before garment dispatch.",
    icon: ShieldCheck
  },
  {
    id: "return",
    num: "05",
    role: "STEP 05 / WHITE-GLOVE DELIVERY",
    headline: "Ready to wear. Perfected if needed.",
    desc: "Your finished garments arrive freshly pressed in protective garment covers. If any micro-adjustment is ever needed, we handle it free of charge.",
    highlight: "Hassle-free doorstep delivery with 100% fit guarantee.",
    icon: Truck
  }
];

const artisans = [
  {
    name: "Doorstep Concierge",
    experience: "ZERO TRAVEL REQUIRED",
    specialty: "No traffic. No repeated visits. Tailoring that fits into your day.",
    quote: "“A specialist visits your home with garment bags, tape measures, and styling guidance.”",
    image: "/editorial/whydarji1.png",
    location: "Home Service"
  },
  {
    name: "Fit Details for Every Order",
    experience: "MEASUREMENTS & FIT NOTES",
    specialty: "Give the tailor the fit details needed for your current garment.",
    quote: "“Share measurements, provide a sample garment, or request an at-home measurement visit.”",
    image: "/editorial/whydarji2.png",
    location: "Current Order"
  },
  {
    name: "Master Quality Audits",
    experience: "UNCOMPROMISING PRECISION",
    specialty: "Multi-stage inspection for seam tension, fall, and immaculate hems.",
    quote: "“Every garment undergoes meticulous manual inspection before leaving the atelier.”",
    image: "/editorial/whydarji3.png",
    location: "Masterclass Atelier"
  },
  {
    name: "Complete Tailoring Spectrum",
    experience: "ONE PLATFORM, ALL SOLUTIONS",
    specialty: "Designer bridal wear, formal suits, festive ethnic wear, and alterations.",
    quote: "“From intricate designer blouses to bespoke 3-piece suits and everyday repairs.”",
    image: "/editorial/whydarji4.png",
    location: "Comprehensive Craft"
  }
];

const values = [
  {
    num: "01",
    title: "CONVENIENT",
    kicker: "सुविधा",
    body: "Tailoring designed around your life, your home, and your personal calendar."
  },
  {
    num: "02",
    title: "TRUSTED",
    kicker: "विश्वास",
    body: "Verified master artisans, upfront transparent pricing, and zero surprises."
  },
  {
    num: "03",
    title: "PRECISE",
    kicker: "सटीकता",
    body: "Millimeter accuracy, bespoke pattern cutting, and flawless hand finishing."
  },
  {
    num: "04",
    title: "CONNECTED",
    kicker: "जुड़ाव",
    body: "Live digital stage updates and direct human concierge support throughout."
  }
];

export function AboutPage() {
  const [activeProblem, setActiveProblem] = useState<number>(0);
  const [activeEcosystemStep, setActiveEcosystemStep] = useState<number>(0);
  const [activeCraftTab, setActiveCraftTab] = useState<"craft" | "service">("craft");
  const [launchOpen, setLaunchOpen] = useState(false);

  const dualityPanels = activeCraftTab === "craft"
    ? {
        left: {
          kicker: "THE ARTISAN MASTERS",
          title: "Generations of craftsmanship in every stitch.",
          body: "Your clothing is touched by skilled tailors who understand fabric weight, grain lines, and the subtleties of drape.",
          bullets: [
            "Bespoke pattern makers and alteration masters",
            "Obsessive attention to seam finishing and contour",
            "Decades of generational tailoring heritage"
          ],
          icon: Scissors
        },
        right: {
          kicker: "THE HANDMADE FINISH",
          title: "Details that define true luxury.",
          body: "From hand-basting to delicate hemming, master tailors give every seam the individual care it deserves.",
          bullets: [
            "Hand-cut patterns tailored to individual posture",
            "Reinforced tension points and clean edge finishes",
            "Garment-specific tailors assigned to your order"
          ],
          icon: Sparkles
        }
      }
    : {
        left: {
          kicker: "DOORSTEP SERVICE",
          title: "Tailoring without the extra trips.",
          body: "Book the tailoring service you need and let Darji handle pickup and delivery at your doorstep.",
          bullets: [
            "Book alterations, repairs, or custom stitching online",
            "Choose a convenient pickup time",
            "Receive your finished garments at your doorstep"
          ],
          icon: Layers
        },
        right: {
          kicker: "ORDER SUPPORT",
          title: "Your order details, all in one place.",
          body: "Check your order as it moves from pickup to tailoring and delivery, without chasing updates.",
          bullets: [
            "Follow the current status of your order",
            "View pickup and delivery details",
            "See payment and order information in My Orders"
          ],
          icon: Zap
        }
      };

  const LeftDualityIcon = dualityPanels.left.icon;
  const RightDualityIcon = dualityPanels.right.icon;

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#101010] font-sans selection:bg-[#ff7000] selection:text-white">
      <MarketingHeader active="about" />

      {/* SECTION 01 — CINEMATIC INTRO HERO */}
      <section className="relative overflow-hidden bg-[#080808] pb-28 pt-20 text-white sm:pb-36 sm:pt-28">
        <div className="shell relative">
          <motion.div {...reveal} className="max-w-5xl">
            {/* Main Editorial Hero Headline */}
            <h1 className="font-editorial text-[clamp(2.8rem,7.2vw,6.6rem)] font-normal leading-[0.96] tracking-[-0.03em] text-white">
              Some garments are <span className="font-semibold text-white">more than fabric.</span> <br className="hidden sm:inline" />
              <span className="font-editorial italic font-normal text-[#ffb35f]">They’re woven memories.</span>
            </h1>

            {/* Subheading with rich typography */}
            <p className="mt-8 max-w-2xl text-base sm:text-xl font-normal leading-relaxed text-white/80">
              Darji makes tailoring effortless. We connect you with <strong className="font-semibold text-white">skilled, trusted local tailors</strong> for alterations, repairs, and custom stitching — <span className="text-[#ffb35f] font-medium">all from the comfort of your home</span>.
            </p>
            <div className="mt-7 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffb35f] sm:text-xs">
              <span className="h-px w-12 bg-[#ffb35f]" aria-hidden="true" />
              <span>We help you wear what you love, longer.</span>
            </div>
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
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 fill-[#ff7000] text-[#ff7000]" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff7000]">
                    The Philosophy
                  </p>
                </div>
                <p className="mt-2.5 font-editorial text-xl sm:text-2xl text-white font-normal leading-snug">
                  “A good tailor can mend more than just clothes; they can mend spirits.”
                </p>
                <p className="mt-3 text-xs text-white/60 font-bold uppercase tracking-wider">
                  — Eva Franco
                </p>
              </div>
            </div>
          </motion.div>

          {/* Live Metrics Ticker */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 border-t border-white/12 pt-10">
            {stats.map((item, idx) => (
              <motion.div
                key={item.value}
                {...reveal}
                transition={{ ...reveal.transition, delay: 0.2 + idx * 0.08 }}
                className="border-l border-white/15 pl-5"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7000]">
                  {item.tag}
                </span>
                <p className="mt-1 font-editorial text-2xl sm:text-3xl font-normal text-white leading-tight">
                  {item.value}
                </p>
                <p className="mt-2 text-xs text-white/60 leading-relaxed font-normal">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 02 — THE STORY / WHY DARJI (ASYMMETRICAL EDITORIAL LAYOUT) */}
      <section id="story" className="py-20 sm:py-32 overflow-hidden border-b border-[#e6edf5] bg-[#fffdf9]">
        <div className="shell">
          <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            {/* Left Column: Asymmetrical Heading & Offset Visuals */}
            <motion.div {...reveal} className="space-y-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff7000]">
                  01 / The Origin Story
                </p>
                <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.8vw,4.4rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#08111f]">
                  A childhood memory <br />
                  <span className="italic font-normal text-[#ff7000]">became a national mission.</span>
                </h2>
              </div>

              {/* Offset Visual Composition */}
              <div className="relative pt-4">
                <div className="relative z-10 overflow-hidden rounded-3xl border border-[#e6edf5] bg-white p-3 shadow-xl">
                  <img
                    src="/editorial/story-origin.jpg"
                    alt="Artisan hands stitching fabric in warm ambient light"
                    className="h-72 sm:h-96 w-full object-cover rounded-2xl"
                  />
                </div>
                {/* Secondary Offset Overlap Card */}
                <div className="absolute -bottom-8 -right-4 sm:-right-6 z-20 w-52 sm:w-64 overflow-hidden rounded-2xl border border-white bg-[#08111f] p-4 sm:p-5 text-white shadow-2xl">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffb35f]">
                    From Home to Darji
                  </span>
                  <p className="mt-1.5 text-xs sm:text-sm text-white/85 font-normal leading-relaxed">
                    A simple observation became a mission to modernize India’s tailoring ecosystem.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Rich Editorial Prose */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.12 }} className="space-y-6 lg:pt-8">
              <p className="drop-cap text-xl sm:text-2xl font-normal leading-relaxed text-[#1e293b]">
                For <strong className="font-bold text-[#08111f]">Aman Kumar Sah</strong>, the vision behind Darji was not conceived in a glass boardroom. <span className="italic font-editorial text-[#ff7000]">It was born at home.</span>
              </p>

              <p className="text-base sm:text-lg leading-relaxed text-[#4b5a70]">
                Growing up, he watched his mother collect garments from local tailors, spend late nights meticulously hemming and refining finishes by hand, earning barely <strong className="font-semibold text-[#08111f]">₹20–30 per piece</strong>. Behind every stitch was immense patience, generational skill, and tireless devotion — yet these brilliant artisans remained <span className="italic text-[#08111f]/80">unseen, undervalued, and disconnected</span> from modern opportunities.
              </p>

              <p className="text-base sm:text-lg leading-relaxed text-[#4b5a70]">
                Years later, while commerce, dining, and transport transformed with a single tap, <strong className="font-semibold text-[#08111f]">tailoring remained frozen in time</strong>. Finding a trustworthy craftsman still meant fighting through traffic, repeating measurements, and enduring unpredictable delays. Darji was founded to bridge this gap — uniting <span className="font-semibold text-[#08111f]">discerning customers</span>, <span className="font-semibold text-[#08111f]">master craftsmen</span>, and <span className="font-semibold text-[#08111f]">white-glove doorstep logistics</span> into one seamless, elevated experience.
              </p>

              <div className="relative overflow-hidden rounded-2xl border-l-4 border-l-[#ff7000] border border-[#e6edf5] bg-white p-6 sm:p-7 shadow-[0_16px_42px_rgba(8,17,31,0.06)]">
                <p className="font-editorial text-xl sm:text-2xl italic text-[#08111f] leading-snug">
                  “If food, groceries and taxis can reach our doorstep, <span className="text-[#ff7000] font-normal not-italic">why can’t tailoring?</span>”
                </p>
                <div className="mt-4 flex items-center">
                  <p className="text-xs font-black uppercase tracking-wider text-[#ff7000]">
                    — Aman Kumar Sah <span className="text-[#64748b] font-medium">/ Founder &amp; CEO, Darji</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 03 — THE PROBLEM (4-STAGE SEQUENTIAL PROGRESSION) */}
      <section className="py-20 sm:py-32 bg-[#f6f8fb] border-b border-[#e6edf5]">
        <div className="shell">
          <motion.div {...reveal} className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff7000]">
              02 / The Challenge
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.5vw,4.4rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#08111f]">
              Tailoring shouldn’t feel <br />
              <span className="italic font-normal text-[#ff7000]">harder than ordering dinner.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              Millions of people still wrestle with an outdated process that should have become effortless years ago.
            </p>
          </motion.div>

          {/* Interactive 4-Stage Breakdown */}
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                  className={`focus-ring cursor-pointer rounded-2xl p-7 text-left transition-all duration-500 ${
                    isSelected
                      ? "border-2 border-[#ff7000] bg-white shadow-[0_24px_58px_rgba(255,112,0,0.12)] -translate-y-1.5"
                      : "border border-black/10 bg-white/75 hover:border-black/30 hover:bg-white hover:-translate-y-0.5 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-editorial text-3xl font-bold ${isSelected ? "text-[#ff7000]" : "text-[#8c9aa8]"}`}>
                      {item.step}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase ${
                      isSelected ? "bg-[#ff7000] text-white" : "bg-[#eef2f7] text-[#687589]"
                    }`}>
                      {item.title}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg sm:text-xl font-bold text-[#08111f] leading-snug">
                    {item.label}
                  </h3>

                  <div className="mt-6 divide-y divide-black/10 border-y border-black/10 text-sm leading-relaxed">
                    <div className="py-3.5">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-red-600/80">
                        ✕ The Old Way
                      </span>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#555] font-normal">
                        {item.problem}
                      </p>
                    </div>
                    <div className="py-3.5">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        ✓ The Darji Way
                      </span>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#101010] font-semibold">
                        {item.solution}
                      </p>
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
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffb35f]">
              03 / The Living Ecosystem
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,5rem)] font-normal leading-[1] tracking-[-0.025em] text-white">
              From uncertainty and delays to <br />
              <span className="italic font-normal text-[#ffb35f]">complete peace of mind.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed font-normal">
              Every touchpoint is designed to remove friction, so you can enjoy bespoke clothing while we handle every detail.
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
                        ? "bg-white/12 border-[#ff7000] text-white shadow-xl translate-x-1"
                        : "bg-white/4 border-white/8 text-white/60 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`grid h-11 w-11 place-items-center rounded-xl font-editorial text-lg font-bold ${
                        isCurrent ? "bg-[#ff7000] text-white shadow-md shadow-[#ff7000]/30" : "bg-white/10 text-white/70"
                      }`}>
                        {step.num}
                      </span>
                      <div>
                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb35f]">
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
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/4 p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
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
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff7000]">{active.role}</p>
                        <h3 className="mt-2 font-editorial text-3xl sm:text-4xl font-normal text-white leading-tight">
                          {active.headline}
                        </h3>
                      </div>

                      <p className="text-base sm:text-lg text-white/80 leading-relaxed font-normal">
                        {active.desc}
                      </p>

                      <div className="rounded-2xl bg-white/8 border border-white/12 p-5 flex items-center gap-3.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span className="text-sm font-bold text-white/95">{active.highlight}</span>
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
      <section className="py-20 sm:py-32 overflow-hidden border-b border-[#e6edf5] bg-white">
        <div className="shell">
          <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff7000]">
              04 / The Duality
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.8vw,4.6rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#08111f]">
              Expert hands do the tailoring. <br />
              <span className="italic font-normal text-[#ff7000]">Darji keeps the service simple.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              We connect you with skilled tailors and make booking, pickup, order updates, and delivery easier.
            </p>

            {/* Interactive Toggle Switch */}
            <div className="mt-9 inline-flex rounded-2xl border border-[#e6edf5] bg-[#f6f8fb] p-1.5 shadow-sm">
              <button
                onClick={() => setActiveCraftTab("craft")}
                className={`rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                  activeCraftTab === "craft"
                    ? "bg-[#ff7000] text-white shadow-md shadow-[#ff7000]/25"
                    : "text-[#4b5a70] hover:text-[#08111f]"
                }`}
              >
                The Artisan Masters
              </button>
              <button
                onClick={() => setActiveCraftTab("service")}
                className={`rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                  activeCraftTab === "service"
                    ? "bg-[#08111f] text-white shadow-md"
                    : "text-[#4b5a70] hover:text-[#08111f]"
                }`}
              >
                The Darji Service
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
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-[#ff7000]">
                <LeftDualityIcon className="h-4 w-4" /> {dualityPanels.left.kicker}
              </div>
              <h3 className="mt-4 font-editorial text-3xl sm:text-4xl font-normal text-[#08111f] leading-snug">
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
                activeCraftTab === "service"
                  ? "bg-[#08111f] text-white border-white/20 shadow-[0_24px_64px_rgba(8,17,31,0.25)] scale-[1.01]"
                  : "bg-white/60 border-[#e6edf5] opacity-80"
              }`}
            >
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-[#ffb35f]">
                <RightDualityIcon className="h-4 w-4" /> {dualityPanels.right.kicker}
              </div>
              <h3 className="mt-4 font-editorial text-3xl sm:text-4xl font-normal leading-snug">
                {dualityPanels.right.title}
              </h3>
              <p className={`mt-4 text-base leading-relaxed ${
                activeCraftTab === "service" ? "text-white/75" : "text-[#4b5a70]"
              }`}>
                {dualityPanels.right.body}
              </p>
              <ul className={`mt-6 space-y-3.5 text-sm font-semibold ${
                activeCraftTab === "service" ? "text-white/90" : "text-[#1e293b]"
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

      {/* SECTION 06 — THE SHOWCASE / WHY DARJI (EDITORIAL PHOTOGRAPHY SHOWCASE) */}
      <section id="artisans" className="py-20 sm:py-32 bg-[#fdfaf6] border-b border-[#e6edf5]">
        <div className="shell">
          <motion.div {...reveal} className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff7000]">
              05 / Why Darji
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,4.8rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#08111f]">
              Because modern convenience <br />
              <span className="italic font-normal text-[#ff7000]">must never compromise mastercraft.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              We bring together bespoke tailoring heritage, cutting-edge precision, and doorstep logistics into one cohesive service.
            </p>
          </motion.div>

          {/* Editorial Portrait Cards Grid */}
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {artisans.map((artisan, idx) => (
              <motion.div
                key={artisan.name}
                {...reveal}
                transition={{ ...reveal.transition, delay: idx * 0.1 }}
                className="group relative overflow-hidden rounded-3xl border border-[#e6edf5] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(8,17,31,0.1)]"
              >
                <div className="relative aspect-[1492/939] overflow-hidden bg-[#08111f]">
                  <img
                    src={artisan.image}
                    alt={artisan.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-6 sm:p-8 space-y-4">
                  <div>
                    <p className="text-base font-bold text-[#08111f] leading-snug">{artisan.specialty}</p>
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
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffb35f]">
              06 / Guiding Principles
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.5vw,4.4rem)] font-normal leading-[1.02] tracking-[-0.025em] text-white">
              The little details <br />
              <span className="italic font-normal text-[#ffb35f]">make all the difference.</span>
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
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#ff7000]">{val.kicker}</span>
                </div>
                <h3 className="font-editorial text-3xl sm:text-4xl font-normal tracking-tight text-white">
                  {val.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/70 font-normal">
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
            <h2 className="font-editorial text-[clamp(2.8rem,6.5vw,5.8rem)] font-normal leading-[0.96] tracking-[-0.025em] text-white">
              Exceptional tailoring begins <br />
              <span className="italic font-normal text-[#ffb35f]">right at your doorstep.</span>
            </h2>

            <p className="mx-auto max-w-xl text-base sm:text-lg text-white/75 leading-relaxed font-normal">
              Book a pickup, schedule a doorstep measurement, or start your next alteration in minutes.
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
