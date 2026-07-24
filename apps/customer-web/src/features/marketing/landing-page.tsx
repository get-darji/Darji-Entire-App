"use client";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowRight, Clock3, Headphones, MapPin, Minus, Phone, Plus, Sparkles, Star, Coins, ShieldCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandLogo } from "@/src/components/brand-logo";
import { SectionEyebrow } from "@/src/components/ui";
import BorderGlow from "@/src/components/border-glow";
import FlowingMenu from "@/src/components/flowing-menu";
import TiltedCard from "@/src/components/tilted-card";
import { HowItWorksSection } from "./steps-animation";
import { PremiumHero } from "./premium-hero";
import { VideoSection } from "./video-section";

const serviceCards = [
  {
    title: "Stitching",
    copy: "Made-to-measure tailoring for everyday and occasion wear.",
    detail: "Blouses, kurtas, suits, uniforms",
    image: "/service-icons/stitching.png"
  },
  {
    title: "Alterations",
    copy: "Precise size fixes for cleaner fit and better comfort.",
    detail: "Waist, sleeve, hem, shoulder",
    image: "/service-icons/alteration.png"
  },
  {
    title: "Pressing",
    copy: "Sharp finishing that keeps garments neat and ready to wear.",
    detail: "Steam press with wrinkle-free finish",
    image: "/service-icons/pressing.png"
  },
  {
    title: "Repairs",
    copy: "Careful repair work that extends the life of your clothes.",
    detail: "Tears, seams, hooks and patchwork",
    image: "/service-icons/repairs.png"
  },
  {
    title: "Other Services",
    copy: "Small clothing fixes handled with the same attention to detail.",
    detail: "Zippers, buttons, lining, hemming",
    image: "/service-icons/other-services.png"
  }
];

const flowMenuItems = [
  {
    link: "/dashboard",
    text: "Doorstep Convenience : We come to you. No travel. No waiting.",
    image: "/flow-icons/doorstep-convenience.png"
  },
  {
    link: "/dashboard",
    text: "Expert Craftsmanship : Skilled tailors. Precise craftsmanship.",
    image: "/flow-icons/expert-craftsmanship.png"
  },
  {
    link: "/dashboard",
    text: "Transparent Pricing : Know the price before the work begins.",
    image: "/flow-icons/transparent-pricing.png"
  },
  {
    link: "/dashboard",
    text: "Quality Checked : Every order is checked before it reaches you.",
    image: "/flow-icons/quality-checked.png"
  }
];

const testimonials = [
  { quote: "Amazing stitching and perfect fitting. Super quick delivery too!", name: "Rohan Verma", initials: "RV", color: "#f97316" },
  { quote: "Very neat press and packaging. Clothes look brand new!", name: "Neha Singh", initials: "NS", color: "#0b2241" },
  { quote: "Got my jeans altered perfectly. Fit is just right now. Thanks Darji!", name: "Arjun Mehta", initials: "AM", color: "#be123c" },
  { quote: "Reliable, fast and very professional service.", name: "Pooja Sharma", initials: "PS", color: "#047857" }
];

function SmoothScroll() {
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    if (window.matchMedia("(max-width: 1023px)").matches) return;

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
    const mobileIntro = window.matchMedia("(max-width: 1023px)").matches;

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
            .add(() => {
              if (mobileIntro) document.body.style.overflow = "auto";
            })
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
        <div className="logo"><img src="/darji-loader-transparent.png" alt="Darji" className="loader-logo-image loader-logo-black" /></div>
        <p className="loader-tagline">stitching you web experience </p>
        <div className="bar"><div className="fill" /></div>
        <div id="percent">0%</div>
      </div>
    </>
  );
}


function PlayStoreLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 466 511.98" className={className}>
      <path fill="#EA4335" d="M199.9 237.8 1.4 470.17c7.22 24.57 30.16 41.81 55.8 41.81 11.16 0 20.93-2.79 29.3-8.37l244.16-139.46L199.9 237.8z"/>
      <path fill="#FBBC04" d="m433.91 205.1-104.65-60-111.61 110.22 113.01 108.83 104.64-58.6c18.14-9.77 30.7-29.3 30.7-50.23-1.4-20.93-13.95-40.46-32.09-50.22z"/>
      <path fill="#34A853" d="M199.42 273.45 329.27 145.1 87.9 8.37C79.53 2.79 68.36 0 57.2 0 30.7 0 6.98 18.14 1.4 41.86l198.02 231.59z"/>
      <path fill="#4285F4" d="M1.39 41.86C0 46.04 0 51.63 0 57.2v397.64c0 5.57 0 9.76 1.4 15.34l216.27-214.86L1.39 41.86z"/>
    </svg>
  );
}

function AppleStoreLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 170" className={className} fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.36-6.13-3.09-2.52-6.94-7.05-11.53-13.59-6.07-8.87-10.84-18.77-14.3-29.7-3.46-10.93-5.19-21.43-5.19-31.5 0-14.96 4.06-27.02 12.18-36.19 8.12-9.17 17.55-13.82 28.3-13.95 5.01.13 10.15 1.54 15.42 4.25 5.27 2.7 9.17 4.06 11.69 4.06 2.01 0 6.07-1.49 12.18-4.48 6.12-2.99 11.5-4.38 16.14-4.18 17.15 1.54 30.01 7.97 38.58 19.3-14.54 8.79-21.68 20.67-21.43 35.65.25 11.57 4.64 21.2 13.16 28.91 8.52 7.7 18.66 11.89 30.43 12.56-2.13 6.13-4.76 11.96-7.89 17.48zM119.22 30.05c0-8.13 2.93-15.65 8.79-22.58 5.86-6.93 13.06-11.19 21.6-12.77.25 8.13-2.69 15.74-8.79 22.84-6.11 7.09-13.43 11.45-21.6 13.07-.13-1.01-.2-2.12-.2-3.16z"/>
    </svg>
  );
}

function StoreButton({ type }: { type: "play" | "apple" }) {
  const isPlay = type === "play";
  const Logo = isPlay ? PlayStoreLogo : AppleStoreLogo;

  return (
    <BorderGlow
      className="store-button-glow"
      edgeSensitivity={12}
      glowColor={isPlay ? "28 94 61" : "0 0 100"}
      backgroundColor="#05070a"
      borderRadius={14}
      glowRadius={42}
      glowIntensity={1.8}
      coneSpread={22}
      colors={isPlay ? ["#34a853", "#fbbc05", "#ea4335", "#4285f4"] : ["#ffffff", "#cccccc", "#888888"]}
    >
      <button className="store-button" type="button" aria-label={isPlay ? "Get it on Google Play" : "Download on the App Store"}>
        <Logo className="h-6 w-6 object-contain" />
        <span className="store-button-copy">
          <span className="store-button-kicker">{isPlay ? "GET IT ON" : "Download on the"}</span>
          <strong className="store-button-name">{isPlay ? "Google Play" : "App Store"}</strong>
        </span>
      </button>
    </BorderGlow>
  );
}

