"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Heart, Sparkles } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function EditorialFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-[#040810] text-white pt-20 pb-12 border-t border-white/10">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-[#ff7000]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-[#ffb35f]/5 blur-3xl" />

      <div className="shell relative">
        {/* Top Newsletter & Manifesto Banner */}
        <div className="grid gap-12 pb-16 border-b border-white/10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#ffb35f] border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-[#ff7000]" />
              The Darji Dispatch
            </div>
            <h2 className="mt-4 font-editorial text-[clamp(2.4rem,4.5vw,4.2rem)] font-normal leading-[1.02] text-white tracking-[-0.02em]">
              Sartorial craft & care, delivered to your inbox.
            </h2>
            <p className="mt-4 max-w-xl text-base font-normal text-white/65 leading-relaxed">
              Weekly essays on bespoke tailoring, fabric preservation rituals, pattern engineering, and the living heritage of Indian master artisans.
            </p>
          </div>

          <div className="lg:pl-8">
            {subscribed ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white/6 border border-[#ff7000]/40 p-5 text-[#ffb35f]">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[#ff7000]" />
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-white">You're on the list</p>
                  <p className="text-xs text-white/70 mt-0.5">Welcome to The Darji Dispatch. Next issue arrives Sunday morning.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="min-h-14 flex-1 rounded-xl bg-white/6 border border-white/15 px-5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#ff7000] focus:ring-2 focus:ring-[#ff7000]/30 transition"
                />
                <button
                  type="submit"
                  className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#ff7000] px-7 text-sm font-black text-white transition hover:bg-[#e56500] hover:-translate-y-0.5"
                >
                  Subscribe <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
            <p className="mt-3 text-xs text-white/45">
              No spam. Just pure craft, pattern notes, and tailoring insights. Unsubscribe at any time.
            </p>
          </div>
        </div>

        {/* Middle Navigation Columns */}
        <div className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-5 border-b border-white/10">
          {/* Col 1: Brand & Status */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block">
              <BrandLogo imageClassName="h-14 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-sm text-white/65 leading-relaxed font-normal">
              Darji is an award-winning digital platform connecting discerning wardrobes with verified master tailors for custom stitching, alterations, and doorstep garment care.
            </p>
          </div>

          {/* Col 2: Services */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb35f]">Tailoring Services</p>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li>
                <Link href="/#services" className="hover:text-[#ff7000] transition">Custom Stitching</Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-[#ff7000] transition">Bespoke Alterations</Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-[#ff7000] transition">Saree Blouse & Couture</Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-[#ff7000] transition">Suit & Jacket Tapering</Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-[#ff7000] transition">Doorstep Measurements</Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-[#ff7000] transition">Garment Repairs & Restyling</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: The Journal */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb35f]">The Journal</p>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li>
                <Link href="/blogs" className="hover:text-[#ff7000] transition">All Articles</Link>
              </li>
              <li>
                <Link href="/blogs/the-art-of-the-perfect-saree-blouse-fit" className="hover:text-[#ff7000] transition">Saree Blouse Guide</Link>
              </li>
              <li>
                <Link href="/blogs/how-to-alter-a-mens-suit-jacket" className="hover:text-[#ff7000] transition">Suit Alteration Notes</Link>
              </li>
              <li>
                <Link href="/blogs/fabric-care-secrets-linen-silk-khadi" className="hover:text-[#ff7000] transition">Natural Fabric Care</Link>
              </li>
              <li>
                <Link href="/blogs/the-unseen-tailors-of-old-delhi" className="hover:text-[#ff7000] transition">The Master Tailor Guild</Link>
              </li>
              <li>
                <Link href="/blogs/why-doorstep-tailoring-needs-a-new-standard" className="hover:text-[#ff7000] transition">Our Manifesto</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Company & Craft */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb35f]">The Company</p>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li>
                <Link href="/about" className="hover:text-[#ff7000] transition">About Darji</Link>
              </li>
              <li>
                <Link href="/about#story" className="hover:text-[#ff7000] transition">Our Heritage Story</Link>
              </li>
              <li>
                <Link href="/about#ecosystem" className="hover:text-[#ff7000] transition">How It Works</Link>
              </li>
              <li>
                <Link href="/about#artisans" className="hover:text-[#ff7000] transition">Master Artisans</Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#ff7000] transition">Frequently Asked</Link>
              </li>
              <li>
                <a href="mailto:support@darji.in" className="hover:text-[#ff7000] transition">Support Desk</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Oversized Typographic Wordmark */}
        <div className="pt-12 pb-8 overflow-hidden select-none opacity-20 hover:opacity-30 transition duration-700">
          <p className="font-editorial text-[clamp(4.5rem,15vw,14rem)] font-black leading-none tracking-tight text-center text-white/90">
            DARJI • दर्ज़ी
          </p>
        </div>

        {/* Bottom Legal Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Darji Technologies Private Limited. Crafted with reverence for Indian tailoring traditions.</p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1 text-white/60">
              Made with <Heart className="h-3.5 w-3.5 text-[#ff7000] fill-[#ff7000]" /> in India
            </span>
            <Link href="/" className="hover:text-white transition">Privacy</Link>
            <Link href="/" className="hover:text-white transition">Terms</Link>
            <Link href="/" className="hover:text-white transition">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
