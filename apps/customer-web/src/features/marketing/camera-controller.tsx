"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo } from "react";
import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { Vector3 } from "three";
import { heroSceneConfig } from "./hero-config";

export const CameraController = forwardRef<PerspectiveCameraImpl>(function CameraController(_, ref) {
  const target = useMemo(() => new Vector3(...heroSceneConfig.camera.target), []);

  useFrame(({ camera }) => {
    camera.lookAt(target);
  });

  return (
    <PerspectiveCamera
      ref={ref}
      makeDefault
      fov={heroSceneConfig.camera.fov}
      position={heroSceneConfig.camera.initial}
      near={0.1}
      far={80}
    />
  );
});
