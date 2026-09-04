"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, CalendarDays, Clock, Filter, Layers, Search, Sparkles, User, X } from "lucide-react";
import Link from "next/link";
import { blogArticles, blogCategories, type BlogArticle } from "./blog-data";
import { MarketingHeader } from "./site-actions";
import { EditorialFooter } from "@/src/components/editorial-footer";

const reveal = {
  initial: { opacity: 0, y: 24, filter: "blur(6px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
} as const;

export function BlogListPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All Stories");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const featuredArticle = useMemo(() => {
    return blogArticles.find((a) => a.featured) || blogArticles[0];
  }, []);

  const filteredArticles = useMemo(() => {
    return blogArticles.filter((article) => {
      const matchesCategory =
        selectedCategory === "All Stories" || article.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        article.author.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-[#fdfaf6] text-[#08111f] font-sans selection:bg-[#ff7000]/20 selection:text-[#08111f]">
      <MarketingHeader active="blogs" />

      {/* 1. Masthead / Editorial Journal Hero */}
      <section className="relative overflow-hidden border-b border-[#e6edf5] bg-[#040810] text-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -top-24 right-10 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,112,0,0.16),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,179,95,0.08),transparent_70%)] blur-2xl" />

        <div className="shell relative">
          <motion.div {...reveal} className="max-w-5xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffb35f]">
              The Darji Journal • Issue 04
            </p>

            <h1 className="mt-6 font-editorial text-[clamp(3.4rem,8.5vw,7.8rem)] font-normal leading-[0.9] tracking-[-0.03em] text-white">
              The Sartorial <span className="italic text-[#ffb35f]">Chronicle.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg sm:text-xl font-normal leading-relaxed text-white/70">
              Curated essays on bespoke tailoring, garment anatomy, fabric preservation rituals, and the living heritage of master Indian artisans.
            </p>

            {/* Publication metadata stats */}
            <div className="mt-10 flex flex-wrap items-center gap-6 sm:gap-10 border-t border-white/15 pt-6 text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-white/60">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#ff7000]" />
                <span>{blogArticles.length} Curated Essays</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#ff7000]" />
                <span>45 Min Total Reading</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#ff7000]" />
                <span>Doorstep Fit Masterclasses</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Featured Article Showcase */}
      {featuredArticle && (
        <section className="shell relative -mt-12 z-20">
          <motion.div
            {...reveal}
            className="group relative overflow-hidden rounded-3xl border border-[#e6edf5] bg-white shadow-[0_24px_68px_rgba(8,17,31,0.08)] transition-all duration-500 hover:shadow-[0_32px_84px_rgba(255,112,0,0.12)]"
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-stretch">
              {/* Image Column */}
              <div className="relative min-h-[360px] sm:min-h-[440px] overflow-hidden bg-[#08111f]">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08111f]/80 via-transparent to-transparent lg:hidden" />
                <div className="absolute top-6 left-6 rounded-md bg-black/75 backdrop-blur-md px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">
                  Featured Essay
                </div>
              </div>

              {/* Content Column */}
              <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-14 bg-white">
                <div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-[0.16em] text-[#687589]">
                    <span className="text-[#ff7000] font-black">{featuredArticle.category}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {featuredArticle.date}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {featuredArticle.readTime}
                    </span>
                  </div>

                  <Link href={`/blogs/${featuredArticle.slug}`} className="block group-hover:text-[#ff7000] transition-colors mt-4">
                    <h2 className="font-editorial text-[clamp(2.2rem,4vw,3.6rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[#08111f]">
                      {featuredArticle.title}
                    </h2>
                  </Link>

                  <p className="mt-4 text-base sm:text-lg font-normal leading-relaxed text-[#4b5a70]">
                    {featuredArticle.excerpt}
                  </p>
                </div>

                <div className="mt-8 pt-8 border-t border-[#e6edf5] flex flex-wrap items-center justify-between gap-4">
                  {/* Author Bio Pill */}
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredArticle.author.avatar}
                      alt={featuredArticle.author.name}
                      className="h-11 w-11 rounded-full object-cover border-2 border-[#ff7000]/20"
                    />
                    <div>
                      <p className="text-sm font-bold text-[#08111f]">{featuredArticle.author.name}</p>
                      <p className="text-xs text-[#687589] line-clamp-1">{featuredArticle.author.role}</p>
                    </div>
                  </div>

                  {/* Read Article CTA */}
                  <Link
                    href={`/blogs/${featuredArticle.slug}`}
                    className="focus-ring inline-flex items-center gap-3 rounded-xl bg-[#08111f] px-6 py-3.5 text-sm font-black text-white transition-all duration-300 hover:bg-[#ff7000] hover:-translate-y-0.5"
                  >
                    Read Full Essay <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* 3. Sticky Category Navigation & Live Search Bar */}
      <section className="shell mt-16 sm:mt-24">
        <div className="sticky top-20 z-40 rounded-2xl border border-[#e6edf5] bg-white/90 p-3 shadow-[0_12px_36px_rgba(8,17,31,0.06)] backdrop-blur-xl transition">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              {blogCategories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`focus-ring shrink-0 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-all duration-200 ${
                      isSelected
                        ? "bg-[#ff7000] text-white shadow-md shadow-[#ff7000]/25"
                        : "bg-[#f5f8fc] text-[#4b5a70] hover:bg-[#fff0e5] hover:text-[#ff7000]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* Live Search Input */}
            <div className="relative min-w-[260px] sm:min-w-[300px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687589]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, fabrics, guides..."
                className="w-full rounded-xl border border-[#e6edf5] bg-[#f9fafc] pl-10 pr-9 py-2.5 text-sm text-[#08111f] placeholder-[#8c9aa8] focus:border-[#ff7000] focus:bg-white focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c9aa8] hover:text-[#08111f]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Asymmetrical Editorial Article Grid */}
      <section className="shell py-12 sm:py-16">
        {filteredArticles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d1dce8] bg-white p-16 text-center">
            <Filter className="mx-auto h-12 w-12 text-[#ff7000]/60" />
            <h3 className="mt-4 font-editorial text-2xl text-[#08111f]">No essays found</h3>
            <p className="mt-2 text-sm text-[#687589]">
              No articles matched your selected filter or search query. Try clearing filters to see all essays.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All Stories");
                setSearchQuery("");
              }}
              className="mt-6 rounded-xl bg-[#ff7000] px-6 py-2.5 text-sm font-black text-white hover:bg-[#e56500]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article, index) => {
              // Create deliberate asymmetry: first item spans 2 cols on lg if index 0
              const isWide = index % 5 === 0;

              return (
                <motion.article
                  key={article.slug}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: (index % 6) * 0.08 }}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#e6edf5] bg-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(8,17,31,0.1)] ${
                    isWide ? "md:col-span-2 lg:col-span-2" : "col-span-1"
                  }`}
                >
                  <Link href={`/blogs/${article.slug}`} className="flex flex-col h-full">
                    {/* Image Box */}
                    <div className={`relative overflow-hidden bg-[#08111f] ${isWide ? "h-72 sm:h-80" : "h-64"}`}>
                      <img
                        src={article.image}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ff7000] shadow-sm">
                        {article.category}
                      </div>
                      <div className="absolute bottom-4 right-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                        {article.readTime}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
                      <div>
                        <div className="flex items-center gap-3 text-xs font-bold text-[#687589]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {article.date}
                          </span>
                          <span>•</span>
                          <span>By {article.author.name}</span>
                        </div>

                        <h3 className={`mt-3 font-editorial font-normal leading-tight text-[#08111f] transition-colors group-hover:text-[#ff7000] ${
                          isWide ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                        }`}>
                          {article.title}
                        </h3>

                        <p className="mt-3 text-sm leading-relaxed text-[#4b5a70] line-clamp-3">
                          {article.excerpt}
                        </p>
                      </div>

                      {/* Footer metadata & arrow */}
                      <div className="mt-6 pt-6 border-t border-[#f0f4f8] flex items-center justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {article.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-md bg-[#f6f8fb] px-2 py-0.5 text-[11px] font-bold text-[#687589]">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#ff7000]">
                          Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Masterclass Dispatch & Free Fit Guide Banner */}
      <section className="shell pb-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-[#08111f] text-white p-8 sm:p-14 lg:p-16 border border-white/10 shadow-[0_28px_80px_rgba(8,17,31,0.2)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#ff7000]/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffb35f]">
              Artisan Guild Access
            </p>
            <h2 className="mt-4 font-editorial text-[clamp(2.2rem,4vw,3.8rem)] font-normal leading-[1.05] text-white">
              Have an heirloom garment that needs restoration?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed font-normal">
              From restoring vintage Paithani zari seams to bespoke tuxedos, our master tailors provide home fitting assessments across Delhi NCR & Bangalore.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/about"
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#ff7000] px-8 text-sm font-black text-white transition hover:bg-[#e56500] hover:-translate-y-0.5"
              >
                Learn How Darji Works <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#services"
                className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 text-sm font-bold text-white transition hover:bg-white/10"
              >
                View Services & Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <EditorialFooter />
    </main>
  );
}
