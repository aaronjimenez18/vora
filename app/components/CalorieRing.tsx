"use client";

interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export default function CalorieRing({ consumed, goal }: CalorieRingProps) {
  const remaining = goal - consumed;
  const onTrack = remaining > 0;
  const overGoal = consumed > goal;
  const pctCal = Math.min(Math.round((consumed / goal) * 100), 100);

  const heroNumber = onTrack ? remaining : consumed;
  const stateLabel = onTrack ? "en camino" : overGoal ? "sobre meta" : "meta cumplida";
  const accent = overGoal ? "text-[#f87171]" : "text-[#a3e635]";
  const pillCls = overGoal
    ? "text-[#f87171] border-[#f87171]/30 bg-[#f87171]/10"
    : "text-[#a3e635] border-[#a3e635]/30 bg-[#a3e635]/10";

  return (
    <section className="px-6 pt-6 pb-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="label-caps">calorías restantes</span>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border ${pillCls}`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span className={`font-serif-title text-6xl sm:text-7xl tracking-tight leading-none ${accent}`}>
          {heroNumber.toLocaleString("es-MX")}
        </span>
        <span className="text-2xl font-sans font-light text-[#a1a1aa]">kcal</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-1">
        <div
          className="h-full rounded-full bg-[#a3e635] transition-all duration-700 shadow-[0_0_12px_rgba(163,230,53,0.4)]"
          style={{ width: `${pctCal}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-3 text-xs text-[#a1a1aa]">
        <span>
          {consumed.toLocaleString("es-MX")} de {goal.toLocaleString("es-MX")} consumidas
        </span>
        <span className="font-mono-num text-[#a3e635] shrink-0">{pctCal}%</span>
      </div>
    </section>
  );
}
