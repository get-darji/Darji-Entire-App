"use client";

import { motion, useInView } from "framer-motion";
import gsap from "gsap";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Clock3, PackageCheck, Quote, Star, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/src/components/brand-logo";
import { SectionEyebrow } from "@/src/components/ui";
import { faq } from "@/src/lib/static-data";
import { PremiumHero } from "./premium-hero";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const target = { value: 0 };
    gsap.to(target, {
      value,
      duration: 1.4,
      ease: "power3.out",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = `${Math.round(target.value).toLocaleString("en-IN")}${suffix}`;
      }
    });
  }, [inView, suffix, value]);

  return <span ref={ref}>0{suffix}</span>;
}

const processSteps = [
  { title: "Upload & Describe", copy: "Upload photos of your clothing and tell us what you need.", image: "/animations/s1.png" },
  { title: "Schedule Pickup", copy: "Choose a convenient time. We pick it up from your doorstep.", image: "/animations/s2.png" },
  { title: "Tailor Gets to Work", copy: "Our verified tailor reviews and starts working on it.", image: "/animations/s3.png" },
  { title: "Live Tracking", copy: "Track your order in real time from pickup to delivery.", image: "/animations/s4.png" },
  { title: "Delivered Home", copy: "We deliver your perfect clothing back to your doorstep.", image: "/animations/s5.png" }
];

const serviceCards = [
  { title: "Alterations", copy: "Perfect fit, every time.", image: "/animations/service-alterations.png" },
  { title: "Repairs", copy: "We fix it like new.", image: "/animations/service-repairs.png" },
  { title: "Custom Stitching", copy: "Stitch your style.", image: "/animations/service-custom-stitching.png" },
  { title: "Men's Wear", copy: "Shirts, Pants, Suits & more.", image: "/animations/service-mens-wear.png" },
  { title: "Women's Wear", copy: "Sarees, Dresses, Tops & more.", image: "/animations/service-womens-wear.png" },
  { title: "Kids Wear", copy: "Comfort for your little ones.", image: "/animations/service-kids-wear.png" }
];

