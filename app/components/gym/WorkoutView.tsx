"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useApp } from "../../context/AppContext";
import type { Estimated1RM, Exercise, PlannedExercise, WorkoutDay } from "../../types";
import {
  addPlannedExercise,
  analyzeSession,
  applyDecision,
  createSession,
  fetchActiveWorkout,
  fetchExercises,
  fetchLatestE1RMs,
  fetchSessionsForDay,
  removePlannedExercise,
  saveSessionLogs,
  updatePlannedExercise,
  type AnalyzedDecision,
} from "@/lib/supabase/gym";
import { classify, rirTargets, type ExerciseRef } from "@/lib/engine/progression";
import { SectionHeader, Empty } from "./Shared";
import ExercisePicker, { type PickerSelection } from "./ExercisePicker";
import ExerciseInfoSheet from "./ExerciseInfoSheet";
import ProgressionSummary from "./ProgressionSummary";

interface SetRow {
  weight: string;
  reps: string;
  rir: string;
  velocity: "fast" | "normal" | "slow";
  technique: boolean;
  pain: "green" | "yellow" | "red";
  technicalFailure: boolean;
}

interface VolDraft {
  sets: string;
  repsLow: string;
  repsHigh: string;
  rir: string;
}

function initVolRow(ex: PlannedExercise): VolDraft {
  return {
    sets: String(ex.sets ?? 3),
    repsLow: String(ex.reps_low ?? 10),
    repsHigh: String(ex.reps_high ?? 12),
    rir: String(ex.rir ?? 2),
  };
}

function num(s: string, fb: number) {
  const v = Number(s);
  return Number.isFinite(v) ? v : fb;
}

function withUnilateral(name: string, unilateral?: boolean) {
  return unilateral ? `${name} (a un brazo)` : name;
}

const VELOCITY_OPTS: { v: SetRow["velocity"]; label: string }[] = [
  { v: "fast", label: "Rápida" },
  { v: "normal", label: "Normal" },
  { v: "slow", label: "Lenta" },
];

const PAIN_OPTS: { v: SetRow["pain"]; label: string; activeCls: string }[] = [
  { v: "green", label: "Verde", activeCls: "bg-[#a3e635] text-[#09090b] border-[#a3e635]" },
  { v: "yellow", label: "Amarillo", activeCls: "bg-[#fbbf24] text-[#09090b] border-[#fbbf24]" },
  { v: "red", label: "Rojo", activeCls: "bg-[#f87171] text-[#09090b] border-[#f87171]" },
];

