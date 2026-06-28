"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";

function FloatingGarment() {
  const groupRef = useRef<Mesh>(null);
  const buttons = useMemo(() => [-0.34, 0, 0.34], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.28;
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.28) * 0.08;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.75) * 0.12;
  });

  return (
    <mesh ref={groupRef}>
      <group>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.28, 1.55, 0.12]} />
          <meshStandardMaterial color="#fff7e8" roughness={0.42} metalness={0.05} />
        </mesh>
        <mesh position={[-0.85, 0.38, 0]} rotation={[0, 0, -0.45]}>
          <boxGeometry args={[0.56, 1.04, 0.1]} />
          <meshStandardMaterial color="#f8dfb1" roughness={0.46} />
        </mesh>
        <mesh position={[0.85, 0.38, 0]} rotation={[0, 0, 0.45]}>
          <boxGeometry args={[0.56, 1.04, 0.1]} />
          <meshStandardMaterial color="#f8dfb1" roughness={0.46} />
        </mesh>
        <mesh position={[0, 0.86, 0.08]}>
          <torusGeometry args={[0.26, 0.045, 18, 40, Math.PI]} />
          <meshStandardMaterial color="#0b2241" roughness={0.32} />
        </mesh>
        {buttons.map((y) => (
          <mesh key={y} position={[0, y, 0.09]}>
            <sphereGeometry args={[0.045, 24, 24]} />
            <meshStandardMaterial color="#f6a313" roughness={0.2} metalness={0.1} />
          </mesh>
        ))}
        <mesh position={[0, -0.06, 0.105]}>
          <boxGeometry args={[0.03, 1.18, 0.02]} />
          <meshStandardMaterial color="#efcf92" roughness={0.4} />
        </mesh>
      </group>
    </mesh>
  );
}

export function ClothingScene() {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-[2rem] border border-[#efcf92] bg-[#fff7e8] shadow-[0_32px_90px_rgba(246,163,19,0.16)]">
      <Canvas camera={{ position: [0, 0, 4.2], fov: 46 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 3, 4]} intensity={2.4} />
        <pointLight position={[-2, -1, 3]} intensity={0.9} color="#f6a313" />
        <FloatingGarment />
      </Canvas>
    </div>
  );
}
