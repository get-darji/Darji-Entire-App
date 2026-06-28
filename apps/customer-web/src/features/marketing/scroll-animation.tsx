"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import type { RefObject } from "react";
import type { Group, PerspectiveCamera } from "three";
import { heroSceneConfig } from "./hero-config";

type ScrollAnimationProps = {
  heroRef: RefObject<HTMLElement | null>;
  howRef: RefObject<HTMLElement | null>;
  modelRef: RefObject<Group | null>;
  cameraRef: RefObject<PerspectiveCamera | null>;
  sceneShellRef: RefObject<HTMLDivElement | null>;
  ready: boolean;
};

export function ScrollAnimation({ heroRef, howRef, modelRef, cameraRef, sceneShellRef, ready }: ScrollAnimationProps) {
  useEffect(() => {
    if (!ready) return;

    gsap.registerPlugin(ScrollTrigger);

    const hero = heroRef.current;
    const how = howRef.current;
    const model = modelRef.current;
    const camera = cameraRef.current;
    const sceneShell = sceneShellRef.current;

    if (!hero || !how || !model || !camera || !sceneShell) return;

    const ctx = gsap.context(() => {
      gsap.set(sceneShell, { opacity: 1, scale: 1, filter: "blur(0px)" });
      gsap.set(model.rotation, { x: 0, y: 0, z: 0 });
      gsap.set(camera.position, { x: heroSceneConfig.camera.initial[0], y: heroSceneConfig.camera.initial[1], z: heroSceneConfig.camera.initial[2] });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=220%",
          scrub: 0.68,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      timeline
        .to(model.rotation, { y: heroSceneConfig.scroll.rotate15, duration: 0.18 }, 0)
        .to(camera.position, { x: 0.2, y: 0.11, z: 4, duration: 0.18 }, 0)
        .to(model.rotation, { y: heroSceneConfig.scroll.rotate30, duration: 0.2 }, 0.18)
        .to(camera.position, { x: heroSceneConfig.scroll.cameraShift, z: heroSceneConfig.scroll.cameraZoom, duration: 0.2 }, 0.18)
        .to(model.rotation, { y: heroSceneConfig.scroll.backView, duration: 0.24 }, 0.42)
        .to(camera.position, { x: -0.3, y: 0.06, z: 3.72, duration: 0.24 }, 0.42)
        .to(model.rotation, { y: heroSceneConfig.scroll.threeQuarter, duration: 0.24 }, 0.66)
        .to(camera.position, { x: 0.24, y: 0.12, z: 3.9, duration: 0.24 }, 0.66)
        .to(model.rotation, { y: Math.PI * 2.08, duration: 0.14 }, 0.9)
        .to(camera.position, { x: 0.06, y: 0.08, z: 4.1, duration: 0.14 }, 0.9)
        .to(sceneShell, { opacity: 0, scale: 0.92, filter: "blur(10px)", duration: 0.12 }, 0.98);

      ScrollTrigger.refresh();
    }, sceneShell);

    return () => ctx.revert();
  }, [cameraRef, heroRef, howRef, modelRef, ready, sceneShellRef]);

  return null;
}