const faqList = [
  {
    question: "How does Darji work?",
    answer: "Upload a photo of your clothing or describe your tailoring need. Our verified tailors will review your request and send you the best offers. Choose your tailor, confirm, and we'll handle the pickup and delivery."
  },
  {
    question: "How much does the service cost?",
    answer: "Pricing depends on the service required. We provide transparent upfront quotes from local tailors with platform fees and delivery charges clearly shown before you pay. No hidden costs."
  },
  {
    question: "How long does the tailoring take?",
    answer: "Standard tailoring and alterations take 3 to 5 days. For urgent requests, express options are available at checkout to get your garments back faster."
  },
  {
    question: "Is pickup and delivery really free?",
    answer: "Yes! We offer free pickup and doorstep delivery for all standard tailoring orders above a minimum basket size, handled by our verified delivery partners."
  },
  {
    question: "Can I track my order?",
    answer: "Yes, you can track every step of your order in real-time from the dashboard, including driver pickup, tailor work progress, quality checks, and delivery dispatch."
  },
  {
    question: "What if I'm not satisfied with the stitching?",
    answer: "Your satisfaction is our priority. If the fit or stitching isn't perfect, request a free re-alteration within 7 days of delivery, and we will pick it up and fix it."
  },
  {
    question: "How do I make a payment?",
    answer: "We accept all major credit cards, debit cards, UPI, net banking, and digital wallets. Cash on delivery is also supported in select pin codes."
  }
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLElement>(null);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://darji.in/#organization",
    "name": "Darji",
    "url": "https://darji.in",
    "logo": "https://darji.in/darji-logo-cropped.png",
    "sameAs": ["https://twitter.com/darjiapp"]
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://darji.in/#localbusiness",
    "name": "Darji Doorstep Tailoring",
    "image": "https://darji.in/og-image.png",
    "telephone": "+919876543210",
    "url": "https://darji.in",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "New Delhi",
      "addressCountry": "IN"
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://darji.in/#website",
    "name": "Darji",
    "url": "https://darji.in"
  };

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://darji.in/#webpage",
    "url": "https://darji.in",
    "name": "Darji | Doorstep Tailoring Picked Up & Delivered",
    "description": "Premium doorstep tailoring, alterations, repairs, and custom stitching from verified local tailors.",
    "isPartOf": {
      "@id": "https://darji.in/#website"
    },
    "about": {
      "@id": "https://darji.in/#organization"
    }
  };

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqList.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            organizationSchema,
            localBusinessSchema,
            websiteSchema,
            webpageSchema,
            faqPageSchema
          ])
        }}
      />
      <main id="site">
        <SmoothScroll />
        <PremiumHero heroRef={heroRef} />
        <VideoSection />
        <HowItWorksSection />

        <section id="services" className="relative overflow-hidden bg-white py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,112,0,0.06),transparent_58%)]" />
          <div className="shell relative text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <SectionEyebrow>Our Services</SectionEyebrow>
              <h2 className="mx-auto mt-1 max-w-4xl text-3xl font-extrabold leading-tight text-[var(--color-text-primary)] sm:text-5xl">All Your Clothing Needs, Handled With Care</h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg font-medium leading-relaxed text-[var(--color-text-secondary)] sm:text-xl">From simple repairs to perfect alterations, we make every step feel premium.</p>
            </motion.div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {serviceCards.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(10px)" }}
                  whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex justify-center"
                >
                  <TiltedCard
                    imageSrc={service.image}
                    altText={service.title}
                    captionText={service.title}
                    containerHeight="320px"
                    containerWidth="100%"
                    imageHeight="100%"
                    imageWidth="100%"
                    rotateAmplitude={11}
                    scaleOnHover={1.035}
                    showMobileWarning={false}
                    showTooltip={false}
                    displayOverlayContent={true}
                    className="w-full max-w-[245px]"
                    imageClassName="h-full w-full rounded-[18px] object-cover object-center brightness-[0.92] contrast-[1.05]"
                    overlayContent={
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]">
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#fff7ed]/78 via-[#fff7ed]/12 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black via-black/82 to-transparent" />
                        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3 text-left">
                          <span className="inline-flex rounded-full border border-white/40 bg-[linear-gradient(180deg,rgba(255,248,240,0.95)_0%,rgba(245,224,197,0.92)_100%)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#0b2241] shadow-[0_10px_22px_rgba(255,255,255,0.16),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(186,132,72,0.22)] [transform:translateZ(44px)]">
                            {index === 0 ? "Custom fit" : index === 1 ? "Clean finish" : index === 2 ? "Fresh press" : index === 3 ? "Longer wear" : "Fine details"}
                          </span>
                          <span className="rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(255,186,112,0.72)_0%,rgba(120,73,36,0.42)_100%)] px-2.5 py-1 text-[11px] font-black tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm [transform:translateZ(52px)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 text-left text-white">
                          <div className="max-w-[88%] rounded-[18px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_55%)]">
                            <h3 className="text-[1.85rem] font-black leading-[0.92] text-white drop-shadow-[0_10px_26px_rgba(0,0,0,0.34)]">{service.title}</h3>
                            <p className="mt-2.5 max-w-[92%] text-[13px] font-semibold leading-6 text-white/92">{service.copy}</p>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] leading-6 text-white/78">{service.detail}</p>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </motion.div>
              ))}
            </div>
            <a href="/dashboard" className="focus-ring mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--darji-orange)] bg-white px-6 text-sm font-black text-[var(--darji-orange)] transition hover:-translate-y-0.5 hover:bg-[#fff7f0]">
              View All Services <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>


        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto w-[min(1120px,calc(100%-28px))]">
            <div className="mb-6 text-center">
              <SectionEyebrow>Why Choose Darji ?</SectionEyebrow>
              <h2 className="mx-auto mt-1 max-w-4xl text-3xl font-extrabold leading-tight text-[var(--color-text-primary)] sm:text-5xl">Tailoring made easier, sharper, and more reliable.</h2>
              <p className="mx-auto mt-3 max-w-3xl text-base font-semibold leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">Four reasons customers keep choosing Darji for tailoring, alterations, pressing, and repairs.</p>
            </div>
            
            {/* Redesigned 4-column layout replacing the scrolling FlowingMenu */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Doorstep Convenience", description: "We come to you. No travel. No waiting.", icon: MapPin },
                { title: "Expert Craftsmanship", description: "Skilled tailors. Precise craftsmanship.", icon: Sparkles },
                { title: "Transparent Pricing", description: "Know the price before the work begins.", icon: Coins },
                { title: "Quality Checked", description: "Every order is checked before it reaches you.", icon: ShieldCheck }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-sm transition hover:border-[#ffd5ad] hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold text-[var(--color-text-primary)]">{item.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--color-text-secondary)]">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="download-app" className="bg-white py-16 sm:py-24">
          <div className="shell">
            <div className="relative overflow-hidden rounded-[32px] bg-[#0c101a] px-6 py-12 shadow-xl sm:px-12 sm:py-16 md:px-16 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:items-center">
              {/* Decorative radial glows */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,112,0,0.15),transparent_70%)]" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,112,0,0.08),transparent_70%)]" />

              <div className="relative z-10 flex flex-col justify-center text-left">
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Darji Mobile Experience
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-[1.1]">
                  Download the Darji app and manage every tailoring order in one place.
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
                  Book pickups, track progress, chat with your tailor, and reorder your favorite services without leaving the app.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <StoreButton type="play" />
                  <StoreButton type="apple" />
                </div>
              </div>

              {/* Right side: Mock iPhone */}
              <div className="relative z-10 mt-12 flex justify-center lg:mt-0">
                <div className="relative h-[460px] w-[250px] shrink-0 overflow-hidden rounded-[36px] border-[6px] border-[#222222] bg-[#0c101a] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
                  {/* Phone notch */}
                  <div className="absolute left-1/2 top-0 h-4 w-28 -translate-x-1/2 rounded-b-xl bg-[#222222] z-30" />
                  
                  {/* Phone screen */}
                  <div className="flex h-full w-full flex-col bg-[#faf9f6] p-4 pt-6 text-[var(--color-text-primary)]">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <img src="/darji transparent.png" alt="Darji" className="h-5 object-contain" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                    </div>

                    {/* Active Order Card */}
                    <div className="mt-4 rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_12px_rgba(9,13,22,0.03)] text-left">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-primary)]">Active Order</p>
                      <h4 className="mt-1 text-sm font-extrabold text-[#090d16]">Stitching Blazer</h4>
                      
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Tailoring Stage</span>
                        <span className="text-[var(--color-primary)] font-bold">3 of 5 completed</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full w-[60%] rounded-full bg-[var(--color-primary)]" />
                      </div>
                    </div>

                    {/* Delivery Route Card */}
                    <div className="mt-3 flex flex-1 flex-col justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_12px_rgba(9,13,22,0.03)] text-left">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Tailor Delivery Route</p>
                      
                      {/* Map graphic (SVG) */}
                      <div className="my-2 flex-1 relative min-h-24 bg-[#fffaf5] rounded-lg border border-orange-50/50 overflow-hidden flex items-center justify-center">
                        <svg className="w-full h-full max-h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Dotted path line */}
                          <path d="M15 65 C 25 65, 40 15, 80 20" stroke="var(--color-primary)" strokeWidth="2.5" strokeDasharray="3 3" strokeLinecap="round" />
                          {/* Starting point */}
                          <circle cx="15" cy="65" r="4.5" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
                          {/* Ending point */}
                          <circle cx="80" cy="20" r="4.5" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
                          <circle cx="80" cy="20" r="8" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="2 2" className="animate-pulse" />
                        </svg>
                      </div>

                      <div className="flex items-center justify-between border-t border-dashed border-gray-100 pt-2 text-[10px] font-bold text-[#090d16]">
                        <span>ETA: 12 mins</span>
                        <svg className="h-3.5 w-3.5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="2" width="14" height="20" rx="2" />
                          <path d="M12 18h.01" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-24">
          <div className="shell text-center">
            <SectionEyebrow>What Our Customers Say</SectionEyebrow>
            <h2 className="mx-auto max-w-4xl text-3xl font-extrabold leading-tight text-[var(--color-text-primary)] sm:text-5xl">
              Loved by thousands,<br />stitched with <span className="text-[var(--color-primary)]">trust.</span>
            </h2>
            <div className="flex items-center justify-center gap-4 mt-5">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#eee4dc]" />
              <svg className="h-5 w-5 text-[#ff7000]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C12 2 8 6 8 10C8 14.5 12 16 12 22" />
                <path d="M12 22C12 22 16 18 16 14C16 9.5 12 8 12 2" />
              </svg>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#eee4dc]" />
            </div>
            
            <div className="testimonial-marquee-wrapper mt-10">
              <div className="testimonial-marquee-track">
                {/* First set for scrolling */}
                <div className="testimonial-group">
                  {[...testimonials, ...testimonials].map((testimonial, index) => (
                    <article key={`t1-${testimonial.name}-${index}`} className="reference-testimonial-card testimonial-card relative flex flex-col justify-between overflow-hidden">
                      <span className="absolute top-4 right-4 text-7xl font-serif text-[#ff7000]/12 select-none pointer-events-none">&rdquo;</span>
                      <div>
                        <div className="flex gap-1 text-[var(--darji-orange)]">
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <Star key={`s1-${starIndex}`} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                        <p className="mt-4 text-sm font-semibold leading-7 text-[#08111f]">
                          &quot;{testimonial.quote}&quot;
                        </p>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white text-xs font-black text-white shadow-[0_12px_24px_rgba(8,17,31,0.12)]" style={{ backgroundColor: testimonial.color }}>
                          {testimonial.initials}
                        </span>
                        <span className="text-left">
                          <span className="block text-sm font-black text-[#08111f]">{testimonial.name}</span>
                          <span className="block text-xs font-semibold text-[var(--darji-muted)]">Customer</span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* Duplicate set for seamless scrolling */}
                <div className="testimonial-group" aria-hidden="true">
                  {[...testimonials, ...testimonials].map((testimonial, index) => (
                    <article key={`t2-${testimonial.name}-${index}`} className="reference-testimonial-card testimonial-card relative flex flex-col justify-between overflow-hidden">
                      <span className="absolute top-4 right-4 text-7xl font-serif text-[#ff7000]/12 select-none pointer-events-none">&rdquo;</span>
                      <div>
                        <div className="flex gap-1 text-[var(--darji-orange)]">
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <Star key={`s2-${starIndex}`} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                        <p className="mt-4 text-sm font-semibold leading-7 text-[#08111f]">
                          &quot;{testimonial.quote}&quot;
                        </p>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white text-xs font-black text-white shadow-[0_12px_24px_rgba(8,17,31,0.12)]" style={{ backgroundColor: testimonial.color }}>
                          {testimonial.initials}
                        </span>
                        <span className="text-left">
                          <span className="block text-sm font-black text-[#08111f]">{testimonial.name}</span>
                          <span className="block text-xs font-semibold text-[var(--darji-muted)]">Customer</span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#687589]">
                <span className="text-[#ff7000]">&larr;</span>
                <span>Scrolls automatically</span>
                <span className="text-[#ff7000]">&rarr;</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-[#fff7f0] px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#ff7000] shadow-sm">
                <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>Hover to pause</span>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="relative shell py-20 overflow-visible">
          {/* Background Dotted Thread Trails & Spool Decor */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
            {/* Left Thread Trail */}
            <svg className="absolute top-[20%] left-[-4%] h-48 w-48 text-[#eee4dc] opacity-60 hidden xl:block" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,3">
              <path d="M0,50 C30,20 70,80 100,50" />
            </svg>
            {/* Right Thread Trail */}
            <svg className="absolute bottom-[20%] right-[-4%] h-48 w-48 text-[#eee4dc] opacity-60 hidden xl:block" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,3">
              <path d="M0,50 C30,80 70,20 100,50" />
            </svg>
            
            {/* Bottom Left Needle */}
            <svg className="absolute bottom-[-5%] left-[-6%] h-24 w-24 text-[#ff7000]/12 hidden xl:block rotate-[15deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="4" r="2" />
              <path d="M12 6L12 22" />
            </svg>
            
            {/* Bottom Right Spool */}
            <svg className="absolute bottom-[-5%] right-[-6%] h-24 w-24 text-[#ff7000]/12 hidden xl:block rotate-[-15deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="2" width="12" height="4" rx="1" />
              <rect x="8" y="6" width="8" height="12" />
              <rect x="6" y="18" width="12" height="4" rx="1" />
              <line x1="8" y1="9" x2="16" y2="9" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="15" x2="16" y2="15" />
            </svg>
          </div>

          <div className="text-center">
            <SectionEyebrow>FAQ</SectionEyebrow>
            <h2 className="mx-auto max-w-4xl text-3xl font-extrabold leading-tight text-[var(--color-text-primary)] sm:text-5xl mt-1">
              Frequently Asked <span className="text-[var(--color-primary)]">Questions</span>
            </h2>
            <div className="flex items-center justify-center gap-4 mt-5">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[var(--color-border)]" />
              <svg className="h-5 w-5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C12 2 8 6 8 10C8 14.5 12 16 12 22" />
                <path d="M12 22C12 22 16 18 16 14C16 9.5 12 8 12 2" />
              </svg>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[var(--color-border)]" />
            </div>
            <p className="mt-4 text-base font-semibold leading-relaxed text-[var(--color-text-secondary)]">
              Everything you need to know about Darji.<br />
              Can't find the answer you're looking for? <a href="/dashboard?screen=support" className="text-[var(--color-primary)] hover:underline font-bold transition">Contact our support team</a>.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl flex flex-col gap-4">
            {faqList.map((item, index) => {
              const isOpen = openFaq === index;
              const numStr = String(index + 1).padStart(2, "0");

              return (
                <div
                  key={index}
                  className={`border transition-all duration-300 rounded-2xl ${
                    isOpen 
                      ? "border-[#ffd6b9] bg-gradient-to-br from-[#fffdfa] to-[#fff5ee] shadow-premium" 
                      : "border-[var(--color-border)] bg-white hover:border-[#ffd6b9]/60 shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left focus:outline-none"
                    type="button"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                      <span className="text-[#ff7000] font-black text-sm md:text-base shrink-0">{numStr}</span>
                      <span className="h-5 w-[1px] bg-neutral-200 shrink-0" />
                      <span className="text-base md:text-lg font-black text-[#08111f] leading-snug">
                        {item.question}
                      </span>
                    </div>
                    
                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen
                        ? "border-[#ff7000] bg-white text-[#ff7000] shadow-[0_4px_12px_rgba(255,112,0,0.12)]"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300"
                    }`}>
                      {isOpen ? (
                        <Minus className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0">
                          <div className="border-t border-dashed border-[#ffd6b9] pt-4 text-sm md:text-base leading-relaxed text-[#4b5563]">
                            {item.answer}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Still have questions card */}
          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100/60 text-[var(--color-primary)] shadow-[0_4px_12px_rgba(255,112,0,0.08)]">
                  <Headphones className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-[var(--color-text-primary)]">Still have questions?</h3>
                  <p className="text-sm font-semibold text-neutral-500 mt-0.5">We're here to help you.</p>
                </div>
              </div>
              <a
                href="/dashboard?screen=support"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-[#ff7000] bg-white px-5 py-2.5 text-sm font-bold text-[#ff7000] shadow-sm transition hover:bg-[#ff7000] hover:text-white"
              >
                Contact Support <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
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












































