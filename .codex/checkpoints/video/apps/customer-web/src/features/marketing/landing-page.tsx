"use client";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Apple, ArrowRight, ChevronDown, Clock3, MapPin, Phone, Play, Star } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/src/components/brand-logo";
import { SectionEyebrow } from "@/src/components/ui";
import { faq } from "@/src/lib/static-data";
import { PremiumHero } from "./premium-hero";
import { VideoSection } from "./video-section";

const serviceCards = [
  { title: "Stitching", copy: "Custom stitching for men, women and kids.", image: "/animations/service-custom-stitching.png" },
  { title: "Alterations", copy: "Perfect fit adjustments for any outfit.", image: "/animations/service-alterations.png" },
  { title: "Pressing", copy: "Neat, crisp and wrinkle-free.", image: "/animations/service-mens-wear.png" },
  { title: "Repairs", copy: "Fix tears, holes and all kinds of damage.", image: "/animations/service-repairs.png" },
  { title: "Other Services", copy: "Patching, hemming, zipper change and more.", image: "/animations/buttons.png" }
];

const testimonials = [
  { quote: "Amazing stitching and perfect fitting. Super quick delivery too!", name: "Rohan Verma", initials: "RV", color: "#f97316" },
  { quote: "Very neat press and packaging. Clothes look brand new!", name: "Neha Singh", initials: "NS", color: "#0b2241" },
  { quote: "Got my jeans altered perfectly. Fit is just right now. Thanks Darji!", name: "Arjun Mehta", initials: "AM", color: "#be123c" },
  { quote: "Reliable, fast and very professional service.", name: "Pooja Sharma", initials: "PS", color: "#047857" }
];

function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.12,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.86
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    lenis.on("scroll", ScrollTrigger.update);
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}

