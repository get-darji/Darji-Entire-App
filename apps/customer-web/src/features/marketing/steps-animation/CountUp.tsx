"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface CountUpProps {
  value: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}

export function CountUp({ value, duration = 1.8, suffix = "", decimals }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const resolvedDecimals = decimals ?? (value % 1 !== 0 ? 1 : 0);

  useEffect(() => {
    if (!ref.current) return;
    const target = { val: 0 };
    const tween = gsap.to(target, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) {
          const formattedVal = resolvedDecimals > 0 
            ? target.val.toFixed(resolvedDecimals)
            : Math.round(target.val).toLocaleString("en-IN");
          ref.current.textContent = `${formattedVal}${suffix}`;
        }
      }
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, suffix, resolvedDecimals]);

  return <span ref={ref}>0{suffix}</span>;
}
