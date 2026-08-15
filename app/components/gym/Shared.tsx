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
  const overGoal = goal > 0 && value > goal;
  const remaining = Math.max(0, goal - value);
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-5 sm:gap-7 py-5 sm:py-7 px-4 sm:px-6">
      {/* ring svg */}
      <div className="relative shrink-0">
        <svg viewBox="0 0 120 120" className="w-28 h-28 sm:w-32 sm:h-32 -rotate-90">
          {/* track */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="5"
          />
          {/* progress */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke={overGoal ? "#f87171" : "#a3e635"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            className="transition-all duration-700"
          />
        </svg>
        {/* porcentaje centrado */}
        <div className="absolute inset-0 flex items-center justify-center rotate-0">
          <span
            className="font-mono-num text-[11px]"
            style={{ color: overGoal ? "#f87171" : "#a3e635" }}
          >
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>

      {/* texto hero */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span
          className="font-serif-title leading-none truncate"
          style={{
            fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
            color: overGoal ? "#f87171" : "#f4f4f0",
          }}
        >
          {Math.round(value).toLocaleString("es-MX")}
        </span>
        <span className="font-mono-num text-[11px] text-[#52525b]">
          / {Math.round(goal).toLocaleString("es-MX")} kcal
        </span>
        <span
          className="font-serif-italic text-sm mt-1.5"
          style={{ color: overGoal ? "#f87171" : "#a3e635" }}
        >
          {overGoal
            ? "sobre meta"
            : remaining === 0
            ? "en camino ✓"
            : `${Math.round(remaining).toLocaleString("es-MX")} restantes`}
        </span>
        <span className="label-caps mt-0.5">{label}</span>
      </div>
    </div>
  );
}

const MACRO_COLOR: Record<string, string> = {
  proteína: "#60a5fa",
  carbohidratos: "#fbbf24",
  grasas: "#fb923c",
};

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
  const done = goal > 0 && consumed >= goal;
  const accent = MACRO_COLOR[label] ?? "#a3e635";

  return (
    <div className="py-3.5 px-4 sm:px-6">
      <div className="flex items-baseline justify-between mb-2.5 gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: accent, opacity: 0.7 }}
          />
          <span className="label-meta">{label}</span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="font-mono-num text-xs text-[#f4f4f0]">
            {Math.round(consumed)}
          </span>
          <span className="font-mono-num text-[10px] text-[#3f3f46]">
            /{Math.round(goal)}g
          </span>
          {done && (
            <span className="font-mono-num text-[9px] tracking-wide" style={{ color: accent }}>
              ✓
            </span>
          )}
        </div>
      </div>
      {/* hairline progress bar */}
      <div className="h-px bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: accent, opacity: 0.75 }}
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
      <div className="min-w-0 flex-1">
        {kicker && <span className="label-caps block mb-1.5">{kicker}</span>}
        <h2 className="font-serif-italic text-xl sm:text-2xl text-[#f4f4f0] truncate">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <div className="glass-floating p-6 sm:p-10 flex flex-col items-center gap-4 text-center w-full min-w-0 max-w-full overflow-hidden">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[22px] text-[#a1a1aa]">{icon}</span>
      </div>
      <span className="label-meta">{title}</span>
      {hint && <span className="text-[10px] text-[#52525b] max-w-full">{hint}</span>}
      {children}
    </div>
  );
}
