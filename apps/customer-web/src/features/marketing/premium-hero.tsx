"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock3, LockKeyhole, MapPin, Phone, ShieldCheck, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { BrandLogo } from "@/src/components/brand-logo";
import { heroTrustItems } from "./hero-config";
import { HeroScene } from "./hero-scene";

type PremiumHeroProps = {
  heroRef: RefObject<HTMLElement | null>;
  howRef: RefObject<HTMLElement | null>;
};

const trustIcons = [ShieldCheck, MapPin, Clock3, LockKeyhole];

export function PremiumHero({ heroRef, howRef }: PremiumHeroProps) {
  return (
    <section ref={heroRef} className="hero-shell relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_24%,rgba(255,112,0,0.12),transparent_30rem),linear-gradient(180deg,#ffffff_0%,#fffaf5_48%,#ffffff_100%)]" />
      <div className="shell relative z-10">
        <nav className="flex min-h-[5.5rem] items-center justify-between gap-5 py-4">
          <Link href="/" className="focus-ring inline-flex rounded-xl">
            <BrandLogo imageClassName="h-[72px] w-auto" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-black text-[var(--darji-ink)] lg:flex">
            {[
              ["Home", "#"],
              ["How It Works", "#how"],
              ["Services", "#services"],
              ["Pricing", "#pricing"],
              ["FAQs", "#faq"]
            ].map(([label, href], index) => (
              <a key={label} href={href} className={`relative rounded-full py-2 transition hover:text-[var(--darji-orange)] ${index === 0 ? "text-[var(--darji-orange)]" : ""}`}>
                {label}
                {index === 0 ? <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[var(--darji-orange)]" /> : null}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:+919876543210" className="hidden min-h-12 items-center gap-2 rounded-2xl border border-[#ece6df] bg-white px-5 text-sm font-black shadow-[0_12px_28px_rgba(8,17,31,0.05)] sm:flex">
              <Phone className="h-4 w-4" />
              +91 98765 43210
            </a>
            <Link href="/dashboard" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--darji-orange)] px-5 text-sm font-black text-white shadow-[0_18px_36px_rgba(255,112,0,0.28)] transition hover:-translate-y-0.5">
              Book Pickup
            </Link>
          </div>
        </nav>

        <div className="grid min-h-[calc(100svh-5.5rem)] items-center gap-8 pb-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-8 lg:pb-8">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff4eb] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-orange)]">
              <Sparkles className="h-4 w-4" />
              Tailoring, Reimagined
            </div>
            <h1 className="mt-5 text-[clamp(3rem,5.8vw,5.6rem)] font-black leading-[0.98] text-[var(--darji-ink)]">
              Perfect Fit.
              <span className="block text-[var(--darji-orange)]">Every Time.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-[#3f4654]">
              Doorstep pickup and delivery for all your tailoring, alterations and repair needs.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
              {heroTrustItems.map((item, index) => {
                const Icon = trustIcons[index] ?? ShieldCheck;
                return (
                  <div key={item} className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4eb] text-[var(--darji-orange)] shadow-[0_14px_32px_rgba(255,112,0,0.1)]">
                      <Icon className="h-7 w-7" />
                    </div>
                    <p className="mt-3 text-xs font-black leading-4 text-[var(--darji-ink)]">{item}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/dashboard" className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-xl bg-[var(--darji-orange)] px-8 text-base font-black text-white shadow-[0_20px_45px_rgba(255,112,0,0.3)] transition hover:-translate-y-0.5">
                Book Pickup Now
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#how" className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-xl border border-[#ded8d1] bg-white px-8 text-base font-black text-[var(--darji-ink)] shadow-[0_16px_34px_rgba(8,17,31,0.05)] transition hover:-translate-y-0.5">
                How It Works
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-3">
                {["AS", "RV", "NI", "PK"].map((name, index) => (
                  <span key={name} className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-[var(--darji-ink)] text-xs font-black text-white shadow-sm" style={{ backgroundColor: ["#0b2241", "#f97316", "#2563eb", "#16a34a"][index] }}>
                    {name}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-sm font-black text-[var(--darji-ink)]">10,000+ happy customers trust Darji</p>
                <div className="mt-1 flex gap-1 text-[var(--darji-orange)]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }} className="relative min-h-[520px] lg:min-h-[680px]">
            <HeroScene heroRef={heroRef} howRef={howRef} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
