"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Clock3, PackageCheck, Ruler, Sparkles } from "lucide-react";
import { Suspense, useCallback, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { Group, PerspectiveCamera } from "three";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { CameraController } from "./camera-controller";
import { heroSceneConfig } from "./hero-config";
import { Lighting } from "./lighting";
import { ScrollAnimation } from "./scroll-animation";
import { ShirtModel } from "./shirt-model";
import { TailoringOrbit } from "./tailoring-orbit";

type HeroSceneProps = {
  heroRef: RefObject<HTMLElement | null>;
  howRef: RefObject<HTMLElement | null>;
};

const heroMetricCards = [
  {
    label: "Pickup in",
    value: "30 min",
    helper: "On average",
    icon: Clock3,
    className: "bottom-[14%] right-[2%]",
    delay: "0s"
  },
  {
    label: "Fit check",
    value: "98%",
    helper: "Pattern match",
    icon: Ruler,
    className: "left-[2%] top-[18%] hidden md:block",
    delay: "-1.2s"
  },
  {
    label: "Live stage",
    value: "5 steps",
    helper: "Tracked order",
    icon: PackageCheck,
    className: "right-[4%] top-[16%] hidden lg:block",
    delay: "-2.1s"
  },
  {
    label: "Tailors",
    value: "150+",
    helper: "Verified shops",
    icon: Sparkles,
    className: "bottom-[20%] left-[5%] hidden lg:block",
    delay: "-3s"
  }
];

function LoadingPlaceholder({ visible }: { visible: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="h-28 w-28 rounded-full border border-[#f1d5ba] bg-white/80 shadow-[0_30px_80px_rgba(8,17,31,0.08)] backdrop-blur-md">
        <div className="mx-auto mt-[3.25rem] h-1 w-16 overflow-hidden rounded-full bg-[#ffe2c9]">
          <div className="h-full w-1/2 animate-[hero-loader_1.2s_ease-in-out_infinite] rounded-full bg-[var(--darji-orange)]" />
        </div>
      </div>
    </div>
  );
}

function HeroMetricCards() {
  return (
    <div className="hero-metric-layer pointer-events-none absolute inset-0 z-[38] hidden sm:block">
      {heroMetricCards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`hero-metric-orbit absolute ${card.className}`} style={{ "--metric-delay": card.delay } as CSSProperties}>
            <div className="hero-metric-card">
              <span className="hero-metric-stroke" aria-hidden="true" />
              <span className="hero-metric-icon" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[10px] font-black text-[var(--darji-muted)]">{card.label}</span>
                <span className="mt-0.5 block text-2xl font-black leading-none text-[var(--darji-ink)]">{card.value}</span>
                <span className="mt-1 block text-[10px] font-bold text-[var(--darji-muted)]">{card.helper}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeroScene({ heroRef, howRef }: HeroSceneProps) {
  const sceneShellRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Group>(null);
  const cameraRef = useRef<PerspectiveCamera>(null);
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);

  return (
    <div ref={sceneShellRef} className="hero-scene absolute inset-0 overflow-visible">
      <div className="absolute left-1/2 top-[8%] h-[78%] w-[78%] -translate-x-1/2 rounded-full border border-[#f1d5ba] bg-[linear-gradient(135deg,#fff7ef_0%,#ffffff_58%,#fff1e4_100%)] shadow-[0_36px_100px_rgba(255,112,0,0.08)]" />
      <div className="hero-base pointer-events-none absolute bottom-[5%] left-1/2 z-[8] w-[50%] max-w-[440px] -translate-x-1/2 md:bottom-[6%]">
        <div className="absolute left-[8%] right-[8%] top-[54%] h-3 rounded-full bg-[var(--darji-orange)] opacity-80 blur-sm" />
        <img src={heroSceneConfig.basePath} alt="" aria-hidden="true" className="relative z-10 w-full select-none object-contain drop-shadow-[0_34px_46px_rgba(8,17,31,0.16)]" draggable={false} />
      </div>
      <LoadingPlaceholder visible={!modelReady} />
      <Canvas
        className="relative z-10"
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace
        }}
      >
        <CameraController ref={cameraRef} />
        <Suspense fallback={null}>
          <Lighting />
          <ShirtModel ref={modelRef} onReady={handleModelReady} />
          <ContactShadows opacity={0.26} scale={5.6} blur={2.8} far={4.2} resolution={384} position={[0, -1.62, 0]} color="#0b2241" />
        </Suspense>
      </Canvas>
      <TailoringOrbit />
      <HeroMetricCards />
      <ScrollAnimation heroRef={heroRef} howRef={howRef} modelRef={modelRef} cameraRef={cameraRef} sceneShellRef={sceneShellRef} ready={modelReady} />
    </div>
  );
}
