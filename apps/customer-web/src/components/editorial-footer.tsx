"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { customerApi, errorMessage } from "@/src/lib/api";

const footerNavigation = {
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/#services" },
    { label: "FAQs", href: "/#faq" },
    { label: "How It Works", href: "/about#ecosystem" }
  ],
  story: [
    { label: "About Darji", href: "/about" },
    { label: "Founder Story", href: "/blogs/founder-story-darji" },
    { label: "The Darji Journal", href: "/blogs" }
  ],
  support: [
    { label: "Help Center & FAQs", href: "/#faq" },
    { label: "Email Support", href: "mailto:help.darji@gmail.com" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security Standards", href: "/security" }
  ]
};

const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/getdarji/",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    )
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61590838075448",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  },
  {
    name: "Reddit",
    href: "https://www.reddit.com/user/darji_hq/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-4.723 4.195a.42.42 0 0 0-.11.58c.45.69 1.3 1.15 2.083 1.15.783 0 1.632-.46 2.084-1.15a.42.42 0 0 0-.7-.464c-.312.477-.92.814-1.384.814-.464 0-1.073-.337-1.384-.814a.42.42 0 0 0-.589-.116z" />
      </svg>
    )
  },
  {
    name: "Threads",
    href: "https://www.threads.com/@getdarji",
    icon: (
      <img src="/social/thread.png" alt="" className="h-5 w-5 object-contain" />
    )
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/131224165/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    )
  },
  {
    name: "Medium",
    href: "https://medium.com/@darji.com",
    icon: (
      <img src="/social/medium.png" alt="" className="h-5 w-5 object-contain" />
    )
  },
  {
    name: "Pinterest",
    href: "https://in.pinterest.com/getdarji/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.49.02-3.56l1.24-5.26s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.28-1.95 3.28-4.77 0-2.49-1.79-4.23-4.35-4.23-2.96 0-4.7 2.22-4.7 4.51 0 .89.34 1.85.77 2.37a.38.38 0 0 1 .09.36c-.1.4-.31 1.25-.35 1.42-.05.23-.18.28-.41.17-1.53-.71-2.49-2.94-2.49-4.73 0-3.85 2.8-7.39 8.07-7.39 4.24 0 7.53 3.02 7.53 7.06 0 4.21-2.65 7.6-6.33 7.6-1.24 0-2.4-.64-2.8-1.4l-.76 2.9c-.28 1.06-1.02 2.39-1.52 3.2A12 12 0 1 0 12 0z" />
      </svg>
    )
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@getdarji",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  },
  {
    name: "X",
    href: "https://x.com/darji_official",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
];

const darjiChars = ["D", "A", "R", "J", "I"];

