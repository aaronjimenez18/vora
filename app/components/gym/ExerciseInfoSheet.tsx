"use client";

import type { Exercise } from "../../types";
import { familyLabel, gearLabel } from "@/lib/engine/exercises";

const DIFF_LABEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export default function ExerciseInfoSheet({
  exercise,
  unilateral,
  onClose,
}: {
  exercise: Exercise | null;
  unilateral?: boolean;
  onClose: () => void;
}) {
  if (!exercise) return null;

  const steps = (exercise.how_to ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const tips = (exercise.tips ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const muscles = [exercise.primary_muscle, ...(exercise.secondary_muscles ?? [])]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 pb-24 sm:pb-6 bg-black/75 backdrop-blur-md animate-fade-in-up">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="glass-modal-panel relative w-full max-w-md max-h-[78vh] sm:max-h-[82vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="label-caps block mb-1.5">
              {familyLabel(exercise.family ?? "ejercicio")}
              {exercise.gear ? ` · ${gearLabel(exercise.gear)}` : ""}
            </span>
            <h3 className="font-serif-title text-xl text-[#f4f4f0] tracking-tight">
              {exercise.name}
              {unilateral ? " (a un brazo)" : ""}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-[#f4f4f0] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {muscles && (
            <span className="glass-pill px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#a1a1aa]">
              {muscles}
            </span>
          )}
          {exercise.difficulty && (
            <span className="glass-pill px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#a1a1aa]">
              {DIFF_LABEL[exercise.difficulty] ?? exercise.difficulty}
            </span>
          )}
        </div>

        {steps.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="label-caps">cómo hacerlo</span>
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-xs text-[#a1a1aa] leading-relaxed">
                  <span className="font-mono-num text-[10px] text-[#a3e635] shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {tips.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="label-caps">tips del coach</span>
            <ul className="flex flex-col gap-1.5">
              {tips.map((t, i) => (
                <li key={i} className="flex gap-3 text-xs text-[#a1a1aa] leading-relaxed">
                  <span className="material-symbols-outlined text-[14px] text-[#a3e635] shrink-0">
                    check_circle
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {steps.length === 0 && tips.length === 0 && (
          <p className="text-xs text-[#52525b]">
            El coach todavía no tiene instrucciones para este ejercicio. Llegarán pronto.
          </p>
        )}
      </div>
    </div>
  );
}
