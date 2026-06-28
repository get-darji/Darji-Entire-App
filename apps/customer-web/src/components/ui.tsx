import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  loading,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; loading?: boolean }) {
  const variants = {
    primary: "bg-[var(--darji-ink)] text-white shadow-[0_18px_40px_rgba(8,17,31,0.22)] hover:-translate-y-0.5 hover:shadow-[0_24px_46px_rgba(8,17,31,0.28)]",
    secondary: "border border-[#efcf92] bg-[#fff7e8] text-[var(--darji-ink)] hover:-translate-y-0.5",
    ghost: "bg-white/70 text-[var(--darji-blue)] hover:bg-white"
  };
  return (
    <button
      {...props}
      className={`focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition disabled:opacity-55 ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring group inline-flex items-center gap-2 rounded-full text-sm font-black text-[var(--darji-blue)]">
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </Link>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--darji-orange)]">{children}</p>;
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#dce4ef] bg-white/75 p-8 text-center">
      <p className="text-lg font-black text-[var(--darji-ink)]">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--darji-muted)]">{copy}</p>
    </div>
  );
}

export function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[var(--darji-muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring min-h-12 w-full rounded-2xl border border-[#dce4ef] bg-white px-4 text-sm font-bold text-[var(--darji-ink)] shadow-sm placeholder:text-[#8a96a8]";
