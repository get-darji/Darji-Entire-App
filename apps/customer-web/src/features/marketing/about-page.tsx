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
  { value: "100%", label: "Verified Master Artisans", desc: "Every partner vetted for stitch tolerance" },
  { value: "12,000+", label: "Fitted Wardrobe Pieces", desc: "From heirloom silks to bespoke blazers" },
  { value: "48-Hour", label: "Express Alteration Option", desc: "Doorstep pickup to doorstep return" },
  { value: "0 Guesswork", label: "Digitized Fit Profile", desc: "Photos, measurements & drape notes saved" }
];

const problems = [
  {
    step: "01",
    title: "FIND",
    label: "Finding a reliable master artisan",
    problem: "Navigating crowded bazaars, guessing whether a local shop understands complex drape, or settling for mass-produced ill-fitting ready-made clothes.",
    solution: "Darji routes your garment specifically to certified master tailors who specialize in that exact fabric and cut."
  },
  {
    step: "02",
    title: "EXPLAIN",
    label: "Explaining fit nuances in 2 minutes",
    problem: "Trying to communicate darts, neck plunges, and sleeve taper over a noisy shop counter while the tailor jots vague notes on scrap paper.",
    solution: "Doorstep concierge captures high-definition fit photos, digital annotations, and calibrated body measurements."
  },
  {
    step: "03",
    title: "STITCH",
    label: "Unpredictable dates and lost instructions",
    problem: "Chasing for delivery updates, lost alterations, and repeat visits because the tailor forgot your specific instructions.",
    solution: "Live milestone tracking, digitized order cards at the artisan's workbench, and a 7-point quality audit before return."
  },
  {
    step: "04",
    title: "DELIVER",
    label: "Wasting hours in city traffic",
    problem: "Multiple trips across town in peak traffic, parking struggles, only to find the shop closed or the garment not ready.",
    solution: "Padded dust-sealed doorstep pickup and return delivery at your chosen time slot, with a 100% fit guarantee."
  }
];

const ecosystemSteps = [
  {
    id: "customer",
    num: "01",
    role: "THE CUSTOMER",
    headline: "Wardrobe needs booked in 60 seconds",
    desc: "Select custom stitching, alterations, or repairs. Upload reference inspiration or garment photos. Choose an exact doorstep fitting slot.",
    highlight: "Saved anatomical measurements across all future orders",
    icon: Users
  },
  {
    id: "concierge",
    num: "02",
    role: "DARJI CONCIERGE",
    headline: "Calibrated home measurement & intake",
    desc: "Our trained fit captains arrive at your door with measuring calipers, sample swatches, and padded garment transit cases to record your exact fit preference.",
    highlight: "Digital photographic intake eliminates miscommunication",
    icon: Ruler
  },
  {
    id: "artisan",
    num: "03",
    role: "MASTER TAILOR GUILD",
    headline: "Specialized cutting & artisanal stitch",
    desc: "Garments are routed to certified master cut-and-sew tailors with decades of experience in bespoke formalwear, saree blouses, or denim engineering.",
    highlight: "Artisans earn 40% higher income with direct digital demand",
    icon: Scissors
  },
  {
    id: "audit",
    num: "04",
    role: "7-POINT QUALITY AUDIT",
    headline: "Precision inspection before release",
    desc: "Every seam, dart, hem, and stitch tension is audited against your digital intake profile, followed by professional steam pressing.",
    highlight: "Zero garment leaves the hub without quality certification",
    icon: ShieldCheck
  },
  {
    id: "return",
    num: "05",
    role: "DOORSTEP RETURN",
    headline: "Delivered to your hands ready to wear",
    desc: "Delivered in protective dust-proof garment bags with trial guarantee. If any adjustment is needed, we re-collect and perfect it free of charge.",
    highlight: "100% Perfect Fit Guarantee on every order",
    icon: Truck
  }
];