export function EditorialFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (!wordRef.current || !wrapperRef.current) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(wordRef.current, { xPercent: 0 });
        return;
      }

      gsap.fromTo(wordRef.current, { xPercent: -12 }, {
        xPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.25,
          invalidateOnRefresh: true
        }
      });
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setSubscribeError("");
    try {
      await customerApi.createMarketingSignup({ source: "footer_newsletter", email: email.trim() });
      setSubscribed(true);
    } catch (error) {
      setSubscribeError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#080808] pb-10 pt-20 text-white">
      <div className="shell relative">
        {/* TOP SECTION: NEWSLETTER / MANIFESTO */}
        <div className="grid gap-10 border-b border-white/12 pb-14 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff7000]">
              # The Darji Journal
            </p>
            <h2 className="mt-4 max-w-3xl font-editorial text-[clamp(2.3rem,4.2vw,4.2rem)] font-normal leading-[1.02] tracking-[-0.025em] text-white">
              Thoughts from the world of craftsmanship.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65">
              Occasional notes on craftsmanship, care, fabric, and the people who make great work possible. Delivered straight to your inbox.
            </p>
          </div>
          <div>
            {subscribed ? (
              <div role="status" className="flex items-center gap-3 rounded-2xl border border-[#ff7000]/40 bg-[#ff7000]/10 p-5 backdrop-blur-md">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[#ff7000]" />
                <div>
                  <p className="text-sm font-bold text-white">You’re on the list.</p>
                  <p className="mt-1 text-xs text-white/60">The next dispatch will arrive in your inbox.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="footer-email" className="sr-only">Email address</label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  disabled={submitting}
                  required
                  className="min-h-14 flex-1 rounded-xl border border-white/18 bg-white/[0.03] px-5 text-sm text-white caret-white placeholder:text-white/38 transition focus:border-[#ff7000] focus:bg-white/[0.06] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-[#080808] shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-[#ff7000] hover:text-white active:translate-y-0 disabled:cursor-wait disabled:opacity-65"
                >
                  {submitting ? "Subscribing…" : "Subscribe"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
            {subscribeError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#ffb35f]">Could not subscribe: {subscribeError}</p> : null}
            <p className="mt-3 text-xs text-white/40">
              No spam. Only useful insights, garment care guides, and occasional updates from Darji.
            </p>
          </div>
        </div>

        {/* MIDDLE SECTION: BRAND DETAILS + NAVIGATION COLUMNS */}
        <div className="grid gap-10 border-b border-white/12 py-14 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Contact Column */}
          <div className="lg:col-span-2">
            <Link href="/" aria-label="Darji home" className="focus-ring inline-block">
              <BrandLogo imageClassName="h-14 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60 font-medium">
              Your trusted tailoring partner. Picked up from your doorstep, handcrafted by master artisans, delivered with perfection.
            </p>

            {/* Direct Contact & Trust Badges */}
            <div className="mt-6 space-y-3 text-sm font-medium text-white/75">
              <a
                href="tel:+919971416471"
                className="flex items-center gap-3 transition hover:text-[#ff7000]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#ff7000]">
                  <Phone className="h-4 w-4" />
                </div>
                <span>+91 9971416471</span>
              </a>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#ff7000]">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Delhi &amp; Gurugram</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#ff7000]">
                  <Truck className="h-4 w-4" />
                </div>
                <span>Doorstep pickup &amp; return</span>
              </div>

              <a
                href="mailto:help.darji@gmail.com"
                className="flex items-center gap-3 transition hover:text-[#ff7000]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#ff7000]">
                  <Mail className="h-4 w-4" />
                </div>
                <span>help.darji@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <nav aria-label="Quick Links">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7000]">
              Quick Links
            </p>
            <ul className="mt-5 space-y-3 text-sm text-white/65">
              {footerNavigation.quickLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="focus-ring inline-block transition hover:text-white hover:translate-x-1 duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Story and journal */}
          <nav aria-label="Our Story">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7000]">
              Our Story
            </p>
            <ul className="mt-5 space-y-3 text-sm text-white/65">
              {footerNavigation.story.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="focus-ring inline-block transition hover:text-white hover:translate-x-1 duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Support & Legal */}
          <nav aria-label="Support & Legal">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7000]">
              Support & Legal
            </p>
            <ul className="mt-5 space-y-3 text-sm text-white/65">
              {footerNavigation.support.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="focus-ring inline-block transition hover:text-white hover:translate-x-1 duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* SOCIAL MEDIA CHANNELS BAR */}
        <div className="border-b border-white/12 py-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 text-center sm:text-left">
                Follow & Connect With Us
              </p>
              <p className="mt-1 text-sm text-white/70 text-center sm:text-left">
                Behind the scenes, styling tips, craftsmanship stories & community dispatches.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit Darji on ${social.name}`}
                  className="group flex h-11 w-11 items-center justify-center rounded-xl border border-white/14 bg-white/[0.04] text-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-[#ff7000] hover:bg-[#ff7000] hover:text-white hover:shadow-[0_8px_20px_rgba(255,112,0,0.3)]"
                  title={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* MDX-STYLE LARGE ANIMATED TYPOGRAPHY D A R J I */}
        <div
          ref={wrapperRef}
          className="overflow-hidden border-b border-white/12 py-14 sm:py-24 select-none"
        >
          <div
            ref={wordRef}
            className="mx-auto grid w-full max-w-7xl grid-cols-5 px-1 sm:px-3"
            aria-label="DARJI"
          >
            {darjiChars.map((char, index) => (
              <div
                key={index}
                className="inline-flex min-w-0 items-center justify-center overflow-hidden text-center"
              >
                <span className="inline-block font-sans text-[clamp(4rem,13vw,11rem)] font-black leading-[0.8] text-white transition-transform duration-300 hover:scale-105">
                  {char}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM COPYRIGHT & LEGAL BAR */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Darji Technologies Private Limited. Crafted with respect for India’s tailoring traditions.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <span className="inline-flex items-center gap-1.5 text-white/70">
              Made with <Heart className="h-3.5 w-3.5 fill-[#ff7000] text-[#ff7000]" /> in India
            </span>
            <Link href="/privacy" className="focus-ring transition hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="focus-ring transition hover:text-white">Terms of Service</Link>
            <Link href="/security" className="focus-ring transition hover:text-white">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
