"use client";

import { defaultCustomerWebsiteSlider } from "../../../../../shared/src/customer-website-slider";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { customerApi } from "@/src/lib/api";

type CustomerWebsiteSliderProps = {
  onBookPickup: () => void;
};

export function CustomerWebsiteSlider({ onBookPickup }: CustomerWebsiteSliderProps) {
  const sliderQuery = useQuery({
    queryKey: ["customer-website-slider"],
    queryFn: customerApi.getCustomerWebsiteSlider,
    initialData: defaultCustomerWebsiteSlider,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    retry: 1
  });
  const config = sliderQuery.data;
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const touchStartX = useRef<number | null>(null);
  const paused = userPaused || interactionPaused;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!config) return;
    setActiveIndex((current) => Math.min(current, Math.max(config.slides.length - 1, 0)));
  }, [config]);

  useEffect(() => {
    if (!config || paused || reducedMotion || config.slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % config.slides.length);
    }, config.intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [config, paused, reducedMotion, scheduleVersion]);

  useEffect(() => {
    if (!config || config.slides.length < 2) return;
    const nextSlide = config.slides[(activeIndex + 1) % config.slides.length];
    const image = new window.Image();
    image.src = nextSlide.imageUrl;
  }, [activeIndex, config]);

  if (!config || !config.enabled || config.slides.length === 0) return null;

  const activeSlide = config.slides[activeIndex] ?? config.slides[0];
  const selectSlide = (index: number) => {
    const nextIndex = (index + config.slides.length) % config.slides.length;
    setActiveIndex(nextIndex);
    setScheduleVersion((current) => current + 1);
    setAnnouncement(`Slide ${nextIndex + 1} of ${config.slides.length}: ${config.slides[nextIndex].altText}`);
  };

  return (
    <section className="w-full bg-white px-0 pb-5 sm:pb-14 lg:pb-16" aria-label="Darji highlights">
      <div className="w-full">
        <div
          className="group relative isolate w-full overflow-hidden bg-white sm:aspect-[3/1]"
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured Darji services"
          onMouseEnter={() => setInteractionPaused(true)}
          onMouseLeave={() => setInteractionPaused(false)}
          onFocusCapture={() => setInteractionPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteractionPaused(false);
          }}
        >
          <div
            className="relative aspect-[2.4/1] w-full touch-pan-y overflow-hidden bg-white sm:absolute sm:inset-0 sm:aspect-auto"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
              setInteractionPaused(true);
            }}
            onTouchEnd={(event) => {
              const startX = touchStartX.current;
              const endX = event.changedTouches[0]?.clientX;
              touchStartX.current = null;
              setInteractionPaused(false);
              if (startX === null || endX === undefined || Math.abs(endX - startX) < 50) return;
              selectSlide(activeIndex + (endX < startX ? 1 : -1));
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={activeSlide.id}
                className="absolute inset-0 h-full w-full"
                initial={reducedMotion ? false : { opacity: 0, x: "3%", filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: "-2%", filter: "blur(5px)" }}
                transition={{ duration: reducedMotion ? 0.01 : 0.72, ease: [0.16, 1, 0.3, 1] }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${activeIndex + 1} of ${config.slides.length}`}
              >
                <img
                  src={activeSlide.imageUrl}
                  alt={activeSlide.altText}
                  className="h-full w-full object-cover object-center"
                  draggable={false}
                  loading={activeIndex === 0 ? "eager" : "lazy"}
                />
              </motion.div>
            </AnimatePresence>

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_65%,rgba(8,17,31,0.12)_100%)]" aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={onBookPickup}
            className="focus-ring relative z-20 mx-4 my-3 flex min-h-12 w-[calc(100%-32px)] items-center justify-center gap-2 rounded-xl px-5 py-3 text-center text-sm font-black leading-tight shadow-[0_10px_24px_rgba(8,17,31,0.18)] transition active:scale-[0.99] sm:absolute sm:bottom-6 sm:left-6 sm:m-0 sm:min-h-12 sm:w-auto sm:max-w-[min(32rem,calc(100%-220px))] sm:rounded-full sm:px-6 sm:text-base sm:hover:-translate-y-0.5 sm:hover:brightness-95"
            style={{ backgroundColor: config.buttonColor, color: config.buttonTextColor }}
          >
            {config.buttonText}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          {config.slides.length > 1 ? (
            <>
              <button
                type="button"
                className="focus-ring absolute left-3 md:left-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#08111f]/82 text-white shadow-[0_12px_28px_rgba(8,17,31,0.24)] backdrop-blur-sm transition hover:scale-105 hover:bg-[#08111f] sm:flex"
                onClick={() => selectSlide(activeIndex - 1)}
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="focus-ring absolute right-3 md:right-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#08111f]/82 text-white shadow-[0_12px_28px_rgba(8,17,31,0.24)] backdrop-blur-sm transition hover:scale-105 hover:bg-[#08111f] sm:flex"
                onClick={() => selectSlide(activeIndex + 1)}
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="absolute bottom-6 right-6 z-20 hidden items-center gap-1.5 rounded-full bg-[#08111f]/82 p-1.5 text-white shadow-[0_10px_26px_rgba(8,17,31,0.2)] backdrop-blur-sm sm:flex">
                {config.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    onClick={() => selectSlide(index)}
                    aria-label={`Show slide ${index + 1}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                  >
                    <span className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/55"}`} />
                  </button>
                ))}
                <span className="mx-0.5 h-5 w-px bg-white/25" aria-hidden="true" />
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  onClick={() => {
                    setUserPaused((current) => {
                      setAnnouncement(current ? "Slideshow playing" : "Slideshow paused");
                      return !current;
                    });
                  }}
                  aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
                >
                  {userPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              </div>
            </>
          ) : null}
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </div>
      </div>
    </section>
  );
}
