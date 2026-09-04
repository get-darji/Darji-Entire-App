"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone, Scissors, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/src/components/brand-logo";

type ModalProps = {
  open: boolean;
  onClose: () => void;
};

const modalMotion = {
  initial: { opacity: 0, y: 22, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.98 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
} as const;

export function LaunchSoonModal({ open, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#08111f]/62 px-4 py-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="launch-soon-title"
          onClick={onClose}
        >
          <motion.div
            {...modalMotion}
            className="relative w-full max-w-[560px] overflow-hidden rounded-3xl bg-white p-6 text-left shadow-[0_28px_80px_rgba(8,17,31,0.28)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-[#ff7000]/12" />
            <button
              type="button"
              onClick={onClose}
              className="focus-ring absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-[#f5f7fb] text-[#08111f] transition hover:bg-[#fff0e5] hover:text-[#ff7000]"
              aria-label="Close launch message"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative">
              <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0e5] text-[#ff7000]">
                <Scissors className="h-7 w-7" />
              </span>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-[#ff7000]">Coming soon</p>
              <h2 id="launch-soon-title" className="mt-2 max-w-[11ch] text-[clamp(2.2rem,6vw,4.7rem)] font-black leading-[0.9] tracking-[-0.035em] text-[#08111f]">
                Pickup bookings are almost ready.
              </h2>
              <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-[#4b5a70]">
                We are launching Book Pickup bookings soon. For now, our team is finishing the booking flow so your first order feels smooth from pickup to delivery.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ff7000] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#e56500]"
                >
                  Okay, got it
                </button>
                <a
                  href="mailto:support@darji.in"
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-6 text-sm font-black text-[#08111f] transition hover:border-[#ffc89b] hover:bg-[#fff8f0]"
                >
                  Contact team <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function SupportModal({ open, onClose }: ModalProps) {
  const options = [
    { label: "Call support", value: "+91 98765 43210", href: "tel:+919876543210", icon: Phone },
    { label: "WhatsApp", value: "Message Darji support", href: "https://wa.me/919876543210", icon: MessageCircle },
    { label: "Email", value: "support@darji.in", href: "mailto:support@darji.in", icon: Mail },
    { label: "Service city", value: "New Delhi, India", href: "https://maps.google.com/?q=New%20Delhi%20India", icon: MapPin }
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#08111f]/62 px-4 py-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-title"
          onClick={onClose}
        >
          <motion.div
            {...modalMotion}
            className="relative w-full max-w-[620px] overflow-hidden rounded-3xl bg-white p-6 text-left shadow-[0_28px_80px_rgba(8,17,31,0.28)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="focus-ring absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-[#f5f7fb] text-[#08111f] transition hover:bg-[#fff0e5] hover:text-[#ff7000]"
              aria-label="Close contact support"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ff7000]">Contact support</p>
            <h2 id="support-title" className="mt-2 text-[clamp(2rem,5vw,3.6rem)] font-black leading-[0.94] tracking-[-0.03em] text-[#08111f]">
              Talk to Darji.
            </h2>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[#4b5a70]">
              Choose any option below. Our support team can help with bookings, service areas, pricing, and order questions.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {options.map((option) => {
                const Icon = option.icon;
                return (
                  <a
                    key={option.label}
                    href={option.href}
                    className="focus-ring group flex min-h-24 items-center gap-4 rounded-2xl border border-[#e6edf5] bg-[#fbfcfe] p-4 transition hover:-translate-y-0.5 hover:border-[#ffc89b] hover:bg-[#fff8f0]"
                    target={option.href.startsWith("http") ? "_blank" : undefined}
                    rel={option.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#ff7000] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-[#08111f]">{option.label}</span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-[#5c6a7d]">{option.value}</span>
                    </span>
                  </a>
                );
              })}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#08111f] px-4 py-3 text-sm font-bold text-white">
              <Clock3 className="h-5 w-5 shrink-0 text-[#ffb35f]" />
              Support hours: 8:00 AM - 10:00 PM
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MarketingHeader({ active }: { active?: "home" | "about" | "blogs" }) {
  const [launchOpen, setLaunchOpen] = useState(false);

  const nav = [
    { label: "Home", href: "/", key: "home" },
    { label: "Services", href: "/#services", key: "services" },
    { label: "FAQs", href: "/#faq", key: "faq" },
    { label: "Blog", href: "/blogs", key: "blogs" },
    { label: "About Us", href: "/about", key: "about" }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#e6edf5]/80 bg-white/86 backdrop-blur-xl">
        <div className="shell flex min-h-[5.25rem] items-center justify-between gap-5">
          <Link href="/" className="focus-ring inline-flex rounded-xl">
            <BrandLogo imageClassName="h-[68px] w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-[#687589] lg:flex" aria-label="Main navigation">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full py-2 transition hover:text-[#ff7000] ${active === item.key ? "text-[#ff7000]" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setLaunchOpen(true)}
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ff7000] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#e56500]"
          >
            Book Pickup
          </button>
        </div>
      </header>
      <LaunchSoonModal open={launchOpen} onClose={() => setLaunchOpen(false)} />
    </>
  );
}

export function LaunchSoonPage() {
  return (
    <main className="min-h-screen bg-white">
      <MarketingHeader />
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_70%_0%,rgba(255,112,0,0.12),transparent_38rem)]" />
        <div className="shell relative grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ff7000]">Bookings paused</p>
            <h1 className="mt-4 max-w-3xl text-[clamp(3rem,8vw,6rem)] font-black leading-[0.9] tracking-[-0.035em] text-[#08111f]">
              Book Pickup is launching soon.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#4b5a70]">
              The customer booking dashboard is temporarily disabled while we prepare the public launch. Please check back soon, or contact support for help.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ff7000] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#e56500]">
                Back to home
              </Link>
              <a href="mailto:support@darji.in" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-[#e6edf5] bg-white px-6 text-sm font-black text-[#08111f] transition hover:border-[#ffc89b] hover:bg-[#fff8f0]">
                Contact support
              </a>
            </div>
          </div>
          <div className="relative min-h-[420px] overflow-hidden rounded-[28px] bg-[#08111f]">
            <img src="/hero-tailor-visual.png" alt="Darji tailoring preview while bookings prepare to launch" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(8,17,31,0.78),rgba(8,17,31,0.06))]" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff7000]">Next up</p>
              <p className="mt-2 text-2xl font-black leading-tight text-[#08111f]">A smoother pickup flow, transparent pricing, and live order tracking.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
