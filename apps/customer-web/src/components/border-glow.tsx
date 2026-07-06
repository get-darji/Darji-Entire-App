"use client";

import React, { useState, useRef } from "react";

interface BorderGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  colors?: string[];
  edgeSensitivity?: number;
}

export default function BorderGlow({
  children,
  className = "",
  glowColor = "255 112 0",
  backgroundColor = "#05070a",
  borderRadius = 8,
  glowRadius = 24,
  glowIntensity = 0.75,
  coneSpread = 20,
  colors = ["#ff7a18", "#ffb347", "#ffd166"],
  edgeSensitivity = 24
}: BorderGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const gradientColors = colors.join(", ");

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius: `${borderRadius}px`,
        backgroundColor,
        padding: "1px"
      }}
    >
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          opacity: isHovered ? glowIntensity : 0,
          inset: "-1px",
          borderRadius: `${borderRadius}px`,
          background: `radial-gradient(${glowRadius}px circle at ${coords.x}px ${coords.y}px, rgb(${glowColor}), transparent)`,
          zIndex: 0
        }}
      />

      {isHovered && (
        <div
          className="pointer-events-none absolute animate-[spin_4s_linear_infinite]"
          style={{
            inset: "-100%",
            background: `conic-gradient(from 0deg, ${gradientColors})`,
            opacity: 0.4,
            filter: "blur(2px)",
            zIndex: 0
          }}
        />
      )}

      <div
        className="relative z-10 w-full h-full"
        style={{
          borderRadius: `${borderRadius - 1}px`,
          backgroundColor
        }}
      >
        {children}
      </div>
    </div>
  );
}
