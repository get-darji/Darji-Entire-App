"use client";

import { useEffect, useRef } from "react";
import { heroSceneConfig } from "./hero-config";

type OrbitPoint = {
  x: number;
  y: number;
  depth: number;
};

type OrbitSpec = {
  key: string;
  src: string;
  className: string;
  radiusX: number;
  radiusY: number;
  mobileRadiusX: number;
  mobileRadiusY: number;
  speed: number;
  phase: number;
  spin: number;
  height: number;
  depth: number;
};

const orbitItems: OrbitSpec[] = [
  {
    key: "thread",
    src: heroSceneConfig.threadRollPath,
    className: "w-[92px] md:w-[116px]",
    radiusX: 280,
    radiusY: 118,
    mobileRadiusX: 140,
    mobileRadiusY: 64,
    speed: 0.00018,
    phase: 2.86,
    spin: 0.018,
    height: -18,
    depth: 0.22
  },
  {
    key: "scissors",
    src: heroSceneConfig.scissorsPath,
    className: "w-[112px] md:w-[152px]",
    radiusX: 236,
    radiusY: 96,
    mobileRadiusX: 122,
    mobileRadiusY: 52,
    speed: 0.00024,
    phase: 5.28,
    spin: -0.012,
    height: -98,
    depth: 0.18
  },
  {
    key: "button-1",
    src: heroSceneConfig.buttonsPath,
    className: "w-[42px] md:w-[58px]",
    radiusX: 148,
    radiusY: 62,
    mobileRadiusX: 74,
    mobileRadiusY: 34,
    speed: 0.00034,
    phase: 0.52,
    spin: 0.024,
    height: 120,
    depth: 0.1
  },
  {
    key: "button-2",
    src: heroSceneConfig.buttonsPath,
    className: "w-[34px] md:w-[48px]",
    radiusX: 104,
    radiusY: 46,
    mobileRadiusX: 56,
    mobileRadiusY: 28,
    speed: -0.00038,
    phase: 2.2,
    spin: -0.03,
    height: 36,
    depth: 0.08
  },
  {
    key: "button-3",
    src: heroSceneConfig.buttonsPath,
    className: "w-[30px] md:w-[42px]",
    radiusX: 180,
    radiusY: 72,
    mobileRadiusX: 86,
    mobileRadiusY: 38,
    speed: 0.00028,
    phase: 4.02,
    spin: 0.02,
    height: 74,
    depth: 0.12
  }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildThreadPath(point: OrbitPoint, anchor: OrbitPoint, index: number) {
  const behind = clamp((-point.depth - 0.08) / 0.92, 0, 1);
  const retreat = behind * 0.42;
  const endX = point.x + (anchor.x - point.x) * retreat;
  const endY = point.y + (anchor.y - point.y) * retreat;
  const distanceX = endX - anchor.x;
  const distanceY = endY - anchor.y;
  const lift = (index % 2 === 0 ? -1 : 1) * (18 + Math.abs(distanceX) * 0.035);
  const controlOneX = anchor.x + distanceX * 0.32;
  const controlOneY = anchor.y + distanceY * 0.2 + lift;
  const controlTwoX = anchor.x + distanceX * 0.68;
  const controlTwoY = anchor.y + distanceY * 0.82 - lift * 0.45;

  return `M ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)} C ${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)} ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

export function TailoringOrbit() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLImageElement | null>>([]);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const stringRefs = useRef<Array<SVGPathElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const container = containerRef.current;
      if (!container) {
        frame = requestAnimationFrame(animate);
        return;
      }

      const elapsed = now - startedAt;
      const isMobile = window.innerWidth < 768;
      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight * 0.49;
      const points: OrbitPoint[] = [];
      const anchor = {
        x: centerX + (isMobile ? -18 : -42),
        y: centerY + (isMobile ? 18 : 28) + Math.sin(elapsed * 0.0012) * 5,
        depth: 0
      };
      const needleX = centerX + (isMobile ? -136 : -286);
      const needleY = centerY + (isMobile ? 10 : 4) + Math.sin(elapsed * 0.001) * 8;
      const needleSpin = 42 + Math.sin(elapsed * 0.0012) * 7;

      orbitItems.forEach((item, index) => {
        const element = itemRefs.current[index];
        if (!element) return;

        const theta = item.phase + elapsed * item.speed;
        const radiusX = isMobile ? item.mobileRadiusX : item.radiusX;
        const radiusY = isMobile ? item.mobileRadiusY : item.radiusY;
        const depth = Math.sin(theta);
        const x = Math.cos(theta) * radiusX;
        const y = Math.sin(theta) * radiusY + item.height + Math.sin(elapsed * 0.0011 + index) * 5;
        const scale = 0.86 + (depth + 1) * item.depth;
        const spin = elapsed * item.spin + depth * 12;
        const behind = depth < -0.12;
        points.push({ x: centerX + x, y: centerY + y, depth });

        element.style.zIndex = behind ? "4" : "24";
        element.style.opacity = behind ? "0.72" : "0.98";
        element.style.filter = behind ? "blur(0.35px) drop-shadow(0 16px 24px rgba(8,17,31,0.12))" : "drop-shadow(0 18px 28px rgba(8,17,31,0.16))";
        element.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale}) rotate(${spin}deg)`;
      });

      const needle = needleRef.current;
      if (needle) {
        needle.style.left = `${needleX}px`;
        needle.style.top = `${needleY}px`;
        needle.style.transform = `translate3d(-50%, -50%, 0) rotate(${needleSpin}deg)`;
      }

      points.forEach((point, index) => {
        const string = stringRefs.current[index];
        if (!string) return;

        const depthOpacity = 0.16 + clamp((point.depth + 1) / 2, 0, 1) * 0.42;
        string.setAttribute("d", buildThreadPath(point, anchor, index));
        string.style.opacity = depthOpacity.toFixed(2);
      });

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible">
      <svg className="tailor-string-svg absolute inset-0 z-[9] h-full w-full overflow-visible" aria-hidden="true">
        {orbitItems.map((item, index) => (
          <path
            key={`${item.key}-thread`}
            ref={(node) => {
              stringRefs.current[index] = node;
            }}
            className="tailor-string-main"
          />
        ))}
      </svg>
      <div ref={needleRef} className="tailor-needle absolute z-[28]" aria-hidden="true">
        <span className="tailor-needle-eye" />
        <span className="tailor-needle-point" />
      </div>
      {orbitItems.map((item, index) => (
        <img
          key={item.key}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          alt=""
          aria-hidden="true"
          src={item.src}
          className={`absolute left-1/2 top-[49%] select-none object-contain will-change-transform ${item.className}`}
          draggable={false}
        />
      ))}
    </div>
  );
}
