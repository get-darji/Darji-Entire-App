"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

const toneClasses = {
  amber: "bg-orange-50 text-orange-700 group-hover/entity:bg-orange-100",
  emerald: "bg-emerald-50 text-emerald-700 group-hover/entity:bg-emerald-100",
  sky: "bg-sky-50 text-sky-700 group-hover/entity:bg-sky-100",
  slate: "bg-slate-100 text-slate-700 group-hover/entity:bg-slate-200"
} as const;

export function EntityLink({
  avatar,
  label,
  onClick,
  subtitle,
  tone = "slate"
}: {
  avatar: ReactNode;
  label: ReactNode;
  onClick: () => void;
  subtitle?: ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <button
      className="group/entity flex max-w-full items-center gap-2.5 rounded-xl p-1 text-left transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      onClick={onClick}
      type="button"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold transition ${toneClasses[tone]}`}>
        {avatar}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-[var(--foreground)]">{label}</span>
        {subtitle ? <span className="block truncate text-xs text-[var(--muted)]">{subtitle}</span> : null}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover/entity:translate-x-0.5 group-hover/entity:opacity-100" />
    </button>
  );
}
