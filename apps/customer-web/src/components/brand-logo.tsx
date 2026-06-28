import type { HTMLAttributes } from "react";

type BrandLogoProps = HTMLAttributes<HTMLDivElement> & {
  imageClassName?: string;
};

export function BrandLogo({ className = "", imageClassName = "h-16 w-auto", ...props }: BrandLogoProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} {...props}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,184,38,0.34),rgba(255,112,0,0.16)_42%,transparent_72%)] blur-xl"
      />
      <img
        src="/darji-logo-cropped.png"
        alt="Darji"
        className={`relative z-10 block object-contain drop-shadow-[0_0_10px_rgba(255,177,35,0.62)] drop-shadow-[0_10px_18px_rgba(255,112,0,0.18)] ${imageClassName}`}
      />
    </div>
  );
}
