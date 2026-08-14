"use client";

import type { AnalyzedDecision } from "@/lib/supabase/gym";
import type { ProgressionAction } from "@/app/types";

const ACTION_META: Record<
  ProgressionAction,
  { label: string; cls: string; icon: string }
> = {
  increase_load: { label: "Subir carga", cls: "text-[#a3e635] border-[#a3e635]/40", icon: "trending_up" },
  increase_reps: { label: "Subir reps", cls: "text-[#a3e635] border-[#a3e635]/40", icon: "repeat" },
  switch_variant: { label: "Cambiar variante", cls: "text-[#38bdf8] border-[#38bdf8]/40", icon: "swap_horiz" },
  maintain: { label: "Mantener", cls: "text-[#a1a1aa] border-white/[0.12]", icon: "remove" },
  reduce_load: { label: "Bajar carga", cls: "text-[#fbbf24] border-[#fbbf24]/40", icon: "trending_down" },
  deload: { label: "Descarga", cls: "text-[#a78bfa] border-[#a78bfa]/40", icon: "bedtime" },
  stop: { label: "Detener", cls: "text-[#f87171] border-[#f87171]/40", icon: "warning" },
};

function summaryText(d: AnalyzedDecision["decision"]): string {
  const w = d.to_weight != null ? `${d.to_weight} kg` : null;
  const reps = d.to_reps != null ? `${d.to_reps} reps` : null;
  switch (d.action) {
    case "increase_load":
      return `Sube a ${w ?? "una carga mayor"}${d.pct != null ? ` (+${d.pct}%)` : ""}`;
    case "increase_reps":
      return reps ? `Objetivo de reps: ${reps}` : "Sube una repetición";
    case "switch_variant":
      return "Cambia la variante o a un brazo / una pierna";
    case "maintain":
      return "Mantén la carga y repite el ciclo";
    case "reduce_load":
      return `Baja a ${w ?? "menos carga"}${d.pct != null ? ` (${d.pct}%)` : ""}`;
    case "deload":
      return `Descarga esta semana (${d.remove_set ? "1 serie menos, " : ""}carga moderada)`;
    case "stop":
      return "Detén el ejercicio · valora con un profesional";
  }
}

export default function ProgressionSummary({
  items,
  appliedIds,
  onApply,
  onApplyAll,
  onClose,
}: {
  items: AnalyzedDecision[];
  appliedIds: Set<string>;
  onApply: (id: string) => void;
  onApplyAll: () => void;
  onClose: () => void;
}) {
  const pending = items.filter((i) => !appliedIds.has(i.decision.id));

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6 pb-24 sm:pb-6 bg-black/75 backdrop-blur-md animate-fade-in-up">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="glass-modal-panel relative w-full max-w-md max-h-[78vh] sm:max-h-[82vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="label-caps block mb-1.5">análisis de la sesión</span>
            <h3 className="font-serif-title text-xl text-[#f4f4f0] tracking-tight">
              Progresión sugerida
            </h3>
            <p className="text-xs text-[#a1a1aa] mt-1">
              Nada se aplica sin tu confirmación.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-[#f4f4f0] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-[#52525b]">
            No hay series registradas para analizar.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((i) => {
              const meta = ACTION_META[i.decision.action];
              const applied = appliedIds.has(i.decision.id);
              return (
                <div
                  key={i.decision.id}
                  className={`glass-floating p-4 flex flex-col gap-2 ${applied ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-sm text-[#f4f4f0] font-medium truncate">
                        {i.exercise?.name ?? "Ejercicio"}
                      </span>
                      <span className="label-caps !text-[8px] mt-0.5 block">
                        {summaryText(i.decision)}
                      </span>
                    </div>
                    <span
                      className={`glass-pill px-2.5 py-1 text-[10px] uppercase tracking-wider border flex items-center gap-1 shrink-0 ${meta.cls}`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#a1a1aa] leading-relaxed">
                    {i.decision.rationale[0]}
                  </span>
                  {!applied && (
                    <button
                      onClick={() => onApply(i.decision.id)}
                      className="btn-pill-secondary w-full py-2 text-xs"
                    >
                      Aplicar
                    </button>
                  )}
                  {applied && (
                    <span className="text-[11px] text-[#a3e635] text-center">
                      Aplicado al plan
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pending.length > 0 && (
          <button onClick={onApplyAll} className="btn-pill-primary w-full py-3">
            Aplicar todo ({pending.length})
          </button>
        )}
      </div>
    </div>
  );
}
