"use client";

import { useMemo, useState } from "react";
import type { Exercise, Experience } from "../../types";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";import {
  DIFFICULTY_RANK,
  EquipmentTier,
  ExerciseTemplate,
  Gear,
  MovementPattern,
  equipmentTier,
  familyLabel,
  gearLabel,
  maxDifficultyFor,
} from "@/lib/engine/exercises";
import { defaultVolume, recommendForDay } from "@/lib/engine/workout";
import ExerciseInfoSheet from "./ExerciseInfoSheet";

export interface PickerSelection {
  exercise: Exercise;
  unilateral: boolean;
  volume: { sets: number; repsLow: number; repsHigh: number; rir: number };
}

interface Props {
  mode: "add" | "swap";
  focus?: string;
  swapFamily?: string;
  experience: Experience;
  userTier: string;
  catalog: Exercise[];
  existingSlugs: Set<string>;
  onSelect: (sel: PickerSelection) => void;
  onClose: () => void;
}

function toTemplate(e: Exercise): ExerciseTemplate {
  return {
    slug: e.slug ?? e.id,
    name: e.name,
    muscle: e.primary_muscle ?? "",
    secondary: e.secondary_muscles ?? [],
    equipment: (e.equipment as EquipmentTier) ?? "gym",
    gear: (e.gear as Gear) ?? "dumbbell",
    family: e.family ?? "otros",
    difficulty: e.difficulty ?? "beginner",
    pattern: (e.movement_pattern as MovementPattern) ?? "push",
    variation_group: e.variation_group ?? "",
    unilateral_support: e.unilateral_support ?? false,
    cues: e.cues,
    how_to: e.how_to,
    tips: e.tips,
  };
}

function num(s: string, fb: number) {
  const v = Number(s);
  return Number.isFinite(v) ? v : fb;
}

