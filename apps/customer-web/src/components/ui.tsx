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
    primary: "bg-[var(--darji-orange)] text-white shadow-md hover:bg-[#e66500] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    secondary: "border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-secondary)] hover:-translate-y-0.5 active:translate-y-0",
    ghost: "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
  };
  return (
    <button
      {...props}
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring group inline-flex items-center gap-2 rounded-full text-sm font-bold text-[var(--color-text-primary)] transition hover:text-[var(--color-primary)]">
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-primary)]">{children}</p>;
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/75 p-8 text-center shadow-sm">
      <p className="text-base font-bold text-[var(--color-text-primary)]">{title}</p>
      <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[var(--color-text-muted)]">{copy}</p>
    </div>
  );
}

export function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] transition-colors duration-200";

