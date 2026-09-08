"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Heart } from "lucide-react";
import { BrandLogo } from "./brand-logo";

const footerGroups = [
  { title: "Services", links: [["Alterations", "/#services"], ["Custom Stitching", "/#services"], ["Measurements", "/#services"], ["Repairs & Restyling", "/#services"], ["Garment Care", "/#services"], ["Corporate Services", "/#services"]] },
  { title: "Company", links: [["About Us", "/blogs"], ["How It Works", "/blogs/the-art-of-the-perfect-saree-blouse-fit"], ["Why Darji", "/blogs/how-to-alter-a-mens-suit-jacket"], ["Careers", "/blogs/fabric-care-secrets-linen-silk-khadi"], ["Contact Us", "/blogs/the-unseen-tailors-of-old-delhi"], ["FAQs", "/#faq"]] },
  { title: "Support", links: [["Track Order", "/about"], ["Help Center", "/about#story"], ["Privacy Policy", "/about#ecosystem"], ["Terms of Service", "/about#artisans"], ["Refund Policy", "/#faq"], ["Shipping & Delivery", "mailto:support@darji.in"]] }
] as const;

export function EditorialFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const reduceMotion = useReducedMotion();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#080808] pb-10 pt-20 text-white">
      <div className="shell relative">
        <div className="grid gap-10 border-b border-white/12 pb-14 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/48"># The Darji Journal</p>
            <h2 className="mt-4 max-w-3xl font-editorial text-[clamp(2.3rem,4.2vw,4.2rem)] font-normal leading-[1.02] tracking-[-0.025em] text-white">Thoughts from the world of craftsmanship.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/62">Occasional notes on craftsmanship, care, fabric, and the people who make great work possible.</p>
          </div>
          <div>
            {subscribed ? (
              <div role="status" className="flex items-center gap-3 border border-white/16 bg-white/[0.04] p-5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
                <div><p className="text-sm font-bold text-white">You’re on the list.</p><p className="mt-1 text-xs text-white/58">The next dispatch will arrive in your inbox.</p></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input id="footer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" autoComplete="email" required className="min-h-14 flex-1 border border-white/18 bg-transparent px-5 text-sm text-white caret-white placeholder:text-white/38 focus:border-white/60 focus:outline-none" />
                <button type="submit" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 bg-white px-7 text-sm font-bold text-[#080808] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ededed]">Subscribe <ArrowRight className="h-4 w-4" /></button>
              </form>
            )}
            <p className="mt-3 text-xs text-white/38">No spam. Only useful insights, care guides, and occasional updates from Darji.</p>
          </div>
        </div>

        <div className="grid gap-10 border-b border-white/12 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" aria-label="Darji home" className="focus-ring inline-block"><BrandLogo imageClassName="h-14 w-auto brightness-0 invert" /></Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/58">We believe convenience should never come at the cost of quality. Darji connects customers with trusted experts through a simple doorstep experience.</p>
          </div>
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{group.title}</p>
              <ul className="mt-5 space-y-3 text-sm text-white/66">
                {group.links.map(([label, href]) => <li key={label}><Link href={href} className="focus-ring inline-block underline-offset-4 transition hover:text-white hover:underline">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>

        <div className="group/wordmark overflow-hidden border-b border-white/12 py-8 sm:py-12">
          <div className="flex flex-col leading-[0.78] sm:gap-2" aria-label="Darji, दर्ज़ी">
            <motion.span initial={reduceMotion ? false : { x: "-24%", opacity: 0.15 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reduceMotion ? 0 : 1.05, ease: [0.16, 1, 0.3, 1] }} className="font-editorial text-[clamp(4rem,13vw,12rem)] font-normal tracking-[-0.035em] text-white transition-[color,text-shadow] duration-500 group-hover/wordmark:[text-shadow:0_0_30px_rgba(255,255,255,0.42)]">Darji</motion.span>
            <motion.span initial={reduceMotion ? false : { x: "24%", opacity: 0.15 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reduceMotion ? 0 : 1.05, delay: reduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }} className="self-end font-editorial text-[clamp(3.6rem,11vw,10rem)] font-normal tracking-[-0.03em] text-white/70 transition-[color,text-shadow] duration-500 group-hover/wordmark:text-white group-hover/wordmark:[text-shadow:0_0_30px_rgba(255,255,255,0.42)]" lang="hi">दर्ज़ी</motion.span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-xs text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} Darji Technologies Private Limited. Crafted with respect for India’s tailoring traditions.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <span className="inline-flex items-center gap-1">Made with <Heart className="h-3.5 w-3.5 fill-white text-white" /> in India</span>
            <Link href="/privacy" className="focus-ring transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="focus-ring transition hover:text-white">Terms</Link>
            <Link href="/security" className="focus-ring transition hover:text-white">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
