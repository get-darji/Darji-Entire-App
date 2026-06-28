"use client";

export function Lighting() {
  return (
    <>
      <hemisphereLight intensity={1.08} color="#ffffff" groundColor="#f0d6bf" />
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        intensity={3.35}
        position={[3.6, 4.4, 4.8]}
        shadow-bias={-0.00012}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight intensity={0.85} position={[-4.2, 2.2, 3.4]} color="#fff7eb" />
      <pointLight intensity={1.05} position={[-2.6, 1.8, -2.8]} color="#ffffff" />
      <spotLight
        angle={0.42}
        decay={1.3}
        distance={8}
        intensity={1.6}
        penumbra={0.9}
        position={[0, 5.2, 2.2]}
        color="#fff9ee"
      />
    </>
  );
}
