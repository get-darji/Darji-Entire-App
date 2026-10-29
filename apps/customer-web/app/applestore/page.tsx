import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Globe2,
  Headset,
  Phone,
  Scissors,
  Smartphone
} from "lucide-react";
import { BrandLogo } from "@/src/components/brand-logo";

const playStoreUrl = "https://play.google.com/store/apps/details?id=com.darji.customer&pcampaignid=web_share";
const supportPhone = "+91 96259 17902";
const supportPhoneUrl = "tel:+919625917902";

export const metadata: Metadata = {
  title: "Darji for iPhone is coming soon",
  description: "Darji is preparing to launch on the Apple App Store. Explore our website, download the Android app, or call us to place an order.",
  alternates: { canonical: "https://www.getdarji.in/applestore" },
  openGraph: {
    title: "Darji for iPhone is coming soon",
    description: "Explore Darji on the web, get the Android app on Google Play, or call us to create an order.",
    url: "https://www.getdarji.in/applestore",
    siteName: "Darji",
    locale: "en_IN",
    type: "website"
  }
};

export default function AppleStorePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7f0] text-[#111827]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-[#ff7000]/10 blur-3xl" />
        <div className="absolute -left-48 top-[45%] h-[30rem] w-[30rem] rounded-full bg-[#f5c982]/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link aria-label="Darji home" className="rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7000]" href="/">
          <BrandLogo imageClassName="h-14 w-auto sm:h-[4.5rem]" />
        </Link>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#162138]/10 bg-white/70 px-4 text-sm font-bold text-[#25324a] shadow-sm transition hover:border-[#ff7000]/35 hover:bg-white" href="/">
          <Globe2 className="h-4 w-4 text-[#ff7000]" />
          Explore website
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-6rem)] w-full max-w-7xl items-center gap-12 px-5 pb-14 pt-5 sm:px-8 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:px-12 lg:pb-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff7000]/20 bg-white/75 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#b24b00] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#ff7000] shadow-[0_0_0_4px_rgba(255,112,0,.12)]" />
            Made for every stitch
          </div>
          <h1 className="mt-7 font-editorial text-[clamp(3.5rem,8vw,6.8rem)] font-semibold leading-[.94] tracking-[-.045em] text-[#111b2d]">
            Darji is coming to <span className="text-[#e36a10]">iPhone.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#596579] sm:text-xl sm:leading-9">
            We’re not on the Apple App Store just yet. With your support, we’ll be there soon. Until then, you can explore Darji on our website, get the Android app, or call us to arrange your order.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#ff7000] px-6 text-base font-extrabold text-white shadow-[0_14px_30px_rgba(227,106,16,.24)] transition hover:-translate-y-0.5 hover:bg-[#e56500] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7000]"
              href={playStoreUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Smartphone className="h-5 w-5" />
              Get the Android app
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#162138]/12 bg-white/80 px-6 text-base font-extrabold text-[#17243a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff7000]/35 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7000]"
              href={supportPhoneUrl}
            >
              <Phone className="h-5 w-5 text-[#e36a10]" />
              Call to place an order
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-[#687589]">
            <Link className="inline-flex items-center gap-2 transition hover:text-[#b24b00]" href="/">
              <Globe2 className="h-4 w-4" /> Browse Darji online
            </Link>
            <a className="inline-flex items-center gap-2 transition hover:text-[#b24b00]" href={supportPhoneUrl}>
              <Headset className="h-4 w-4" /> Contact support
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:max-w-none">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-[#ffd590]/70 via-white/20 to-[#ff7000]/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[#15100c] p-6 shadow-[0_35px_100px_rgba(49,32,16,.24)] sm:rounded-[2.5rem] sm:p-9">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,171,66,.22),transparent_35%),linear-gradient(145deg,rgba(255,255,255,.05),transparent_55%)]" />
            <div aria-hidden="true" className="absolute -right-16 top-28 h-56 w-56 rounded-full border border-[#ffc46d]/15 sm:h-72 sm:w-72 sm:border-2" />
            <div aria-hidden="true" className="absolute -right-5 top-40 h-44 w-44 rounded-full border border-[#ffc46d]/15 sm:right-2 sm:top-48 sm:h-56 sm:w-56" />

            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ff7000] text-white shadow-lg shadow-[#ff7000]/25 sm:h-14 sm:w-14">
                  <Scissors className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <span className="rounded-full border border-[#f5c46e]/30 bg-[#f5c46e]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.17em] text-[#ffd58a] sm:px-4 sm:text-xs">
                  Your fit, your way
                </span>
              </div>

              <p className="mt-12 text-xs font-black uppercase tracking-[.2em] text-[#ffc46d] sm:mt-16">Until we meet on iPhone</p>
              <h2 className="mt-3 max-w-[12ch] font-editorial text-4xl font-medium leading-[1.02] tracking-[-.025em] text-white sm:text-6xl">
                Your next perfect fit is closer.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/65 sm:text-base sm:leading-7">
                Discover tailoring and alterations, or speak with our team and we’ll help you get started.
              </p>

              <div className="mt-9 space-y-3 border-t border-white/10 pt-6 sm:mt-12 sm:pt-7">
                {[
                  "Explore tailoring on the website",
                  "Download Darji from Google Play",
                  "Call us to create an order"
                ].map((item) => (
                  <div className="flex items-center gap-3 text-sm font-semibold text-white/85" key={item}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ff7000]/15 text-[#ffc46d]"><Check className="h-3.5 w-3.5" /></span>
                    {item}
                  </div>
                ))}
              </div>

              <a className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#ffc46d] transition hover:text-white" href={supportPhoneUrl}>
                <Phone className="h-4 w-4" /> {supportPhone}
                <ArrowDownRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#1b2738]/[.08] bg-white/55 px-5 py-5 text-center text-xs font-medium text-[#778296] sm:px-8">
        © {new Date().getFullYear()} Darji. Thoughtful tailoring, made simple.
      </footer>
    </main>
  );
}
