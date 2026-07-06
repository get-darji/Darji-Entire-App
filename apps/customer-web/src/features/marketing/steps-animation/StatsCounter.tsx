"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { Stat } from "./steps-data";
import { CountUp } from "./CountUp";

interface StatsCounterProps {
  stats: Stat[];
}

export function StatsCounter({ stats }: StatsCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <div
      ref={containerRef}
      className="mt-8 grid rounded-lg border border-[#eee4dc] bg-white shadow-[0_18px_48px_rgba(8,17,31,0.05)] sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const cleanSuffix = stat.defaultValue.replace(/[0-9,.]/g, "");

        return (
          <div
            key={stat.label}
            className="border-[#eee4dc] p-7 text-center sm:border-r last:border-r-0"
          >
            <Icon className="mx-auto h-9 w-9 text-[var(--darji-orange)]" />
            <p className="mt-4 text-4xl font-black text-[var(--darji-ink)]">
              {inView ? (
                <CountUp value={stat.targetValue} suffix={cleanSuffix} />
              ) : (
                <span>{stat.defaultValue}</span>
              )}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--darji-muted)]">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
