"use client";

import { useApp } from "../context/AppContext";

const DAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export default function AnalyticsView() {
  const { state } = useApp();
  const { analytics, goals, weights } = state;

  const maxCal = Math.max(...analytics.map((d) => d.calories), goals.calories);
  const latestWeight = weights[weights.length - 1]?.weight ?? 77.5;
  const startWeight = weights[0]?.weight ?? 78.5;
  const deltaWeight = (startWeight - latestWeight).toFixed(1);

  return (
    <div className="flex flex-col gap-12 pb-32 animate-fade-in-up">
      {/* Editorial Title */}
      <div className="flex flex-col gap-2">
        <span className="label-caps">Reporte de Desempeño</span>
        <h2 className="font-serif-title text-4xl text-[#f4f4f0] font-normal">
          Progreso & <span className="italic text-[#a3e635] font-light">Tendencias</span>
        </h2>
        <p className="text-sm text-[#a1a1aa] max-w-lg font-light leading-relaxed">
          Análisis continuo de tu ingesta calórica semanal, distribución de macronutrientes y peso corporal.
        </p>
      </div>

      {/* Hero Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06]">
        <div>
          <span className="label-caps block mb-2">Peso Corporal Actual</span>
          <div className="font-serif-title text-5xl text-[#f4f4f0]">
            {latestWeight} <span className="text-xl text-[#a3e635] font-sans font-light">kg</span>
          </div>
          <p className="text-xs text-[#71717a] mt-2">
            Reducción de <strong className="text-[#a3e635]">{deltaWeight} kg</strong> en los últimos 14 días.
          </p>
        </div>

        <div>
          <span className="label-caps block mb-2">Promedio Calórico Semanal</span>
          <div className="font-serif-title text-5xl text-[#f4f4f0]">
            {Math.round(analytics.reduce((s, d) => s + d.calories, 0) / analytics.length)}{" "}
            <span className="text-xl text-[#71717a] font-sans font-light">kcal/día</span>
          </div>
          <p className="text-xs text-[#71717a] mt-2">
            Meta objetivo: <strong className="text-[#f4f4f0]">{goals.calories} kcal</strong>
          </p>
        </div>
      </div>

      {/* Spacious Bar Chart */}
      <div className="glass-floating p-8 flex flex-col gap-6">
        <span className="label-caps">Distribución Calórica por Día</span>

        <div className="flex items-end gap-4 h-36 pt-6 border-b border-white/[0.08]">
          {analytics.map((day, i) => {
            const pct = (day.calories / maxCal) * 100;
            const isToday = i === analytics.length - 1;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                <div
                  className={`w-full rounded-lg transition-all duration-500 ${
                    isToday
                      ? "bg-[#a3e635] shadow-[0_0_16px_rgba(163,230,53,0.3)]"
                      : "bg-white/[0.08]"
                  }`}
                  style={{ height: `${pct}%` }}
                />
                <span
                  className={`text-xs ${
                    isToday ? "text-[#a3e635] font-semibold" : "text-[#71717a]"
                  }`}
                >
                  {DAYS[new Date(day.date).getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
