"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Layers,
  MessageCircle,
  Share2,
  Sparkles,
  Twitter
} from "lucide-react";
import { type BlogArticle, type ContentBlock } from "./blog-data";
import { MarketingHeader } from "./site-actions";
import { EditorialFooter } from "@/src/components/editorial-footer";

const reveal = {
  initial: { opacity: 0, y: 22, filter: "blur(6px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
} as const;

type ArticleReadingViewProps = {
  article: BlogArticle;
  relatedArticles: BlogArticle[];
};

export function ArticleReadingView({ article, relatedArticles }: ArticleReadingViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareOnWhatsApp = () => {
    if (typeof window !== "undefined") {
      const text = encodeURIComponent(`Read "${article.title}" on The Darji Journal:\n${window.location.href}`);
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  const shareOnTwitter = () => {
    if (typeof window !== "undefined") {
      const text = encodeURIComponent(`"${article.title}" via @DarjiCraft`);
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    }
  };

  // Extract headings for table of contents
  const headings = article.blocks
    .filter((b): b is Extract<ContentBlock, { type: "heading" }> => b.type === "heading")
    .map((b) => b.text);

  return (
    <main className="min-h-screen bg-[#fdfaf6] text-[#08111f] font-sans selection:bg-[#ff7000]/20 selection:text-[#08111f]">
      {/* 1. Sticky Reading Progress Bar at the top */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1.5 bg-[#e6edf5]">
        <div
          className="h-full bg-gradient-to-r from-[#ff7000] via-[#ff9438] to-[#ffb35f] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <MarketingHeader active="blogs" />

      {/* 2. Article Header & Masthead */}
      <header className="relative overflow-hidden border-b border-[#e6edf5] bg-[#040810] text-white pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="pointer-events-none absolute -top-24 right-10 h-96 w-96 rounded-full bg-[#ff7000]/12 blur-3xl" />

        <div className="shell relative max-w-4xl">
          {/* Breadcrumb & Back link */}
          <Link
            href="/blogs"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to The Journal
          </Link>

          {/* Category & Kicker */}
          <div className="mt-8 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff7000]" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb35f]">
              {article.category} • The Darji Journal
            </p>
          </div>

          {/* Article Title */}
          <h1 className="mt-4 font-editorial text-[clamp(2.6rem,6vw,5.6rem)] font-normal leading-[1.02] tracking-[-0.025em] text-white">
            {article.title}
          </h1>

          {/* Subtitle / Deck */}
          <p className="mt-6 text-lg sm:text-xl font-normal leading-relaxed text-white/75">
            {article.subtitle}
          </p>

          {/* Byline & Article Metrics */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-8">
            {/* Author Profile */}
            <div className="flex items-center gap-4">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-[#ff7000]/40 shadow-lg"
              />
              <div>
                <p className="text-base font-bold text-white">{article.author.name}</p>
                <p className="text-xs text-white/60 line-clamp-1">{article.author.role}</p>
              </div>
            </div>

            {/* Read Stats */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-bold uppercase tracking-[0.14em] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-[#ff7000]" />
                {article.date}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#ff7000]" />
                {article.readTime}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-[#ff7000]" />
                {article.wordCount} words
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Hero Image Banner */}
      <div className="shell relative -mt-10 sm:-mt-16 z-20 max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-[#e6edf5] bg-[#08111f] shadow-[0_24px_70px_rgba(8,17,31,0.12)]">
          <img
            src={article.image}
            alt={`${article.title} hero photography`}
            className="h-[360px] sm:h-[500px] w-full object-cover"
          />
        </div>
        <p className="mt-3 text-right text-xs text-[#8c9aa8] italic">
          Photography from the Darji Master Artisan Workshop & Archive.
        </p>
      </div>

      {/* 4. Main Editorial Reading Experience */}
      <div className="shell grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-20 max-w-5xl">
        {/* Left: Article Body */}
        <article className="max-w-3xl">
          {/* Social Share Toolbar */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e6edf5] bg-white p-4 shadow-sm">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#687589]">
              <Share2 className="h-3.5 w-3.5 text-[#ff7000]" />
              Share this essay
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={shareOnWhatsApp}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-xs font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </button>
              <button
                onClick={shareOnTwitter}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[#1DA1F2]/10 px-3 py-1.5 text-xs font-bold text-[#1DA1F2] transition hover:bg-[#1DA1F2]/20"
                title="Share on X"
              >
                <Twitter className="h-3.5 w-3.5" /> X / Twitter
              </button>
              <button
                onClick={handleCopyLink}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[#f0f4f8] px-3 py-1.5 text-xs font-bold text-[#08111f] transition hover:bg-[#e2e8f0]"
                title="Copy Link"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Content Blocks */}
          <div className="space-y-10 text-[#2c3848]">
            {article.blocks.map((block, idx) => {
              switch (block.type) {
                case "lead":
                  return (
                    <p
                      key={idx}
                      className="drop-cap text-xl sm:text-2xl font-normal leading-relaxed text-[#1e293b]"
                    >
                      {block.text}
                    </p>
                  );

                case "paragraph":
                  return (
                    <p key={idx} className="text-lg leading-8 font-normal text-[#3f4f66]">
                      {block.text}
                    </p>
                  );

                case "heading": {
                  const id = block.text.toLowerCase().replace(/[^\w]+/g, "-");
                  return (
                    <h2
                      id={id}
                      key={idx}
                      className="scroll-mt-28 pt-6 font-editorial text-3xl sm:text-4xl font-normal tracking-[-0.02em] text-[#08111f] border-t border-[#e6edf5]"
                    >
                      {block.text}
                    </h2>
                  );
                }

                case "subheading":
                  return (
                    <h3
                      key={idx}
                      className="pt-2 font-editorial text-2xl font-normal text-[#08111f]"
                    >
                      {block.text}
                    </h3>
                  );

                case "quote":
                  return (
                    <figure
                      key={idx}
                      className="relative my-8 rounded-2xl border-l-4 border-[#ff7000] bg-white p-8 shadow-sm"
                    >
                      <blockquote className="editorial-pullquote text-2xl font-normal italic leading-snug text-[#08111f]">
                        "{block.text}"
                      </blockquote>
                      {block.author && (
                        <figcaption className="mt-4 text-sm font-bold uppercase tracking-wider text-[#ff7000]">
                          — {block.author} {block.role ? `(${block.role})` : ""}
                        </figcaption>
                      )}
                    </figure>
                  );

                case "callout":
                  return (
                    <div
                      key={idx}
                      className="my-8 rounded-2xl border border-[#ff7000]/25 bg-gradient-to-br from-[#fff7ef] to-[#ffffff] p-7 shadow-[0_12px_36px_rgba(255,112,0,0.06)]"
                    >
                      {block.badge && (
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff7000]">
                          {block.badge}
                        </p>
                      )}
                      <h4 className="mt-2 font-editorial text-2xl font-normal text-[#08111f]">
                        {block.title}
                      </h4>
                      <p className="mt-2 text-base leading-relaxed text-[#4b5a70]">
                        {block.body}
                      </p>
                    </div>
                  );

                case "image":
                  return (
                    <figure key={idx} className="my-8">
                      <div className="overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#08111f]">
                        <img
                          src={block.url}
                          alt={block.alt}
                          className="w-full object-cover transition-transform duration-700 hover:scale-102"
                        />
                      </div>
                      {block.caption && (
                        <figcaption className="mt-2 text-center text-xs text-[#687589]">
                          {block.caption} {block.credit ? `• Credit: ${block.credit}` : ""}
                        </figcaption>
                      )}
                    </figure>
                  );

                case "numberedList":
                  return (
                    <div key={idx} className="my-8 space-y-6">
                      {block.title && (
                        <h4 className="font-editorial text-2xl text-[#08111f]">{block.title}</h4>
                      )}
                      <div className="grid gap-5">
                        {block.items.map((item) => (
                          <div
                            key={item.step}
                            className="grid gap-4 rounded-2xl border border-[#e6edf5] bg-white p-6 shadow-sm sm:grid-cols-[4rem_1fr]"
                          >
                            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0e5] font-editorial text-2xl font-bold text-[#ff7000]">
                              {item.step}
                            </span>
                            <div>
                              <h5 className="text-xl font-bold text-[#08111f]">{item.title}</h5>
                              <p className="mt-2 text-base leading-relaxed text-[#4b5a70]">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                case "comparison":
                  return (
                    <div
                      key={idx}
                      className="my-10 overflow-hidden rounded-3xl border border-[#e6edf5] bg-white shadow-sm"
                    >
                      <div className="bg-[#08111f] p-6 text-white">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb35f]">
                          Tailoring Diagnostic
                        </p>
                        <h4 className="mt-1 font-editorial text-2xl">{block.title}</h4>
                      </div>
                      <div className="grid divide-y divide-[#e6edf5] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        <div className="p-6 bg-[#fafbfc]">
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-700">
                            {block.beforeTitle}
                          </span>
                          <p className="mt-4 text-sm leading-relaxed text-[#5c6a7d]">
                            {block.beforeText}
                          </p>
                        </div>
                        <div className="p-6 bg-[#fffaf5]">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                            {block.afterTitle}
                          </span>
                          <p className="mt-4 text-sm leading-relaxed text-[#08111f] font-medium">
                            {block.afterText}
                          </p>
                        </div>
                      </div>
                      {block.takeaway && (
                        <div className="border-t border-[#e6edf5] bg-[#fff0e5]/40 p-4 text-center text-xs font-bold text-[#a64800]">
                          💡 Takeaway: {block.takeaway}
                        </div>
                      )}
                    </div>
                  );

                case "takeaways":
                  return (
                    <div
                      key={idx}
                      className="my-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/5 p-7"
                    >
                      <h4 className="font-editorial text-2xl font-normal text-[#08111f]">
                        {block.title}
                      </h4>
                      <ul className="mt-4 space-y-3">
                        {block.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-3 text-base text-[#3f4f66]">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>

          {/* Author Box at End of Article */}
          <div className="mt-14 rounded-3xl border border-[#e6edf5] bg-white p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-[#ff7000]/30 shadow-md"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff7000]">
                  Written by
                </p>
                <h4 className="mt-1 text-2xl font-bold text-[#08111f]">{article.author.name}</h4>
                <p className="text-xs font-bold text-[#687589] mt-0.5">{article.author.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#4b5a70]">
                  {article.author.bio}
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Right: Sticky Sidebar (Table of Contents + Newsletter + Quick Booking) */}
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {/* Table of Contents */}
          {headings.length > 0 && (
            <div className="rounded-2xl border border-[#e6edf5] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff7000]">
                Table of Contents
              </p>
              <nav className="mt-4 space-y-2.5">
                {headings.map((heading) => {
                  const id = heading.toLowerCase().replace(/[^\w]+/g, "-");
                  return (
                    <a
                      key={heading}
                      href={`#${id}`}
                      className="block text-sm font-semibold text-[#4b5a70] transition hover:text-[#ff7000] line-clamp-2"
                    >
                      • {heading}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Quick Doorstep Tailoring Callout */}
          <div className="rounded-2xl border border-[#ff7000]/30 bg-gradient-to-br from-[#08111f] to-[#12243d] p-6 text-white shadow-lg">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffb35f]">
              Doorstep Service
            </p>
            <h4 className="mt-2 font-editorial text-2xl font-normal leading-snug">
              Need this garment tailored?
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Book a calibrated home fitting visit with Darji's verified master tailors in Delhi NCR & Bangalore.
            </p>
            <Link
              href="/#services"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff7000] py-3 text-xs font-black text-white hover:bg-[#e56500] transition"
            >
              Book Doorstep Fitting <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Tags */}
          <div className="rounded-2xl border border-[#e6edf5] bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#687589]">
              Filed Under
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-[#f6f8fb] px-2.5 py-1 text-xs font-bold text-[#4b5a70]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 5. Related Articles ("Continue Reading") */}
      {relatedArticles.length > 0 && (
        <section className="border-t border-[#e6edf5] bg-white py-16 sm:py-24">
          <div className="shell">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff7000]">
                  Continue Reading
                </p>
                <h2 className="mt-2 font-editorial text-[clamp(2.2rem,4vw,3.6rem)] font-normal tracking-[-0.02em] text-[#08111f]">
                  More from The Darji Journal
                </h2>
              </div>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 text-sm font-black text-[#ff7000] hover:underline"
              >
                View all essays <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {relatedArticles.map((rel) => (
                <article
                  key={rel.slug}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e6edf5] bg-[#fdfaf6] transition hover:-translate-y-1 hover:shadow-md"
                >
                  <Link href={`/blogs/${rel.slug}`} className="flex flex-col h-full">
                    <div className="relative h-52 overflow-hidden bg-[#08111f]">
                      <img
                        src={rel.image}
                        alt={rel.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#ff7000]">
                        {rel.category}
                      </div>
                    </div>
                    <div className="p-5 flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[#687589]">
                          <span>{rel.date}</span>
                          <span>•</span>
                          <span>{rel.readTime}</span>
                        </div>
                        <h3 className="mt-2 font-editorial text-xl font-normal leading-snug text-[#08111f] group-hover:text-[#ff7000] transition">
                          {rel.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-[#5c6a7d] line-clamp-2">
                          {rel.excerpt}
                        </p>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#ff7000]">
                        Read Essay <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Editorial Footer */}
      <EditorialFooter />
    </main>
  );
}
