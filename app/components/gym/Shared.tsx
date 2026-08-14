"use client";

import type { ReactNode } from "react";

export function Ring({
  value,
  goal,
  label,
}: {
  value: number;
  goal: number;
  label: string;
}) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5 py-6 px-5">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#a3e635"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="flex flex-col gap-1">
        <span className="font-mono-num text-3xl text-[#f4f4f0]">
          {Math.round(value).toLocaleString("es-MX")}
        </span>
        <span className="font-mono-num text-xs text-[#71717a]">de {Math.round(goal).toLocaleString("es-MX")}</span>
        <span className="label-caps mt-1">{label}</span>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  consumed,
  goal,
}: {
  label: string;
  consumed: number;
  goal: number;
}) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  return (
    <div className="py-3.5 px-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#a1a1aa]">{label}</span>
        <span className="font-mono-num text-xs text-[#f4f4f0]">
          {Math.round(consumed)}
          <span className="text-[#52525b]"> / {Math.round(goal)}g</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#a3e635] transition-all duration-700"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

export function SectionHeader({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {kicker && <span className="label-caps block mb-1">{kicker}</span>}
        <h2 className="font-serif-title text-xl text-[#f4f4f0] tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Empty({
  icon,
  title,
  hint,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass-floating p-8 flex flex-col items-center gap-3 text-center">
      <span className="material-symbols-outlined text-[28px] text-[#a1a1aa]">{icon}</span>
      <span className="text-xs text-[#a1a1aa]">{title}</span>
      {hint && <span className="text-[10px] text-[#52525b]">{hint}</span>}
      {children}
    </div>
  );
}
