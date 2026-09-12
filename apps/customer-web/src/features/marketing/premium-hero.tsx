"use client";

import { useState } from "react";
import { ArrowRight, Clock3, LockKeyhole, MapPin, Menu, Phone, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { RefObject } from "react";
import { BrandLogo } from "@/src/components/brand-logo";
import { heroTrustItems } from "./hero-config";
import { HeroScene } from "./hero-scene";

type PremiumHeroProps = {
  heroRef: RefObject<HTMLElement | null>;
  onModelReady?: () => void;
  onBookPickup?: () => void;
};

const trustIcons = [ShieldCheck, MapPin, Clock3, LockKeyhole];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Blog", href: "/blogs" },
  { label: "About Us", href: "/about" }
];

export function PremiumHero({ heroRef, onModelReady, onBookPickup }: PremiumHeroProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <section ref={heroRef} className="hero-shell relative min-h-0 overflow-hidden bg-white lg:min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_24%,rgba(255,112,0,0.12),transparent_30rem),linear-gradient(180deg,#ffffff_0%,#fffaf5_48%,#ffffff_100%)]" />
      <div className="shell relative z-10">
        <nav className="darji-navbar flex min-h-[5.5rem] items-center justify-between gap-5 py-4">
          <Link href="/" className="focus-ring inline-flex rounded-xl">
            <BrandLogo imageClassName="h-[72px] w-auto" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-bold text-[var(--color-text-secondary)] lg:flex">
            {navLinks.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`relative rounded-full py-2 transition-colors duration-200 hover:text-[var(--color-primary)] ${index === 0 ? "text-[var(--color-primary)]" : ""}`}
              >
                {item.label}
                {index === 0 ? <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[var(--color-primary)]" /> : null}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onBookPickup}
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 sm:px-5"
            >
              Book Pickup
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] shadow-sm transition hover:bg-[var(--color-surface-secondary)] lg:hidden"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/95 p-4 shadow-xl backdrop-blur-md lg:hidden"
            >
              <div className="grid gap-1">
                {navLinks.map((item, index) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] ${
                      index === 0 ? "text-[var(--color-primary)] bg-[var(--color-primary-light)]/40" : "text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="h-4 w-4 opacity-40" />
                  </Link>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="grid items-start gap-8 pb-8 pt-6 lg:min-h-[calc(100svh-5.5rem)] lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-8 lg:pb-8 lg:pt-0">
          <div className="max-w-2xl">
            <div className="darji-hero-kicker inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" />
              Tailoring, Reimagined
            </div>
            <h1 className="darji-hero-title mt-5 text-[clamp(2.75rem,5.8vw,5.6rem)] font-extrabold leading-[0.98] tracking-tight text-[var(--color-text-primary)]">
              Perfect Fit.
              <span className="block text-[var(--color-primary)]">Every Time.</span>
            </h1>
            <p className="darji-hero-copy mt-6 max-w-xl text-lg font-medium leading-8 text-[var(--color-text-secondary)]">
              Doorstep pickup and delivery for all your tailoring, alterations and repair needs.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
              {heroTrustItems.map((item, index) => {
                const Icon = trustIcons[index] ?? ShieldCheck;
                return (
                  <div key={item} className="darji-hero-trust text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-xs font-bold leading-relaxed text-[var(--color-text-primary)]">{item}</p>
                  </div>
                );
              })}
            </div>

            <div className="darji-hero-buttons mt-9 flex flex-col gap-4 sm:flex-row">
              <button type="button" onClick={onBookPickup} className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[var(--color-primary)] px-8 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0">
                Book Pickup Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <a href="#services" className="focus-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-8 text-base font-bold text-[var(--color-text-primary)] shadow-sm transition-all duration-200 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-secondary)] hover:-translate-y-0.5 active:translate-y-0">
                View Services
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="darji-hero-social mt-8 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-3">
                {["AS", "RV", "NI", "PK"].map((name, index) => (
                  <span key={name} className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[var(--color-text-primary)] text-xs font-bold text-white shadow-sm" style={{ backgroundColor: ["#0b2241", "#f97316", "#2563eb", "#16a34a"][index] }}>
                    {name}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">100+ happy customers trust Darji</p>
                <div className="mt-1 flex gap-1 text-[var(--color-primary)]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="darji-hero-image relative hidden min-h-[680px] lg:block">
            <HeroScene heroRef={heroRef} onModelReady={onModelReady} />
          </div>
        </div>
      </div>
    </section>
  );
}