export default function ExercisePicker({
  mode,
  focus,
  swapFamily,
  experience,
  userTier,
  catalog,
  existingSlugs,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [unilateral, setUnilateral] = useState(false);
  const [vol, setVol] = useState({ sets: "3", repsLow: "10", repsHigh: "12", rir: "2" });
  const [info, setInfo] = useState<Exercise | null>(null);

  useLockBodyScroll(true);

  const families = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of catalog) {
      const f = e.family ?? "otros";
      const list = map.get(f) ?? [];
      list.push(e);
      map.set(f, list);
    }
    return [...map.entries()].map(([family, variants]) => ({ family, variants }));
  }, [catalog]);

  const eligible = (e: Exercise) => {
    const t = toTemplate(e);
    return (
      equipmentTier(t.equipment) <= equipmentTier(userTier as EquipmentTier) &&
      DIFFICULTY_RANK[t.difficulty] <= maxDifficultyFor(experience)
    );
  };

  const recommended = useMemo(() => {
    if (mode === "swap" || swapFamily) return [];
    const recs = recommendForDay(
      (focus as NonNullable<Parameters<typeof recommendForDay>[0]>) ?? "full_body",
      experience,
      userTier as EquipmentTier,
      [...existingSlugs]
    );
    return recs.map((r) => r.family);
  }, [mode, focus, swapFamily, experience, userTier, existingSlugs]);

  const visible = useMemo(() => {
    const list = swapFamily
      ? families.filter((f) => f.family === swapFamily)
      : families;
    if (!query.trim()) return list;
    const q = query.toLowerCase().trim();
    return list.filter((f) => {
      if (familyLabel(f.family).toLowerCase().includes(q)) return true;
      return f.variants.some((v) =>
        (v.name + " " + (v.primary_muscle ?? "")).toLowerCase().includes(q)
      );
    });
  }, [families, swapFamily, query]);

  const ordered = useMemo(() => {
    const byKey = new Map(visible.map((f) => [f.family, f]));
    const out: typeof visible = [];
    for (const f of recommended) {
      const fam = byKey.get(f);
      if (fam && !swapFamily) out.push(fam);
    }
    for (const f of visible) if (!out.includes(f)) out.push(f);
    return out;
  }, [visible, recommended, swapFamily]);

  function pick(e: Exercise) {
    setSelected(e);
    setUnilateral(false);
    const v = defaultVolume(experience, toTemplate(e));
    setVol({
      sets: String(v.sets),
      repsLow: String(v.repsLow),
      repsHigh: String(v.repsHigh),
      rir: String(v.rir),
    });
  }

  function confirm() {
    if (!selected) return;
    onSelect({
      exercise: selected,
      unilateral,
      volume: {
        sets: num(vol.sets, 3),
        repsLow: num(vol.repsLow, 10),
        repsHigh: num(vol.repsHigh, 12),
        rir: num(vol.rir, 2),
      },
    });
  }

  const familyCard = (family: string, variants: Exercise[], section: "recommended" | "all") => (
    <div key={family} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#f4f4f0] font-medium">{familyLabel(family)}</span>
        {section === "recommended" && (
          <span className="label-caps !text-[8px] text-[#a3e635]">recomendado</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.filter(eligible).map((v) => {
          const taken = mode === "add" && existingSlugs.has(v.slug ?? v.id);
          const active = selected?.id === v.id;
          return (
            <button
              key={v.id}
              disabled={taken}
              onClick={() => pick(v)}
              className={`px-3.5 py-2 rounded-full text-[11px] font-medium border transition-all ${
                active
                  ? "bg-[#a3e635] text-[#09090b] border-[#a3e635]"
                  : taken
                    ? "bg-white/[0.02] text-[#3f3f46] border-white/[0.05] cursor-not-allowed"
                    : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.1] hover:text-[#f4f4f0] hover:border-white/[0.2]"
              }`}
            >
              {gearLabel(v.gear) || "Ejercicio"}
              {taken ? " · en plan" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 pb-24 sm:pb-6 bg-black/75 backdrop-blur-md animate-fade-in-up">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="glass-modal-panel relative w-full max-w-md max-h-[78dvh] sm:max-h-[82dvh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <span className="label-caps block mb-1">
              {mode === "swap"
                ? swapFamily
                  ? `cambiar · ${familyLabel(swapFamily)}`
                  : "cambiar ejercicio"
                : "agregar ejercicio"}
            </span>
            <h3 className="font-serif-title text-lg text-[#f4f4f0] tracking-tight">
              {mode === "add" ? "Elige un ejercicio" : "Elige la variante"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-[#f4f4f0] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o músculo…"
            className="input-pill w-full text-xs"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-5">
          {ordered.length === 0 && (
            <p className="text-xs text-[#52525b] py-6 text-center">
              No hay ejercicios que coincidan.
            </p>
          )}
          {ordered.map((f) =>
            familyCard(
              f.family,
              f.variants,
              recommended.includes(f.family) && !swapFamily ? "recommended" : "all"
            )
          )}
        </div>

        {/* Confirm bar */}
        {selected ? (
          <div className="border-t border-white/[0.06] px-6 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-sm text-[#f4f4f0] font-medium truncate">
                  {selected.name}
                  {unilateral ? " (a un brazo)" : ""}
                </span>
                <span className="label-caps !text-[8px] mt-0.5 block">
                  {gearLabel(selected.gear)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selected.how_to || selected.tips ? (
                  <button
                    onClick={() => setInfo(selected)}
                    className="text-[#71717a] hover:text-[#a3e635] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">info</span>
                  </button>
                ) : null}
                <button
                  onClick={() => setSelected(null)}
                  className="btn-pill-secondary !px-3 !py-1.5 text-xs"
                >
                  Quitar
                </button>
              </div>
            </div>

            {toTemplate(selected).unilateral_support && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#a1a1aa]">Unilateral</span>
                <button
                  onClick={() => setUnilateral(false)}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-all ${
                    !unilateral
                      ? "bg-[#a3e635] text-[#09090b] border-[#a3e635]"
                      : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.1]"
                  }`}
                >
                  Ambos
                </button>
                <button
                  onClick={() => setUnilateral(true)}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-all ${
                    unilateral
                      ? "bg-[#a3e635] text-[#09090b] border-[#a3e635]"
                      : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.1]"
                  }`}
                >
                  A un brazo
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
              <span>series</span>
              <input
                type="number"
                inputMode="numeric"
                value={vol.sets}
                onChange={(e) => setVol({ ...vol, sets: e.target.value })}
                className="input-pill !py-1.5 w-14 !text-center text-xs"
              />
              <span>reps</span>
              <input
                type="number"
                inputMode="numeric"
                value={vol.repsLow}
                onChange={(e) => setVol({ ...vol, repsLow: e.target.value })}
                className="input-pill !py-1.5 w-14 !text-center text-xs"
              />
              <span>–</span>
              <input
                type="number"
                inputMode="numeric"
                value={vol.repsHigh}
                onChange={(e) => setVol({ ...vol, repsHigh: e.target.value })}
                className="input-pill !py-1.5 w-14 !text-center text-xs"
              />
              <span>rir</span>
              <input
                type="number"
                inputMode="numeric"
                value={vol.rir}
                onChange={(e) => setVol({ ...vol, rir: e.target.value })}
                className="input-pill !py-1.5 w-14 !text-center text-xs"
              />
            </div>

            <button onClick={confirm} className="btn-pill-primary w-full py-3">
              {mode === "swap" ? "Cambiar ejercicio" : "Agregar al día"}
            </button>
          </div>
        ) : null}
      </div>

      {info && <ExerciseInfoSheet exercise={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
