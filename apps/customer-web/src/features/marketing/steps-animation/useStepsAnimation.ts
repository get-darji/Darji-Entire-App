import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { STATS, STEPS } from "./steps-data";

const STEP_COUNT = STEPS.length;
const CONNECTOR_COUNT = Math.max(0, STEP_COUNT - 1);
const STYLE_ID = "steps-animation-transitions";

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .dsw-card {
      opacity: 0.18;
      filter: grayscale(100%) blur(3px);
      transform: scale(0.9);
      transform-origin: center center;
      transition:
        opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
        filter 0.5s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform, filter, opacity;
    }

    .dsw-card[data-active="true"] {
      opacity: 1;
      filter: grayscale(0%) blur(0px);
      transform: scale(1);
      border-color: rgba(249, 115, 22, 0.28);
      box-shadow: 0 24px 60px rgba(249, 115, 22, 0.14);
    }

    .dsw-connector-fill {
      display: block;
      height: 100%;
      transform-origin: left center;
      transform: scaleX(0);
      background-color: var(--darji-orange);
      transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `;
  document.head.appendChild(style);
}

export interface StepsAnimationState {
  sectionRef: React.RefObject<HTMLElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  activeStep: number;
  connectorProgress: number[];
  statValues: string[];
  mounted: boolean;
  entered: boolean;
}

export function useStepsAnimation(): StepsAnimationState {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [connectorProgress, setConnectorProgress] = useState<number[]>(() => Array(CONNECTOR_COUNT).fill(0));
  const [statValues, setStatValues] = useState<string[]>(() => STATS.map((stat) => stat.defaultValue));

  const sectionRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    injectStyles();
  }, []);

  useEffect(() => {
    if (!mounted || entered) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setEntered(true);
      setActiveStep(STEP_COUNT - 1);
      setConnectorProgress(Array(CONNECTOR_COUNT).fill(1));
      setStatValues(STATS.map((stat) => stat.format(stat.targetValue)));
      return;
    }

    let rafId = 0;

    const checkTriggerPosition = () => {
      const element = triggerRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const triggerLine = window.innerHeight * 0.58;
      const hasReachedLine = rect.top <= triggerLine;
      const isStillVisible = rect.bottom >= 0;

      if (hasReachedLine && isStillVisible) {
        setEntered(true);
        return;
      }

      rafId = window.requestAnimationFrame(checkTriggerPosition);
    };

    rafId = window.requestAnimationFrame(checkTriggerPosition);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [entered, mounted]);

  useEffect(() => {
    if (!mounted || !entered) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timeouts: number[] = [];
    const animations: gsap.core.Animation[] = [];
    const counterState = STATS.map(() => ({ value: 0 }));

    setActiveStep(-1);
    setConnectorProgress(Array(CONNECTOR_COUNT).fill(0));
    setStatValues(STATS.map((stat) => stat.format(0)));

    timeouts.push(window.setTimeout(() => {
      setActiveStep(0);
    }, 120));

    for (let index = 0; index < CONNECTOR_COUNT; index += 1) {
      const connectorAt = 420 + index * 620;
      const nextCardAt = connectorAt + 360;

      timeouts.push(window.setTimeout(() => {
        setConnectorProgress((current) => current.map((value, currentIndex) => {
          return currentIndex === index ? 1 : value;
        }));
      }, connectorAt));

      timeouts.push(window.setTimeout(() => {
        setActiveStep(index + 1);
      }, nextCardAt));
    }

    const countersAt = CONNECTOR_COUNT * 620 + 900;
    timeouts.push(window.setTimeout(() => {
      STATS.forEach((stat, index) => {
        const tween = gsap.to(counterState[index], {
          value: stat.targetValue,
          duration: 1.8,
          ease: "power2.out",
          onUpdate() {
            setStatValues((current) => current.map((value, currentIndex) => {
              return currentIndex === index ? stat.format(counterState[index].value) : value;
            }));
          },
        });
        animations.push(tween);
      });
    }, countersAt));

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      animations.forEach((animation) => animation.kill());
    };
  }, [entered, mounted]);

  return {
    sectionRef,
    triggerRef,
    activeStep,
    connectorProgress,
    statValues,
    mounted,
    entered,
  };
}