function MotorChip({
  active,
  onClick,
  children,
  activeCls = "bg-[#a3e635] text-[#09090b] border-[#a3e635]",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  activeCls?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-[10px] border transition-all ${
        active ? activeCls : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

export default function WorkoutView() {
  const { user, profile } = useApp();
  const [workout, setWorkout] = useState<Awaited<ReturnType<typeof fetchActiveWorkout>>>(null);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchSessionsForDay>>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [grid, setGrid] = useState<Record<number, SetRow[]>>({});
  const [e1RMs, setE1RMs] = useState<Map<string, Estimated1RM>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [summary, setSummary] = useState<AnalyzedDecision[] | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState(false);
  const [volDraft, setVolDraft] = useState<Record<string, VolDraft>>({});
  const [picker, setPicker] = useState<{ mode: "add" | "swap"; index?: number } | null>(null);
  const [info, setInfo] = useState<{ exercise: Exercise; unilateral?: boolean } | null>(null);
  const [openMotor, setOpenMotor] = useState<Record<string, boolean>>({});

  const getCustomLabel = (row: SetRow) => {
    if (row.pain === "red") return "🔴 Dolor";
    if (row.pain === "yellow") return "🟡 Dolor";
    if (row.technicalFailure) return "⚠️ Fallo";
    if (!row.technique) return "⚠️ Técnica";
    if (row.velocity === "fast") return "⚡ Rápida";
    if (row.velocity === "slow") return "🐢 Lenta";
    return "Ajustado";
  };

  const load = useCallback(async () => {
    if (!user) return;
    const w = await fetchActiveWorkout(user.id);
    setWorkout(w);
    if (w && catalog.length === 0) {
      setCatalog(await fetchExercises());
    }
    setLoading(false);
  }, [user, catalog.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function selectDay(day: WorkoutDay) {
    setSelectedDay(day);
    setSessionId(null);
    setGrid({});
    setE1RMs(new Map());
    setSavedAt(null);
    setEditing(false);
    setVolDraft({});
    setSummary(null);
    const s = await fetchSessionsForDay(day.id);
    setHistory(s);
  }

  async function refreshDay(dayId: string) {
    if (!user) return;
    const w = await fetchActiveWorkout(user.id);
    setWorkout(w);
    const nd = w?.days.find((d) => d.id === dayId) ?? null;
    setSelectedDay(nd);
    setVolDraft({});
  }

  const todayStr = new Date().toISOString().split("T")[0];

  async function startSession() {
    if (!selectedDay || !user) return;
    const existing = history.find((h) => h.date === todayStr);
    let sid = existing?.id ?? null;
    if (!sid) {
      const s = await createSession(selectedDay.id);
      sid = s.id;
    }
    setSessionId(sid);

    const ids = (selectedDay.exercises ?? [])
      .map((e) => e.exercise_id)
      .filter((id): id is string => Boolean(id));
    setE1RMs(await fetchLatestE1RMs(user.id, ids));

    const next: Record<number, SetRow[]> = {};
    (selectedDay.exercises ?? []).forEach((ex, i) => {
      const sets = ex.sets ?? 3;
      const reps = String(ex.reps_low ?? 10);
      const rir = String(ex.rir ?? 2);
      const last = history[0]?.exercise_logs ?? [];
      next[i] = Array.from({ length: sets }, (_, sIdx) => {
        const prev = last.find((l) => l.set_index === sIdx + 1);
        return {
          weight:
            prev?.weight_kg != null
              ? String(prev.weight_kg)
              : ex.target_weight != null
                ? String(ex.target_weight)
                : "",
          reps: prev?.reps != null ? String(prev.reps) : reps,
          rir: prev?.rir != null ? String(prev.rir) : rir,
          velocity: "normal",
          technique: true,
          pain: "green",
          technicalFailure: false,
        };
      });
    });
    setGrid(next);
  }

  const setCell = (exIdx: number, setIdx: number, field: keyof SetRow, value: string) => {
    setGrid((g) => {
      const rows = [...(g[exIdx] ?? [])];
      rows[setIdx] = { ...rows[setIdx], [field]: value } as SetRow;
      return { ...g, [exIdx]: rows };
    });
  };

  const setMotor = (
    exIdx: number,
    setIdx: number,
    field: "velocity" | "technique" | "pain" | "technicalFailure",
    value: SetRow[typeof field]
  ) => {
    setGrid((g) => {
      const rows = [...(g[exIdx] ?? [])];
      rows[setIdx] = { ...rows[setIdx], [field]: value } as SetRow;
      return { ...g, [exIdx]: rows };
    });
  };

  async function save() {
    if (!selectedDay || !sessionId || !user) return;
    setSaving(true);
    const logs: Parameters<typeof saveSessionLogs>[1] = [];
    (selectedDay.exercises ?? []).forEach((ex, exIdx) => {
      (grid[exIdx] ?? []).forEach((row, setIdx) => {
        const reps = Number(row.reps);
        const weight = row.weight.trim() === "" ? null : Number(row.weight);
        const rir = row.rir.trim() === "" ? null : Number(row.rir);
        if (Number.isFinite(reps) && reps > 0) {
          logs.push({
            exercise_id: ex.exercise_id ?? null,
            custom_name: ex.custom_name ?? "",
            set_index: setIdx + 1,
            reps,
            weight_kg: weight != null && Number.isFinite(weight) ? weight : null,
            rir: rir != null && Number.isFinite(rir) ? rir : null,
            pain: row.pain,
            velocity: row.velocity,
            technique: row.technique,
            technical_failure: row.technicalFailure,
          });
        }
      });
    });
    if (logs.length) {
      await saveSessionLogs(sessionId, logs);
      const analyzed = await analyzeSession(sessionId);
      setSummary(analyzed);
      setAppliedIds(new Set());
    }
    setSaving(false);
    setSavedAt(Date.now());
    await selectDay(selectedDay);
  }

  // ─── Edición ────────────────────────────────────────────────

  const slugById = (id?: string) => catalog.find((c) => c.id === id)?.slug;

  const existingSlugs = new Set(
    (selectedDay?.exercises ?? [])
      .map((e) => slugById(e.exercise_id))
      .filter(Boolean) as string[]
  );

  const exerciseById = (id?: string) => catalog.find((c) => c.id === id);

  const exRef = (ex: PlannedExercise): ExerciseRef | null => {
    const cat = exerciseById(ex.exercise_id);
    if (!cat) return null;
    return {
      slug: cat.slug ?? "",
      gear: cat.gear,
      variationGroup: cat.variation_group,
      pattern: cat.movement_pattern,
      unilateralSupport: cat.unilateral_support,
      meta: cat.meta ?? null,
    };
  };

  function volRow(ex: PlannedExercise): VolDraft {
    return volDraft[ex.id] ?? initVolRow(ex);
  }

  function setVolField(ex: PlannedExercise, field: keyof VolDraft, value: string) {
    setVolDraft((d) => ({
      ...d,
      [ex.id]: { ...(d[ex.id] ?? initVolRow(ex)), [field]: value },
    }));
  }

  const VOL_FIELD_DB: Record<keyof VolDraft, "sets" | "reps_low" | "reps_high" | "rir"> = {
    sets: "sets",
    repsLow: "reps_low",
    repsHigh: "reps_high",
    rir: "rir",
  };

  async function commitVol(ex: PlannedExercise, field: keyof VolDraft) {
    const dbField = VOL_FIELD_DB[field];
    const fbs: Record<string, number> = { sets: 3, repsLow: 10, repsHigh: 12, rir: 2 };
    const v = num(volRow(ex)[field], fbs[field]);
    const patch: Partial<Parameters<typeof updatePlannedExercise>[1]> = {};
    patch[dbField] = v;
    await updatePlannedExercise(ex.id, patch);
  }

  async function toggleUnilateral(ex: PlannedExercise) {
    const name = exerciseById(ex.exercise_id)?.name ?? ex.custom_name?.replace(" (a un brazo)", "") ?? "Ejercicio";
    const next = !ex.unilateral;
    await updatePlannedExercise(ex.id, {
      unilateral: next,
      custom_name: withUnilateral(name, next),
    });
    if (selectedDay) await refreshDay(selectedDay.id);
  }

  async function handlePickerSelect(sel: PickerSelection) {
    if (!selectedDay || !user) return;
    const { exercise, unilateral, volume } = sel;
    const name = withUnilateral(exercise.name, unilateral);

    if (picker?.mode === "swap" && picker.index != null) {
      const row = selectedDay.exercises?.[picker.index];
      if (row) {
        await updatePlannedExercise(row.id, {
          exercise_id: exercise.id,
          custom_name: name,
          unilateral,
          sets: volume.sets,
          reps_low: volume.repsLow,
          reps_high: volume.repsHigh,
          rir: volume.rir,
        });
      }
    } else {
      await addPlannedExercise({
        workout_day_id: selectedDay.id,
        exercise_id: exercise.id,
        custom_name: name,
        unilateral,
        sets: volume.sets,
        reps_low: volume.repsLow,
        reps_high: volume.repsHigh,
        rir: volume.rir,
        position: selectedDay.exercises?.length ?? 0,
      });
    }

    setPicker(null);
    await refreshDay(selectedDay.id);
  }

  async function handleRemove(ex: PlannedExercise) {
    await removePlannedExercise(ex.id);
    if (selectedDay) await refreshDay(selectedDay.id);
  }

  function openInfo(ex: PlannedExercise) {
    const cat = exerciseById(ex.exercise_id);
    if (!cat) return;
    setInfo({ exercise: cat, unilateral: ex.unilateral });
  }

  // ─── Aplicar decisiones de progresión ───────────────────────

  async function handleApply(id: string) {
    await applyDecision(id);
    setAppliedIds((s) => new Set(s).add(id));
    if (selectedDay) await refreshDay(selectedDay.id);
  }

  async function handleApplyAll() {
    const pending = (summary ?? []).filter((i) => !appliedIds.has(i.decision.id));
    for (const i of pending) await applyDecision(i.decision.id);
    setAppliedIds(new Set(pending.map((i) => i.decision.id)));
    if (selectedDay) await refreshDay(selectedDay.id);
  }

  // ─── Render ─────────────────────────────────────────────────

  const swapIndex = picker?.mode === "swap" ? picker.index : undefined;

  if (loading) {
    return (
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">rutina</span>
        <div className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  if (!workout || workout.days.length === 0) {
    return (
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">rutina</span>
        <Empty
          icon="fitness_center"
          title="Aún no tienes un plan de entrenamiento."
          hint={user ? "En modo guiado el plan se genera al completar el onboarding." : ""}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 animate-fade-in-up">
      <SectionHeader
        kicker="plan activo"
        title={workout.plan.name ?? "Rutina"}
        action={
          <span className="label-caps">{workout.plan.split_type ?? ""}</span>
        }
      />

      {/* Lista de días */}
      {!selectedDay && (
        <div className="flex flex-col gap-3">
          {workout.days.map((day) =>
            day.day_type === "running" || day.day_type === "cardio" ? (
              <div key={day.id} className="glass-floating p-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-sm text-[#f4f4f0] font-medium">{day.name}</span>
                  <span className="block text-xs text-[#a1a1aa] mt-1">
                    {day.cardio_spec?.durationMin ?? 0} min · RPE {day.cardio_spec?.rpe ?? 0}
                  </span>
                  {day.cardio_spec?.notes && (
                    <span className="block text-[11px] text-[#71717a] mt-1">{day.cardio_spec.notes}</span>
                  )}
                </div>
                <span className="label-caps !text-[8px] shrink-0 text-[#a3e635]">
                  {day.day_type === "running" ? "running" : "cardio"}
                </span>
              </div>
            ) : (
              <button
                key={day.id}
                onClick={() => selectDay(day)}
                className="glass-floating p-5 flex items-center justify-between text-left hover:border-white/[0.15] transition-colors"
              >
                <div>
                  <span className="block text-sm text-[#f4f4f0] font-medium">{day.name}</span>
                  <span className="block text-xs text-[#a1a1aa] mt-1">
                    {day.exercises?.length ?? 0} ejercicios
                  </span>
                </div>
                <span className="material-symbols-outlined text-[20px] text-[#a3e635]">
                  chevron_right
                </span>
              </button>
            )
          )}
        </div>
      )}

      {/* Vista de día */}
      {selectedDay && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDay(null)}
              className="flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-[#f4f4f0]"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              rutinas
            </button>
            <span className="text-sm text-[#f4f4f0] font-medium">{selectedDay.name}</span>
          </div>

          {selectedDay.day_type === "running" || selectedDay.day_type === "cardio" ? (
            <div className="glass-floating p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="label-caps !text-[8px] text-[#a3e635]">
                  {selectedDay.day_type === "running" ? "running" : "cardio"}
                </span>
                <span className="font-mono-num text-xs text-[#f4f4f0]">
                  {selectedDay.cardio_spec?.durationMin ?? 0} min · RPE {selectedDay.cardio_spec?.rpe ?? 0}
                </span>
              </div>
              {selectedDay.cardio_spec?.notes && (
                <p className="text-xs text-[#71717a] leading-relaxed">{selectedDay.cardio_spec.notes}</p>
              )}
            </div>
          ) : (
            <>
          {history.length > 0 && (
            <div className="glass-floating p-4">
              <span className="label-caps block mb-2">última sesión</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a1a1aa]">{history[0].date}</span>
                <span className="font-mono-num text-[10px] text-[#71717a]">
                  {history[0].exercise_logs?.length ?? 0} registros
                </span>
              </div>
            </div>
          )}

          {!sessionId && (
            <div className="flex items-center justify-between gap-3">
              <button onClick={startSession} className="btn-pill-primary flex-1 py-3">
                Comenzar sesión de hoy
              </button>
              <button
                onClick={() => {
                  setEditing((e) => !e);
                  setVolDraft({});
                }}
                className={`btn-pill-secondary py-3 ${editing ? "text-[#a3e635] border-[#a3e635]/40" : ""}`}
              >
                {editing ? "Listo" : "Editar"}
              </button>
            </div>
          )}

          {!sessionId && !editing && (
            <div className="flex flex-col gap-3">
              {(selectedDay.exercises ?? []).map((ex) => (
                <div key={ex.id} className="glass-floating p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-sm text-[#f4f4f0] font-medium truncate">
                      {ex.custom_name ?? "Ejercicio"}
                    </span>
                    <span className="label-caps !text-[8px] mt-1 block">
                      {ex.sets ?? 3}×{ex.reps_low ?? 10}-{ex.reps_high ?? 12} · rir {ex.rir ?? 2}
                    </span>
                  </div>
                  <button
                    onClick={() => openInfo(ex)}
                    className="text-[#52525b] hover:text-[#a3e635] transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">info</span>
                  </button>
                </div>
              ))}
              {(selectedDay.exercises?.length ?? 0) === 0 && (
                <p className="text-xs text-[#52525b] text-center py-2">
                  Este día no tiene ejercicios. Edítalo para agregarlos.
                </p>
              )}
            </div>
          )}

          {!sessionId && editing && (
            <div className="flex flex-col gap-4">
              {(selectedDay.exercises ?? []).map((ex, exIdx) => {
                const v = volRow(ex);
                return (
                  <div key={ex.id} className="glass-floating p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <button
                          onClick={() => openInfo(ex)}
                          className="text-[#52525b] hover:text-[#a3e635] transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">info</span>
                        </button>
                        <span className="text-sm text-[#f4f4f0] font-medium truncate">
                          {ex.custom_name ?? "Ejercicio"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPicker({ mode: "swap", index: exIdx })}
                          className="p-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#a1a1aa] hover:text-[#a3e635] transition-colors"
                          title="Cambiar variante"
                        >
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                        </button>
                        <button
                          onClick={() => handleRemove(ex)}
                          className="p-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#a1a1aa] hover:text-[#f87171] transition-colors"
                          title="Quitar"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                      <span>series</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v.sets}
                        onChange={(e) => setVolField(ex, "sets", e.target.value)}
                        onBlur={() => commitVol(ex, "sets")}
                        className="input-pill !px-2 !py-1 w-11 sm:w-12 !text-center text-xs"
                      />
                      <span>reps</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v.repsLow}
                        onChange={(e) => setVolField(ex, "repsLow", e.target.value)}
                        onBlur={() => commitVol(ex, "repsLow")}
                        className="input-pill !px-2 !py-1 w-11 sm:w-12 !text-center text-xs"
                      />
                      <span>–</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v.repsHigh}
                        onChange={(e) => setVolField(ex, "repsHigh", e.target.value)}
                        onBlur={() => commitVol(ex, "repsHigh")}
                        className="input-pill !px-2 !py-1 w-11 sm:w-12 !text-center text-xs"
                      />
                      <span>rir</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={v.rir}
                        onChange={(e) => setVolField(ex, "rir", e.target.value)}
                        onBlur={() => commitVol(ex, "rir")}
                        className="input-pill !px-2 !py-1 w-11 sm:w-12 !text-center text-xs"
                      />
                    </div>

                    {exerciseById(ex.exercise_id)?.unilateral_support && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#a1a1aa]">Unilateral</span>
                        <button
                          onClick={() => toggleUnilateral(ex)}
                          className={`px-3 py-1.5 rounded-full text-[11px] border transition-all ${
                            ex.unilateral
                              ? "bg-[#a3e635] text-[#09090b] border-[#a3e635]"
                              : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.1]"
                          }`}
                        >
                          {ex.unilateral ? "A un brazo" : "Ambos"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setPicker({ mode: "add" })}
                className="btn-pill-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Agregar ejercicio
              </button>
            </div>
          )}

          {sessionId && (
            <>
              {/* Logging */}
              <div className="flex flex-col gap-4">
                {(selectedDay.exercises ?? []).map((ex, exIdx) => {
                  const ref = exRef(ex);
                  const band = ref
                    ? rirTargets(profile?.experience ?? "beginner", classify(ref), ref, ex.rir)
                    : null;
                  const e1rm = ex.exercise_id ? e1RMs.get(ex.exercise_id)?.e1rm : undefined;
                  return (
                    <div key={ex.id} className="glass-floating p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-[#f4f4f0] font-medium truncate">
                            {ex.custom_name ?? "Ejercicio"}
                          </span>
                          {exerciseById(ex.exercise_id) && (
                            <button
                              onClick={() => openInfo(ex)}
                              className="text-[#52525b] hover:text-[#a3e635] transition-colors shrink-0"
                            >
                              <span className="material-symbols-outlined text-[14px]">info</span>
                            </button>
                          )}
                          {e1rm != null && (
                            <span className="font-mono-num text-[10px] text-[#71717a] shrink-0">
                              1RM est. {e1rm} kg
                            </span>
                          )}
                        </div>
                        <span className="label-caps shrink-0 !text-[9px] sm:!text-[10px]">
                          {ex.sets ?? 3}×{ex.reps_low ?? 10}-{ex.reps_high ?? 12}
                          {band ? ` · rir ${band.min}-${band.max}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {Array.from({ length: ex.sets ?? 3 }, (_, sIdx) => {
                          const row = grid[exIdx]?.[sIdx] ?? {
                            weight: "",
                            reps: String(ex.reps_low ?? 10),
                            rir: String(ex.rir ?? 2),
                            velocity: "normal",
                            technique: true,
                            pain: "green",
                            technicalFailure: false,
                          } as SetRow;

                          const motorKey = `${exIdx}-${sIdx}`;
                          const isMotorOpen = !!openMotor[motorKey];
                          const isCustomized =
                            row.velocity !== "normal" ||
                            !row.technique ||
                            row.technicalFailure ||
                            row.pain !== "green";

                          const toggleMotor = () =>
                            setOpenMotor((prev) => ({ ...prev, [motorKey]: !prev[motorKey] }));

                          return (
                            <div key={sIdx} className="flex flex-col gap-1.5 pb-2 border-b border-white/[0.04] last:border-0 last:pb-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                                <span className="font-mono-num text-[10px] text-[#52525b] w-3.5 shrink-0 text-center">
                                  {sIdx + 1}
                                </span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="kg"
                                  className="input-pill !px-2.5 !py-1.5 flex-1 min-w-0 text-center text-xs"
                                  value={row.weight}
                                  onChange={(e) => setCell(exIdx, sIdx, "weight", e.target.value)}
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="reps"
                                  className="input-pill !px-2.5 !py-1.5 flex-1 min-w-0 text-center text-xs"
                                  value={row.reps}
                                  onChange={(e) => setCell(exIdx, sIdx, "reps", e.target.value)}
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="rir"
                                  className="input-pill !px-2 !py-1.5 w-11 sm:w-12 shrink-0 text-center text-xs"
                                  value={row.rir}
                                  onChange={(e) => setCell(exIdx, sIdx, "rir", e.target.value)}
                                />
                                <button
                                  onClick={toggleMotor}
                                  className={`px-2 py-1.5 rounded-full text-[10px] border transition-all shrink-0 flex items-center gap-1 ${
                                    isCustomized
                                      ? "bg-[#a3e635]/15 text-[#a3e635] border-[#a3e635]/40"
                                      : isMotorOpen
                                        ? "bg-white/[0.08] text-[#f4f4f0] border-white/[0.2]"
                                        : "bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:text-[#a1a1aa]"
                                  }`}
                                  title="Ajustar velocidad, técnica o dolor de ejecución"
                                >
                                  <span className="material-symbols-outlined text-[13px]">tune</span>
                                  <span className="hidden sm:inline">
                                    {isCustomized ? getCustomLabel(row) : "Calidad"}
                                  </span>
                                </button>
                              </div>

                              {isMotorOpen && (
                                <div className="flex flex-col gap-2 p-3 mt-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-fade-in-up">
                                  <div className="flex items-center justify-between">
                                    <span className="label-caps !text-[8px] text-[#a1a1aa]">ajustar ejecución · serie {sIdx + 1}</span>
                                    <button onClick={toggleMotor} className="text-[10px] text-[#71717a] hover:text-[#f4f4f0]">
                                      Cerrar ✕
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="label-caps !text-[8px] w-10 shrink-0">vel</span>
                                    {VELOCITY_OPTS.map((o) => (
                                      <MotorChip
                                        key={o.v}
                                        active={row.velocity === o.v}
                                        onClick={() => setMotor(exIdx, sIdx, "velocity", o.v)}
                                      >
                                        {o.label}
                                      </MotorChip>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="label-caps !text-[8px] w-10 shrink-0">técnica</span>
                                    <button
                                      onClick={() => setMotor(exIdx, sIdx, "technique", !row.technique)}
                                      className={`px-2.5 py-1 rounded-full text-[10px] border transition-all ${
                                        row.technique
                                          ? "bg-[#a3e635] text-[#09090b] border-[#a3e635]"
                                          : "bg-[#f87171]/20 text-[#f87171] border-[#f87171]/50"
                                      }`}
                                    >
                                      {row.technique ? "Estable ✓" : "Inestable ✕"}
                                    </button>
                                    <button
                                      onClick={() => setMotor(exIdx, sIdx, "technicalFailure", !row.technicalFailure)}
                                      className={`px-2.5 py-1 rounded-full text-[10px] border transition-all ${
                                        row.technicalFailure
                                          ? "bg-[#f87171] text-[#09090b] border-[#f87171]"
                                          : "bg-white/[0.04] text-[#a1a1aa] border-white/[0.08]"
                                      }`}
                                    >
                                      {row.technicalFailure ? "Fallo" : "Sin fallo"}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="label-caps !text-[8px] w-10 shrink-0">dolor</span>
                                    {PAIN_OPTS.map((o) => (
                                      <MotorChip
                                        key={o.v}
                                        active={row.pain === o.v}
                                        onClick={() => setMotor(exIdx, sIdx, "pain", o.v)}
                                        activeCls={o.activeCls}
                                      >
                                        {o.label}
                                      </MotorChip>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {savedAt && (
                <p className="text-center text-xs text-[#a3e635]">Sesión guardada</p>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="btn-pill-primary w-full py-3 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar sesión"}
              </button>

              {summary && (
                <ProgressionSummary
                  items={summary}
                  appliedIds={appliedIds}
                  onApply={handleApply}
                  onApplyAll={handleApplyAll}
                  onClose={() => setSummary(null)}
                />
              )}
            </>
          )}
            </>
          )}
        </div>
      )}

      {picker && selectedDay && (
        <ExercisePicker
          mode={picker.mode}
          focus={selectedDay.focus}
          swapFamily={
            swapIndex != null
              ? exerciseById(selectedDay.exercises?.[swapIndex]?.exercise_id)?.family
              : undefined
          }
          experience={profile?.experience ?? "beginner"}
          userTier={profile?.equipment ?? "gym"}
          catalog={catalog}
          existingSlugs={
            swapIndex != null
              ? new Set(
                  [...existingSlugs].filter(
                    (s) => s !== slugById(selectedDay.exercises?.[swapIndex]?.exercise_id)
                  )
                )
              : existingSlugs
          }
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {info && (
        <ExerciseInfoSheet
          exercise={info.exercise}
          unilateral={info.unilateral}
          onClose={() => setInfo(null)}
        />
      )}
    </div>
  );
}
