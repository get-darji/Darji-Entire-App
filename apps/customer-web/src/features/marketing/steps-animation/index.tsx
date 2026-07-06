"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SectionEyebrow } from "@/src/components/ui";
import { STEPS, STATS } from "./steps-data";
import { StepCard } from "./StepCard";
import { StatsCounter } from "./StatsCounter";

const connectorCount = Math.max(0, STEPS.length - 1);

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, {
    once: true,
    margin: "0px 0px -35% 0px",
  });

  const [currentStep, setCurrentStep] = useState(-1);
  const [revealedSteps, setRevealedSteps] = useState<boolean[]>(() => STEPS.map(() => false));
  const [connectorProgress, setConnectorProgress] = useState<number[]>(() => Array(connectorCount).fill(0));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !inView) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setCurrentStep(STEPS.length - 1);
      setRevealedSteps(STEPS.map(() => true));
      setConnectorProgress(Array(connectorCount).fill(1));
      return;
    }

    const timeouts: number[] = [];

    setCurrentStep(-1);
    setRevealedSteps(STEPS.map(() => false));
    setConnectorProgress(Array(connectorCount).fill(0));

    const revealStep = (index: number) => {
      setCurrentStep(index);
      setRevealedSteps((current) => current.map((value, currentIndex) => {
        return currentIndex === index ? true : value;
      }));
    };

    timeouts.push(window.setTimeout(() => {
      revealStep(0);
    }, 320));

    for (let index = 0; index < connectorCount; index += 1) {
      const connectorAt = 1200 + index * 1300;
      const nextCardAt = connectorAt + 700;

      timeouts.push(window.setTimeout(() => {
        setConnectorProgress((current) => current.map((value, currentIndex) => {
          return currentIndex === index ? 1 : value;
        }));
      }, connectorAt));

      timeouts.push(window.setTimeout(() => {
        revealStep(index + 1);
      }, nextCardAt));
    }

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [inView, mounted]);

  return (
    <motion.section
      id="how"
      ref={sectionRef}
      className="bg-white py-20"
      initial={{ opacity: 0.92 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "0px 0px -35% 0px" }}
      transition={{ duration: 0.35 }}
    >
      <div className="shell text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -35% 0px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionEyebrow>How Darji Works</SectionEyebrow>
          <h2 className="mt-2 text-4xl font-black leading-tight text-[var(--darji-ink)] sm:text-5xl">
            5 Simple Steps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[var(--darji-muted)]">
            From pickup to delivery, we make tailoring effortless.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <StepCard
              key={step.title}
              step={step}
              index={index}
              total={STEPS.length}
              revealed={revealedSteps[index] ?? false}
              current={index === currentStep}
              connectorScale={connectorProgress[index] ?? 0}
            />
          ))}
        </div>

        <StatsCounter stats={STATS} />
      </div>
    </motion.section>
  );
}