const artisans = [
  {
    name: "Master Rafiq Ahmed",
    experience: "32 Years Experience",
    specialty: "Bespoke Achkans, Sherwanis & Suit Jacket Tapering",
    quote: "A suit covers the body; a master cut honors how a person walks into a room. You cannot rush the shears.",
    image: "/hero-tailor-visual.png",
    location: "Old Delhi Heritage Studio"
  },
  {
    name: "Sunita Sharma",
    experience: "22 Years Experience",
    specialty: "Saree Blouse Drape, Katori Cut & Bridal Alterations",
    quote: "Every woman’s posture has its own rhythm. The armhole curve must be sculpted like fine architecture.",
    image: "/animations/service-womens-wear.png",
    location: "South Delhi Fitting Hub"
  },
  {
    name: "Mohammad Imran",
    experience: "18 Years Experience",
    specialty: "Heavy Denim Rework, Chain-Stitch Hemming & Leather",
    quote: "True craftsmanship is in the details nobody notices until they wear the garment for ten hours straight.",
    image: "/animations/service-mens-wear.png",
    location: "Noida Craft Atelier"
  },
  {
    name: "Ananya Sen",
    experience: "Lead Garment Engineer",
    specialty: "Digital Pattern Calibration & 7-Point Quality Standards",
    quote: "We don't replace the master tailor’s tactile genius—we give them the digital clarity to execute flawlessly.",
    image: "/animations/service-custom-stitching.png",
    location: "Darji Central Labs"
  }
];

const values = [
  {
    num: "01",
    title: "LOCAL",
    kicker: "Heritage & Community",
    body: "We preserve India's storied tailoring lineages by connecting neighborhood master artisans directly with modern customers, eliminating predatory middlemen and elevating craft dignity."
  },
  {
    num: "02",
    title: "TRUSTED",
    kicker: "Zero Ambiguity",
    body: "From transparent upfront pricing to photographic intake records and fully insured garment transit, you always know exactly who is handling your clothes and when they will return."
  },
  {
    num: "03",
    title: "CRAFTED",
    kicker: "Millimeter Precision",
    body: "We believe clothing should be cut to fit human beings, not the other way around. Every seam, dart, and collar is tailored with reverence for fabric drape and anatomical comfort."
  },
  {
    num: "04",
    title: "CONNECTED",
    kicker: "Doorstep Seamlessness",
    body: "Effortless logistics bridging your wardrobe to heritage workshops. Calibrated home measurement visits, live milestone tracking, and a 100% Perfect Fit Guarantee."
  }
];