const testimonials = [
  {
    quote: "Amazing service! Pickup was on time and the stitching quality is top-notch. Highly recommended!",
    name: "Ankita Sharma",
    city: "Delhi",
    initials: "AS",
    color: "#f97316"
  },
  {
    quote: "Super convenient and reliable. Darji has made tailoring so easy for me. Love it!",
    name: "Rohit Verma",
    city: "Gurgaon",
    initials: "RV",
    color: "#0b2241"
  },
  {
    quote: "Very professional tailors and quick delivery. My go-to for all alterations now.",
    name: "Neha Iyer",
    city: "Bangalore",
    initials: "NI",
    color: "#be123c"
  }
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);

  return (
    <main>
      <PremiumHero heroRef={heroRef} howRef={howRef} />

      <section id="how" ref={howRef} className="bg-white py-20">
        <div className="shell text-center">
          <SectionEyebrow>How Darji Works</SectionEyebrow>
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">5 Simple Steps</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[var(--darji-muted)]">
            From pickup to delivery, we make tailoring effortless.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {processSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.05 }}
                className="process-step-card relative flex min-h-[244px] flex-col rounded-lg border border-[#eee4dc] bg-white p-4 text-left shadow-[0_18px_48px_rgba(8,17,31,0.05)]"
              >
                {index < processSteps.length - 1 ? <span className="process-step-arrow" aria-hidden="true" /> : null}
                <div className="grid h-32 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_100%)]">
                  <img src={step.image} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-full max-h-32 w-full select-none object-contain p-1" draggable={false} />
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--darji-orange)] text-sm font-black text-[var(--darji-orange)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base font-black text-[var(--darji-ink)]">{step.title}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{step.copy}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 grid rounded-lg border border-[#eee4dc] bg-white shadow-[0_18px_48px_rgba(8,17,31,0.05)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Orders Completed", 10000, "+", PackageCheck],
              ["Verified Tailors", 150, "+", Users],
              ["Average Pickup Time", 30, " min", Clock3],
              ["Customer Rating", 49, " ★", Star]
            ].map(([label, value, suffix, Icon]) => {
              const StatIcon = Icon as typeof Star;
              const displayValue = label === "Customer Rating" ? 4.9 : Number(value);
              return (
                <div key={String(label)} className="border-[#eee4dc] p-7 text-center sm:border-r last:border-r-0">
                  <StatIcon className="mx-auto h-9 w-9 text-[var(--darji-orange)]" />
                  <p className="mt-4 text-4xl font-black text-[var(--darji-ink)]">
                    {label === "Customer Rating" ? "4.9 ★" : <AnimatedNumber value={displayValue} suffix={String(suffix)} />}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--darji-muted)]">{String(label)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-8">
        <div className="shell text-center">
          <SectionEyebrow>Our Services</SectionEyebrow>
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">Tailoring For Every Need</h2>
          <div className="relative mt-8">
            <button className="reference-round-control -left-4" aria-label="Previous services" type="button">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {serviceCards.map((service, index) => (
                <motion.article
                  key={service.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.04 }}
                  className="reference-service-card"
                >
                  <div className="reference-service-image">
                    <img src={service.image} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                </motion.article>
              ))}
            </div>
            <button className="reference-round-control -right-4" aria-label="Next services" type="button">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="shell text-center">
          <SectionEyebrow>Our Customers Love Us</SectionEyebrow>
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">Real Stories, Real Happiness</h2>
          <div className="relative mt-8">
            <button className="reference-round-control -left-4" aria-label="Previous testimonials" type="button">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <motion.article
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.05 }}
                  className="reference-testimonial-card"
                >
                  <Quote className="h-8 w-8 fill-[var(--darji-orange)] text-[var(--darji-orange)]" />
                  <p className="mt-4 text-sm font-semibold leading-7 text-[var(--darji-ink)]">{testimonial.quote}</p>
                  <div className="mt-4 flex gap-1 text-[var(--darji-orange)]">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white text-sm font-black text-white shadow-[0_12px_24px_rgba(8,17,31,0.12)]" style={{ backgroundColor: testimonial.color }}>
                      {testimonial.initials}
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-black text-[var(--darji-ink)]">{testimonial.name}</span>
                      <span className="block text-xs font-semibold text-[var(--darji-muted)]">{testimonial.city}</span>
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
            <button className="reference-round-control -right-4" aria-label="Next testimonials" type="button">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="shell">
          <div className="reference-cta">
            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl font-black leading-tight text-[var(--darji-ink)]">Ready to get started?</h2>
              <p className="mt-3 text-base font-semibold text-[#3f4654]">Book your first pickup and experience premium doorstep tailoring.</p>
            </div>
            <a href="/dashboard" className="focus-ring relative z-10 inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-[var(--darji-orange)] px-8 text-sm font-black text-white shadow-[0_18px_36px_rgba(255,112,0,0.28)] transition hover:-translate-y-0.5">
              Book Pickup Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="pricing" className="shell py-24">
        <SectionEyebrow>Pricing</SectionEyebrow>
        <div className="rounded-[2.25rem] border border-[#efcf92] bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(246,163,19,0.12)] md:p-10">
          <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Clear before you confirm. No hidden pricing.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {[
              ["Tailor Charges", "Quoted by verified tailor"],
              ["Delivery Fee", "Based on urgency and area"],
              ["Platform Fee", "Shown at checkout"],
              ["Taxes", "Included when applicable"]
            ].map(([label, copy]) => (
              <div key={label} className="rounded-3xl border border-[#efcf92] bg-white p-5">
                <p className="font-black">{label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="shell py-24">
        <SectionEyebrow>FAQ</SectionEyebrow>
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <h2 className="text-4xl font-black leading-tight sm:text-6xl">Questions, answered without the fine print.</h2>
          <div className="grid gap-3">
            {faq.map(([question, answer], index) => (
              <button key={question} onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="focus-ring rounded-3xl border border-[#e6edf5] bg-white p-5 text-left">
                <span className="flex items-center justify-between gap-4 text-lg font-black">
                  {question}
                  <ChevronDown className={`h-5 w-5 transition ${openFaq === index ? "rotate-180" : ""}`} />
                </span>
                {openFaq === index ? <span className="mt-3 block text-sm font-semibold leading-6 text-[var(--darji-muted)]">{answer}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e6edf5] bg-white py-12">
        <div className="shell grid gap-8 md:grid-cols-[1fr_1.5fr]">
          <div>
            <BrandLogo imageClassName="h-[72px] w-auto" />
            <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-[var(--darji-muted)]">Premium customer website and web app for doorstep tailoring, built on the existing Darji backend.</p>
          </div>
          <div className="grid gap-3 text-sm font-bold text-[var(--darji-muted)] sm:grid-cols-3">
            {["How Darji Works", "Services", "Pricing", "About", "Contact", "Privacy Policy", "Terms of Service", "Cancellation Policy"].map((item) => (
              <a key={item} href="#" className="transition hover:text-[var(--darji-ink)]">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
