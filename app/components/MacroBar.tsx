"use client";

interface MacroDetail {
  label: string;
  consumed: number;
  goal: number;
  unit?: string;
}

interface MacroBarProps {
  label: string;
  consumed: number;
  goal: number;
  unit?: string;
  isPrimary?: boolean;
  secondary?: MacroDetail[];
}

export default function MacroBar({
  label,
  consumed,
  goal,
  unit = "g",
  isPrimary = false,
  secondary = [],
}: MacroBarProps) {
  const pct = Math.min(Math.round((consumed / goal) * 100), 100);
  const remaining = Math.max(goal - consumed, 0);
  const met = consumed >= goal;

  return (
    <section className="px-6 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="label-caps">{label}</span>
        <span className={`text-xs ${met ? "text-[#a3e635]" : "text-[#a1a1aa]"}`}>
          {met ? "cumplida" : `faltan ${remaining} ${unit}`}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`font-serif-title text-4xl tracking-tight ${
            isPrimary ? "text-[#a3e635]" : "text-[#f4f4f0]"
          }`}
        >
          {consumed}
        </span>
        <span className="text-xs text-[#a1a1aa]">
          / {goal} {unit}
        </span>
      </div>

      <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isPrimary ? "bg-[#a3e635]" : "bg-white/40"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {secondary.length > 0 && (
        <p className="text-xs text-[#a1a1aa] hidden sm:block">
          {secondary.map((s, i) => (
            <span key={s.label}>
              {i > 0 && <span className="mx-2 text-[#71717a]">·</span>}
              {s.label}{" "}
              <span className="font-mono-num text-[#f4f4f0]">{s.consumed}</span> / {s.goal}{" "}
              {s.unit ?? "g"}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