function IntroReveal() {
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    const fill = document.querySelector<HTMLDivElement>("#loader .fill");
    const percent = document.getElementById("percent");
    if (!fill || !percent) return;

    document.body.style.overflow = "hidden";

    gsap.set("#loader", { yPercent: 0, force3D: true });
    gsap.set("#curtain2", { yPercent: 0, force3D: true });
    gsap.set("#site .darji-navbar", { opacity: 0, y: 20, force3D: true });
    gsap.set("#site .darji-hero-title", { opacity: 0, y: 50, filter: "blur(8px)", force3D: true });
    gsap.set("#site .darji-hero-copy", { opacity: 0, y: 20, force3D: true });
    gsap.set("#site .darji-hero-kicker", { opacity: 0, y: 20, force3D: true });
    gsap.set("#site .darji-hero-buttons > *", { opacity: 0, y: 20, force3D: true });
    gsap.set("#site .darji-hero-trust", { opacity: 0, y: 20, force3D: true });
    gsap.set("#site .darji-hero-social", { opacity: 0, y: 20, force3D: true });
    gsap.set("#site .darji-hero-image", { opacity: 0, scale: 0.97, force3D: true });

    let p = 0;
    intervalRef.current = window.setInterval(() => {
      p += 1;
      fill.style.width = `${p}%`;
      percent.textContent = `${p}%`;

      if (p >= 100) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;

        timeoutRef.current = window.setTimeout(() => {
          const tl = gsap.timeline();
          timelineRef.current = tl;

          tl.to("#loader", { yPercent: -100, duration: 0.9, ease: "expo.inOut", force3D: true })
            .to("#curtain2", { yPercent: -100, duration: 1, ease: "expo.inOut", force3D: true }, "-=0.72")
            .fromTo("#site .darji-navbar", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.2")
            .fromTo("#site .darji-hero-kicker", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.4")
            .fromTo("#site .darji-hero-title", { y: 50, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8 }, "-=0.2")
            .fromTo("#site .darji-hero-copy", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.5")
            .fromTo("#site .darji-hero-buttons > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, "-=0.4")
            .fromTo("#site .darji-hero-trust", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06 }, "-=0.35")
            .fromTo("#site .darji-hero-social", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.35")
            .fromTo("#site .darji-hero-image", { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.8 }, "-=0.45")
            .add(() => {
              document.body.style.overflow = "auto";
            });
        }, 250);
      }
    }, 20);

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timelineRef.current?.kill();
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <div id="curtain2" />
      <div id="loader">
        <BrandLogo className="logo" imageClassName="loader-logo-image" />
        <p>Stitching your experience...</p>
        <div className="bar"><div className="fill" /></div>
        <div id="percent">0%</div>
      </div>
    </>
  );
}
function StoreButton({ type }: { type: "play" | "apple" }) {
  const isPlay = type === "play";
  const Icon = isPlay ? Play : Apple;

  return (
    <button className="store-button" type="button" aria-label={isPlay ? "Get it on Google Play" : "Download on the App Store"}>
      <Icon className="fill-current" />
      <span className="store-button-copy">
        <span className="store-button-kicker">{isPlay ? "GET IT ON" : "Download on the"}</span>
        <span className="store-button-name">{isPlay ? "Google Play" : "App Store"}</span>
      </span>
    </button>
  );
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  return (
    <>
      <main id="site">
        <SmoothScroll />
        <PremiumHero heroRef={heroRef} />
        <VideoSection />

        <section id="services" className="bg-white py-16">
          <div className="shell text-center">
            <SectionEyebrow>Our Services</SectionEyebrow>
            <h2 className="mx-auto max-w-4xl text-3xl font-black leading-tight sm:text-5xl">All Your Clothing Needs, Handled With Care</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--darji-muted)]">From simple repairs to perfect alterations, we make it effortless.</p>
            <div className="mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
              {serviceCards.map((service, index) => (
                <motion.article
                  key={service.title}
                  initial={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(10px)" }}
                  whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="reference-service-card"
                >
                  <div className="reference-service-image"><img src={service.image} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} /></div>
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                </motion.article>
              ))}
            </div>
            <a href="/dashboard" className="focus-ring mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--darji-orange)] bg-white px-6 text-sm font-black text-[var(--darji-orange)] transition hover:-translate-y-0.5">
              View All Services <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="shell">
            <div className="app-download-banner">
              <div className="app-download-copy">
                <h2>The <span>Darji</span> App</h2>
                <p>Book, track and manage your orders easily.</p>
                <div className="app-store-actions"><StoreButton type="play" /><StoreButton type="apple" /></div>
              </div>
              <div className="app-download-phone"><div className="phone-shell"><img src="/darji-logo.png" alt="Darji" /><p>Tailoring Picked Up<br />From Your Doorstep</p><div className="phone-bag" /></div></div>
              <div className="app-download-qr"><span /><p>Scan to Download<br />the <strong>Darji</strong> App</p></div>
            </div>
          </div>
        </section>

        <section className="bg-white py-10">
          <div className="shell text-center">
            <SectionEyebrow>What Our Customers Say</SectionEyebrow>
            <h2 className="text-3xl font-black leading-tight sm:text-5xl">Loved By Thousands</h2>
            <div className="testimonial-marquee mt-8">
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <article key={`${testimonial.name}-${index}`} className="reference-testimonial-card testimonial-card">
                  <div className="flex gap-1 text-[var(--darji-orange)]">{Array.from({ length: 5 }).map((_, starIndex) => <Star key={starIndex} className="h-4 w-4 fill-current" />)}</div>
                  <p className="mt-4 text-sm font-semibold leading-7 text-[var(--darji-ink)]">&quot;{testimonial.quote}&quot;</p>
                  <div className="mt-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white text-xs font-black text-white shadow-[0_12px_24px_rgba(8,17,31,0.12)]" style={{ backgroundColor: testimonial.color }}>{testimonial.initials}</span><span className="text-left"><span className="block text-sm font-black text-[var(--darji-ink)]">{testimonial.name}</span><span className="block text-xs font-semibold text-[var(--darji-muted)]">Customer</span></span></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="shell py-20">
          <div className="text-center"><SectionEyebrow>FAQs</SectionEyebrow><h2 className="text-3xl font-black leading-tight sm:text-5xl">Frequently Asked Questions</h2></div>
          <div className="mx-auto mt-8 max-w-6xl"><div className="grid gap-3 md:grid-cols-2">
            {faq.map(([question, answer], index) => (
              <button key={question} onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="focus-ring rounded-lg border border-[#e6edf5] bg-white p-4 text-left shadow-sm">
                <span className="flex items-center justify-between gap-4 text-sm font-black">{question}<ChevronDown className={`h-5 w-5 transition ${openFaq === index ? "rotate-180" : ""}`} /></span>
                {openFaq === index ? <span className="mt-3 block text-sm font-semibold leading-6 text-[var(--darji-muted)]">{answer}</span> : null}
              </button>
            ))}
          </div></div>
        </section>

        <footer className="border-t-2 border-[var(--darji-orange)] bg-[var(--darji-ink)] py-12">
          <div className="shell grid gap-8 text-white md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div><BrandLogo imageClassName="h-[72px] w-auto" /><p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/70">Your trusted tailoring partner. Picked up from your doorstep, delivered with perfection.</p></div>
            <div><h3 className="font-black">Quick Links</h3><div className="mt-4 grid gap-2 text-sm font-bold text-white/70">{["Home", "Services", "FAQs", "About Us"].map((item) => <a key={item} href="#" className="transition hover:text-white">{item}</a>)}</div></div>
            <div><h3 className="font-black">Support</h3><div className="mt-4 grid gap-2 text-sm font-bold text-white/70">{["Help Center", "Contact Us", "Privacy Policy", "Terms & Conditions"].map((item) => <a key={item} href="#" className="transition hover:text-white">{item}</a>)}</div></div>
            <div><h3 className="font-black">Contact Us</h3><div className="mt-4 grid gap-3 text-sm font-bold text-white/70">{[[Phone, "+91 98765 43210"], [MapPin, "New Delhi, India"], [Clock3, "Pickup in 30 min average"]].map(([Icon, item]) => { const ContactIcon = Icon as typeof Phone; return <span key={String(item)} className="flex items-center gap-2"><ContactIcon className="h-4 w-4 text-[var(--darji-orange)]" />{String(item)}</span>; })}</div></div>
          </div>
          <div className="shell mt-8 border-t border-white/10 pt-5 text-center text-xs font-bold text-white/50">&copy; 2026 Darji. All rights reserved.</div>
        </footer>
      </main>
      <IntroReveal />
    </>
  );
}



