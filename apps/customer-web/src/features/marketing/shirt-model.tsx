"use client";

import { Center, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, Object3D } from "three";
import { MeshPhysicalMaterial } from "three";
import { SkeletonUtils } from "three-stdlib";
import { heroSceneConfig } from "./hero-config";

function createShirtMaterial() {
  return new MeshPhysicalMaterial({
    color: "#fbf7ef",
    roughness: 0.58,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.72,
    sheen: 0.42,
    sheenColor: "#ffffff",
    sheenRoughness: 0.76
  });
}

function tuneModel(object: Object3D) {
  const shirtMaterial = createShirtMaterial();

  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = shirtMaterial;
  });

  return shirtMaterial;
}

type ShirtModelProps = {
  onReady?: () => void;
};

export const ShirtModel = forwardRef<Group, ShirtModelProps>(function ShirtModel({ onReady }, ref) {
  const { scene } = useGLTF(heroSceneConfig.modelPath);
  const floatingRef = useRef<Group>(null);
  const idleRef = useRef<Group>(null);
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  useEffect(() => {
    const shirtMaterial = tuneModel(model);
    onReady?.();
    return () => {
      model.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
      });
      shirtMaterial.dispose();
    };
  }, [model, onReady]);

  const pointerRef = useRef({ x: 0, y: 0 });

  useFrame(({ clock, pointer }) => {
    const elapsed = clock.elapsedTime;
    pointerRef.current.x += (pointer.x - pointerRef.current.x) * 0.035;
    pointerRef.current.y += (pointer.y - pointerRef.current.y) * 0.035;

    if (floatingRef.current) {
      floatingRef.current.position.y = Math.sin(elapsed * 0.86) * 0.075;
    }
    if (idleRef.current) {
      idleRef.current.rotation.y = Math.sin(elapsed * 0.34) * 0.045 + pointerRef.current.x * 0.055;
      idleRef.current.rotation.x = Math.sin(elapsed * 0.42) * 0.018 - pointerRef.current.y * 0.04;
      idleRef.current.rotation.z = Math.sin(elapsed * 0.31) * 0.012 + pointerRef.current.x * 0.015;
    }
  });

  return (
    <group ref={ref} position={heroSceneConfig.model.position} scale={heroSceneConfig.model.scale}>
      <group ref={floatingRef}>
        <group ref={idleRef}>
          <Center>
            <primitive object={model} />
          </Center>
        </group>
      </group>
    </group>
  );
});

useGLTF.preload(heroSceneConfig.modelPath);
