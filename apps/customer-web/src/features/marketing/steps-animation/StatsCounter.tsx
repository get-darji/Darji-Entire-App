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
      className="mt-12 grid rounded-2xl border border-[var(--color-border)] bg-white shadow-md sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const cleanSuffix = stat.defaultValue.replace(/[0-9,.]/g, "");

        return (
          <div
            key={stat.label}
            className="border-[var(--color-border)] p-7 text-center sm:border-r last:border-r-0"
          >
            <Icon className="mx-auto h-8 w-8 text-[var(--color-primary)]" />
            <p className="mt-4 text-4xl font-extrabold text-[var(--color-text-primary)]">
              {inView ? (
                <CountUp value={stat.targetValue} suffix={cleanSuffix} />
              ) : (
                <span>{stat.defaultValue}</span>
              )}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