export function AboutPage() {
  const [activeProblem, setActiveProblem] = useState<number>(0);
  const [activeEcosystemStep, setActiveEcosystemStep] = useState<number>(0);
  const [activeCraftTab, setActiveCraftTab] = useState<"craft" | "tech">("craft");
  const [launchOpen, setLaunchOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#fdfaf6] text-[#08111f] font-sans selection:bg-[#ff7000]/20 selection:text-[#08111f]">
      <MarketingHeader active="about" />

      {/* SECTION 01 — CINEMATIC INTRO HERO */}
      <section className="relative overflow-hidden bg-[#040810] text-white pt-20 pb-28 sm:pt-28 sm:pb-36">
        {/* Ambient atmospheric glows */}
        <div className="pointer-events-none absolute -top-32 right-1/4 h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,112,0,0.18),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,179,95,0.1),transparent_70%)] blur-3xl" />

        <div className="shell relative">
          <motion.div {...reveal} className="max-w-5xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffb35f]">
              The Darji Manifesto • Est. 2026
            </p>

            <h1 className="mt-6 font-editorial text-[clamp(3.2rem,8.2vw,7.6rem)] font-normal leading-[0.92] tracking-[-0.03em] text-white">
              Clothes have stories. <br />
              <span className="italic text-[#ffb35f]">We help you keep them going.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg sm:text-xl font-normal leading-relaxed text-white/75">
              Darji connects modern wardrobes with certified master Indian tailors for bespoke stitching, precision alterations, and effortless doorstep garment care.
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7000]">The Sacred Stitch</p>
                <p className="mt-2 font-editorial text-xl sm:text-2xl text-white font-normal leading-snug">
                  “When a garment fits with millimeter precision, you don't just look poised—you stand differently.”
                </p>
                <p className="mt-2 text-xs text-white/50 font-bold uppercase tracking-wider">— Master Rafiq Ahmed</p>
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
                  01 / The Origin & Story
                </p>
                <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,4.8rem)] font-normal leading-[0.98] tracking-[-0.025em] text-[#08111f]">
                  The quiet art of Indian tailoring was getting lost in city noise.
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
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffb35f]">Generational Knowledge</span>
                  <p className="mt-1 text-xs sm:text-sm text-white/80 font-normal leading-relaxed">
                    Preserving centuries of bespoke pattern drafting for modern lifestyles.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Rich Editorial Prose */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.12 }} className="space-y-6 lg:pt-8">
              <p className="drop-cap text-xl sm:text-2xl font-normal leading-relaxed text-[#1e293b]">
                For generations across India, the neighborhood tailor (दर्ज़ी) was not merely a service provider; they were the trusted custodian of family weddings, festive celebrations, and everyday wardrobe dignity.
              </p>

              <p className="text-base sm:text-lg leading-relaxed text-[#4b5a70]">
                A master tailor understood without asking that your right shoulder dips slightly from carrying a bag, that you prefer an extra half-inch of ease on your festive kurta, and how to drape a Banarasi saree blouse so it stays perfectly poised through eight hours of celebration.
              </p>

              <p className="text-base sm:text-lg leading-relaxed text-[#4b5a70]">
                Yet as our cities grew larger and life moved at lightning speed, that relationship fractured. Getting clothes altered or stitched turned into a gauntlet: navigating chaotic bazaars in peak traffic, struggling to convey nuanced fit adjustments in two minutes over a noisy counter, and chasing down delayed garments.
              </p>

              <div className="rounded-2xl border-l-4 border-[#ff7000] bg-white p-6 shadow-sm">
                <p className="font-editorial text-xl italic text-[#08111f] leading-snug">
                  “We built Darji to rescue that soulful human craft. By bringing doorstep logistics and digital measurement precision to master artisans, we turn a messy chore into a seamless luxury.”
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#ff7000]">
                  — Vikram Joshi, Founder of Darji
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
              02 / The Inefficiency
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.5vw,4.4rem)] font-normal leading-[1] tracking-[-0.025em] text-[#08111f]">
              Four friction points that broke the traditional fitting room.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              Why commercial retail and chaotic street tailoring left both customers and artisans frustrated.
            </p>
          </motion.div>

          {/* Interactive 4-Stage Breakdown */}
          <div className="mt-14 grid gap-8 lg:grid-cols-4">
            {problems.map((item, idx) => {
              const isSelected = activeProblem === idx;
              return (
                <motion.div
                  key={item.step}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: idx * 0.08 }}
                  onClick={() => setActiveProblem(idx)}
                  className={`cursor-pointer rounded-3xl border p-7 transition-all duration-300 ${
                    isSelected
                      ? "bg-white border-[#ff7000] shadow-[0_20px_50px_rgba(255,112,0,0.12)] -translate-y-1.5"
                      : "bg-white/70 border-[#e6edf5] hover:border-[#ffc89b] hover:bg-white"
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

                  <h3 className="mt-6 text-xl font-bold text-[#08111f] leading-snug">
                    {item.label}
                  </h3>

                  <div className="mt-4 space-y-4 text-sm leading-relaxed">
                    <div className="rounded-xl bg-rose-50/70 border border-rose-200/50 p-3.5 text-rose-900">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-rose-700">The Old Friction</span>
                      <p className="mt-1 text-xs text-rose-800 leading-normal">{item.problem}</p>
                    </div>

                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/50 p-3.5 text-emerald-950">
                      <span className="block text-[11px] font-black uppercase tracking-wider text-emerald-700">The Darji Fix</span>
                      <p className="mt-1 text-xs text-emerald-800 leading-normal">{item.solution}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 04 — THE DARJI SOLUTION (THE LIVING TAILORING ECOSYSTEM) */}
      <section id="ecosystem" className="py-20 sm:py-32 bg-[#040810] text-white overflow-hidden border-b border-white/10">
        <div className="shell relative">
          <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-[#ff7000]/10 blur-3xl" />

          <motion.div {...reveal} className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb35f]">
              03 / The Living Ecosystem
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,5rem)] font-normal leading-[0.98] tracking-[-0.025em] text-white">
              From a chaotic trip to an end-to-end craft platform.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
              How Darji coordinates customer, concierge, master artisan, and delivery into one harmonious rhythm.
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
              Technology should elevate craftsmanship, never replace it.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              We pair the tactile intuition of master Indian cutters with modern digital measurement infrastructure.
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
                The Master's Craft
              </button>
              <button
                onClick={() => setActiveCraftTab("tech")}
                className={`rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                  activeCraftTab === "tech"
                    ? "bg-[#08111f] text-white shadow-md"
                    : "text-[#4b5a70] hover:text-[#08111f]"
                }`}
              >
                The Digital Engine
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
                <Scissors className="h-4 w-4" /> The Human Artistry
              </div>
              <h3 className="mt-4 font-editorial text-3xl sm:text-4xl font-normal text-[#08111f]">
                Tactile Intuition & Drape
              </h3>
              <p className="mt-4 text-base text-[#4b5a70] leading-relaxed">
                Algorithms cannot feel the weight of Kanjeevaram silk, the natural stretch of raw denim, or how an Italian wool canvas should roll along a lapel.
              </p>
              <ul className="mt-6 space-y-3.5 text-sm font-semibold text-[#1e293b]">
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
                  Hand-chalked balance curves calibrated to individual posture
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
                  Internal horsehair and muslin chest canvas shaping
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
                  Hand-stitched blind hems and precision armhole scoops
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
                <Zap className="h-4 w-4" /> Digital Infrastructure
              </div>
              <h3 className="mt-4 font-editorial text-3xl sm:text-4xl font-normal">
                Precision & Frictionless Scale
              </h3>
              <p className="mt-4 text-base text-white/70 leading-relaxed">
                Technology removes the logistical chaos: booking slots, digitizing fit history, routing to specialized makers, and real-time order visibility.
              </p>
              <ul className="mt-6 space-y-3.5 text-sm font-semibold text-white/85">
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ffb35f]" />
                  Encrypted Digital Measurement Vault across all garment types
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ffb35f]" />
                  Intelligent garment routing to verified tailoring guilds
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#ffb35f]" />
                  Transparent live status updates with photographic completion proof
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
              05 / The Master Craftspeople
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.5rem,5vw,4.8rem)] font-normal leading-[1] tracking-[-0.025em] text-[#08111f]">
              Meet the hands behind your perfect fit.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#4b5a70] leading-relaxed">
              Every Darji tailoring partner is a verified master artisan with decades of deep specialized experience in their craft.
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
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ff7000]">Specialty Area</span>
                    <p className="text-sm font-bold text-[#08111f] mt-0.5">{artisan.specialty}</p>
                  </div>
                  <div className="border-t border-[#f0f4f8] pt-4">
                    <p className="text-xs italic text-[#5c6a7d] leading-relaxed">
                      "{artisan.quote}"
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 07 — VALUES (OVERSIZED TYPOGRAPHIC STATEMENTS) */}
      <section className="py-20 sm:py-32 bg-[#040810] text-white border-b border-white/10">
        <div className="shell">
          <motion.div {...reveal} className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb35f]">
              06 / The Core Pillars
            </p>
            <h2 className="mt-3 font-editorial text-[clamp(2.4rem,4.5vw,4.4rem)] font-normal leading-[1] tracking-[-0.025em] text-white">
              The values woven into every garment.
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
      <section className="relative overflow-hidden bg-gradient-to-b from-[#08111f] to-[#040810] py-24 sm:py-36 text-white text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,112,0,0.18),transparent_60%)]" />

        <div className="shell relative max-w-4xl mx-auto">
          <motion.div {...reveal} className="space-y-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffb35f]">
              Start Your Fitting Journey
            </p>

            <h2 className="font-editorial text-[clamp(2.8rem,6.5vw,5.8rem)] font-normal leading-[0.96] tracking-[-0.025em] text-white">
              Your clothes deserve <br />
              <span className="italic text-[#ffb35f]">the right hands.</span>
            </h2>

            <p className="mx-auto max-w-xl text-base sm:text-lg text-white/70 leading-relaxed font-normal">
              Book calibrated doorstep measurements, custom stitching, and alterations with certified master tailors in Delhi NCR & Bangalore.
            </p>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setLaunchOpen(true)}
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#ff7000] px-8 text-sm font-black text-white transition hover:bg-[#e56500] hover:-translate-y-0.5 shadow-lg shadow-[#ff7000]/25"
              >
                Book Doorstep Pickup <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                href="/blogs"
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/6 px-8 text-sm font-bold text-white transition hover:bg-white/12"
              >
                Read The Darji Journal
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
