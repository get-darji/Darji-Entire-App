"use client";

import { motion } from "framer-motion";
import type { Step } from "./steps-data";

interface StepCardProps {
  step: Step;
  index: number;
  total: number;
  revealed: boolean;
  current: boolean;
  connectorScale: number;
}

export function StepCard({ step, index, total, revealed, current, connectorScale }: StepCardProps) {
  const isLast = index === total - 1;

  return (
    <motion.article
      animate={revealed ? {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "grayscale(0%) blur(0px)",
        borderColor: "rgba(249,115,22,0.28)",
        boxShadow: current
          ? "0 28px 72px rgba(249,115,22,0.18)"
          : "0 24px 60px rgba(249,115,22,0.14)",
      } : {
        opacity: 0.2,
        y: 48,
        scale: 0.9,
        filter: "grayscale(100%) blur(1px)",
        borderColor: "#eee4dc",
        boxShadow: "0 18px 48px rgba(8,17,31,0.05)",
      }}
      transition={{ duration: 0.82, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex min-h-[244px] flex-col rounded-xl border bg-white p-4 text-left"
    >
      {!isLast && (
        <span
          className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-[40%] z-10 hidden h-[2px] w-8 bg-neutral-200 lg:block"
          aria-hidden="true"
        >
          <span
            className="block h-full origin-left bg-[var(--darji-orange)] transition-transform duration-700"
            style={{ transform: `scaleX(${connectorScale})` }}
          />
        </span>
      )}

      <div className="grid h-36 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_100%)]">
        <img
          src={step.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full max-h-36 w-full select-none object-contain p-2"
          draggable={false}
        />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--darji-orange)] text-sm font-black text-[var(--darji-orange)]">
          {index + 1}
        </span>
        <div>
          <p className="text-base font-black leading-snug text-[var(--darji-ink)]">
            {step.title}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">
            {step.copy}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
