"use client";

import { useApp } from "../context/AppContext";

export default function HydrationTracker() {
  const { state, dispatch } = useApp();
  const { glasses, goal } = state.water;

  const toggle = (index: number) => {
    const newGlasses = index < glasses ? index : index + 1;
    dispatch({ type: "LOG_WATER", glasses: newGlasses });
  };

  const currentLiters = (glasses * 0.25).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
  });
  const targetLiters = (goal * 0.25).toLocaleString("es-MX", {
    minimumFractionDigits: 1,
  });
  const remaining = goal - glasses;
  const met = glasses >= goal;

  return (
    <section className="px-6 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="label-caps">agua</span>
        <span className={`text-xs ${met ? "text-[#a3e635]" : "text-[#a1a1aa]"}`}>
          {met ? "cumplida" : `faltan ${remaining} vasos`}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-serif-title text-4xl tracking-tight text-[#f4f4f0]">
          {currentLiters}
        </span>
        <span className="text-xs text-[#a1a1aa]">/ {targetLiters} L</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {Array.from({ length: goal }).map((_, i) => {
          const filled = i < glasses;
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={filled}
              aria-label={`Vaso de agua ${i + 1} de ${goal}`}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all ${
                filled
                  ? "bg-[#a3e635] text-[#09090b] shadow-[0_4px_16px_rgba(163,230,53,0.3)]"
                  : "bg-white/[0.04] text-[#a1a1aa] hover:bg-white/[0.08]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">water_drop</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
