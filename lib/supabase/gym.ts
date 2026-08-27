import { createClient } from "./client";
import {
  decideProgression,
  estimate1RM,
  type Experience,
  type LoggedSet,
} from "@/lib/engine/progression";
import type { PriceRecord } from "@/lib/engine/nutrition";
import type {
  DietMeal,
  DietPlan,
  Estimated1RM,
  Exercise,
  ExerciseLog,
  Food,
  MealLog,
  MealType,
  PlannedExercise,
  ProgressEntry,
  ProgressionDecision,
  WorkoutDay,
  WorkoutPlan,
  WorkoutSession,
} from "@/app/types";

export interface ActiveWorkout {
  plan: WorkoutPlan;
  days: WorkoutDay[];
}

export interface ActiveDiet {
  plan: DietPlan;
  meals: DietMeal[];
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function fetchActiveWorkout(userId: string): Promise<ActiveWorkout | null> {
  const supabase = createClient();
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return null;

  const { data: days } = await supabase
    .from("workout_days")
    .select("*, planned_exercises(*)")
    .eq("plan_id", plan.id)
    .order("position", { ascending: true })
    .order("position", { ascending: true, referencedTable: "planned_exercises" });

  const normalized = ((days ?? []) as (Partial<WorkoutDay> & { planned_exercises?: Partial<import("@/app/types").PlannedExercise>[] })[]).map(
    (d) => ({ ...d, exercises: d.planned_exercises ?? [] })
  );

  return { plan: plan as WorkoutPlan, days: normalized as WorkoutDay[] };
}

export async function createCustomWorkoutPlan(
  userId: string,
  name?: string
): Promise<WorkoutPlan> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      name: name || "Mi rutina",
      split_type: "custom",
      days_per_week: 1,
      source: "custom",
      is_active: true,
    })
    .select()
    .single();
  if (user && error) throw error ?? new Error("No se pudo crear la rutina");
  return data as WorkoutPlan;
}

export async function addWorkoutDay(
  planId: string,
  input: {
    name?: string;
    day_of_week?: number | null;
    position?: number | null;
  }
): Promise<WorkoutDay> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("workout_days")
    .insert({
      plan_id: planId,
      name: input.name || "Día",
      day_of_week: input.day_of_week ?? null,
      position: input.position ?? null,
      source: "custom",
    })
    .select()
    .single();
  if (user && error) throw error ?? new Error("No se pudo crear el día");
  return { ...(data as WorkoutDay), exercises: [] };
}

export async function fetchActiveDiet(userId: string): Promise<ActiveDiet | null> {
  const supabase = createClient();
  const { data: plan } = await supabase
    .from("diet_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return null;

  const { data: meals } = await supabase
    .from("diet_meals")
    .select("*")
    .eq("plan_id", plan.id)
    .order("meal_type", { ascending: true });

  return { plan: plan as DietPlan, meals: (meals ?? []) as DietMeal[] };
}

export async function fetchMealLogs(userId: string, date: string): Promise<MealLog[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });
  return (data ?? []) as MealLog[];
}

export async function insertMealLog(
  userId: string,
  log: {
    date: string;
    meal_type: MealType;
    custom_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    food_id?: string;
    quantity?: number;
    cost_mxn?: number;
    micros?: string[];
  }
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) throw new Error("Sin sesión");

  const payload: Record<string, unknown> = { user_id: userId, ...log };
  const { error } = await supabase.from("meal_logs").insert(payload);

  if (error) {
    // Si el error es por columna desconocida (micros aún no migrado), reintentar sin ella
    const isMissingColumn =
      error.message?.includes("micros") ||
      error.code === "PGRST204" ||
      error.code === "42703";

    if (isMissingColumn && "micros" in payload) {
      console.warn("insertMealLog: columna 'micros' no encontrada en schema cache, reintentando sin ella…");
      const { micros: _omitted, ...payloadWithoutMicros } = payload;
      const { error: retryError } = await supabase.from("meal_logs").insert(payloadWithoutMicros);
      if (retryError) {
        console.error("Supabase insertMealLog retry error:", retryError);
        throw new Error(retryError.message || "Error al registrar comida");
      }
      return;
    }

    console.error("Supabase insertMealLog error:", error);
    throw new Error(error.message || "Error al registrar comida");
  }
}

export async function deleteMealLog(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("meal_logs").delete().eq("id", id);
}

export async function fetchFoods(): Promise<Food[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("foods")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as Food[];
}

export async function fetchPriceRecords(): Promise<PriceRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("price_records")
    .select("*")
    .order("observed_at", { ascending: false });
  return (data ?? []) as PriceRecord[];
}

export async function createSession(workoutDayId: string): Promise<WorkoutSession> {
  const { supabase, user } = await requireUser();
  if (!user) throw new Error("Sin sesión");
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      workout_day_id: workoutDayId,
      date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("No se pudo iniciar la sesión");
  return data as WorkoutSession;
}

export async function fetchSessionsForDay(workoutDayId: string): Promise<
  (WorkoutSession & { exercise_logs: ExerciseLog[] })[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*, exercise_logs(*)")
    .eq("workout_day_id", workoutDayId)
    .order("date", { ascending: false });
  return (data ?? []) as (WorkoutSession & { exercise_logs: ExerciseLog[] })[];
}

export interface SessionLogInput {
  exercise_id: string | null;
  custom_name: string;
  set_index: number;
  reps: number;
  weight_kg: number | null;
  rir: number | null;
  pain?: "green" | "yellow" | "red" | null;
  velocity?: "fast" | "normal" | "slow" | null;
  technique?: boolean | null;
  technical_failure?: boolean | null;
}

export async function saveSessionLogs(
  sessionId: string,
  logs: SessionLogInput[]
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("exercise_logs").insert(
    logs.map((l) => ({ session_id: sessionId, ...l }))
  );
}

export async function fetchProgress(userId: string): Promise<ProgressEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  return (data ?? []) as ProgressEntry[];
}

export async function addProgress(
  userId: string,
  entry: {
    date: string;
    weight_kg?: number;
    body_fat?: number;
    chest_cm?: number;
    waist_cm?: number;
    arm_cm?: number;
    notes?: string;
  }
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("progress").insert({ user_id: userId, ...entry });
}

// ─── Catálogo y edición de ejercicios ─────────────────────────

export async function fetchExercises(): Promise<Exercise[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as Exercise[];
}

export interface PlannedExerciseInput {
  workout_day_id: string;
  exercise_id?: string | null;
  custom_name?: string;
  sets?: number;
  reps_low?: number;
  reps_high?: number;
  rir?: number;
  unilateral?: boolean;
  target_weight?: number | null;
  notes?: string;
  position?: number;
}

export async function addPlannedExercise(
  input: PlannedExerciseInput
): Promise<PlannedExercise> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("planned_exercises")
    .insert(input)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("No se pudo agregar el ejercicio");
  return data as PlannedExercise;
}

export async function updatePlannedExercise(
  id: string,
  patch: Partial<PlannedExerciseInput>
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("planned_exercises").update(patch).eq("id", id);
}

export async function removePlannedExercise(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("planned_exercises").delete().eq("id", id);
}

export async function reorderPlannedExercises(
  dayId: string,
  orderedIds: string[]
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("planned_exercises")
    .update({ position: null })
    .eq("workout_day_id", dayId);
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("planned_exercises")
      .update({ position: i })
      .eq("id", orderedIds[i]);
  }
}

// ─── Motor de RIR y Progresión ────────────────────────────────

export async function fetchLatestE1RMs(
  userId: string,
  exerciseIds: string[]
): Promise<Map<string, Estimated1RM>> {
  if (exerciseIds.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase
    .from("estimated_1rm")
    .select("*")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  const map = new Map<string, Estimated1RM>();
  for (const row of data ?? []) {
    const id = row.exercise_id as string;
    if (id && !map.has(id)) map.set(id, row as Estimated1RM);
  }
  return map;
}

export interface AnalyzedDecision {
  decision: ProgressionDecision;
  exercise: { id: string; name: string; slug?: string } | null;
}

function toLoggedSet(l: ExerciseLog): LoggedSet {
  return {
    reps: l.reps,
    weightKg: l.weight_kg ?? null,
    rir: l.rir ?? null,
    pain: l.pain ?? null,
    velocity: l.velocity ?? null,
    technique: l.technique ?? null,
    technicalFailure: l.technical_failure ?? null,
  };
}

function isPoorSession(sessionLogs: ExerciseLog[]): boolean {
  const considered = sessionLogs.filter((s) => s.reps > 0);
  if (considered.length === 0) return false;
  const poor = considered.filter(
    (s) =>
      s.pain === "yellow" ||
      s.pain === "red" ||
      s.technical_failure === true ||
      s.velocity === "slow"
  ).length;
  return poor / considered.length >= 0.5;
}

// Analiza la sesión recién guardada, persiste decisiones y 1RM estimado.
export async function analyzeSession(sessionId: string): Promise<AnalyzedDecision[]> {
  const { supabase, user } = await requireUser();
  if (!user) throw new Error("Sin sesión");

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session?.workout_day_id) return [];

  const { data: profile } = await supabase
    .from("user_profile")
    .select("experience")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("session_id", sessionId);

  const { data: planned } = await supabase
    .from("planned_exercises")
    .select("*")
    .eq("workout_day_id", session.workout_day_id);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*, exercise_logs(*)")
    .eq("workout_day_id", session.workout_day_id)
    .order("date", { ascending: false });

  const currentLogs = (logs ?? []) as ExerciseLog[];
  const pastSessions = ((sessions ?? []) as (WorkoutSession & {
    exercise_logs: ExerciseLog[];
  })[]).filter((s) => s.id !== sessionId);

  let consecutivePoorSessions = 0;
  for (const s of pastSessions) {
    if (isPoorSession(s.exercise_logs ?? [])) consecutivePoorSessions++;
    else break;
  }

  const pastLogsByExercise = new Map<string, ExerciseLog[]>();
  for (const s of pastSessions) {
    for (const l of s.exercise_logs ?? []) {
      if (!l.exercise_id) continue;
      const arr = pastLogsByExercise.get(l.exercise_id) ?? [];
      arr.push(l);
      pastLogsByExercise.set(l.exercise_id, arr);
    }
  }

  const exerciseIds = (planned ?? [])
    .map((p) => p.exercise_id)
    .filter((id): id is string => Boolean(id));

  const { data: exRows } = await supabase
    .from("exercises")
    .select("id, name, slug, gear, variation_group, movement_pattern, unilateral_support, meta")
    .in("id", exerciseIds);

  const { data: e1rmRows } = await supabase
    .from("estimated_1rm")
    .select("*")
    .eq("user_id", user.id)
    .in("exercise_id", exerciseIds)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  const latestE1rm = new Map<string, Estimated1RM>();
  for (const r of e1rmRows ?? []) {
    const id = r.exercise_id as string;
    if (id && !latestE1rm.has(id)) latestE1rm.set(id, r as Estimated1RM);
  }

  const decisionsInserts: Omit<ProgressionDecision, "id" | "created_at">[] = [];
  const e1rmInserts: {
    user_id: string;
    exercise_id: string;
    e1rm: number;
    method: string;
    session_id: string;
    date: string;
  }[] = [];

  for (const p of (planned ?? []) as PlannedExercise[]) {
    if (!p.exercise_id) continue;
    const cat = (exRows ?? []).find((e) => e.id === p.exercise_id);
    if (!cat) continue;

    const myLogs = currentLogs.filter((l) => l.exercise_id === p.exercise_id);
    if (myLogs.length === 0) continue;

    const prev = pastLogsByExercise.get(p.exercise_id) ?? [];
    const prevBestWeight =
      prev.reduce((mx, l) => Math.max(mx, l.weight_kg ?? 0), 0) || null;
    const prevE1rm = latestE1rm.get(p.exercise_id)?.e1rm ?? null;

    const decision = decideProgression({
      experience: (profile?.experience as Experience) ?? "beginner",
      exercise: {
        slug: cat.slug ?? p.exercise_id,
        gear: cat.gear,
        variationGroup: cat.variation_group,
        pattern: cat.movement_pattern,
        unilateralSupport: cat.unilateral_support ?? false,
        meta: (cat.meta as Record<string, unknown>) ?? null,
      },
      planned: {
        sets: p.sets ?? 3,
        repsLow: p.reps_low ?? 10,
        repsHigh: p.reps_high ?? 12,
        rir: p.rir ?? null,
        unilateral: p.unilateral ?? false,
      },
      sets: myLogs.map(toLoggedSet),
      prevBestWeight,
      prevE1rm,
      consecutivePoorSessions,
    });

    const best = myLogs.reduce<{ w: number; r: number } | null>((b, l) => {
      if (l.weight_kg == null || l.reps <= 0) return b;
      const cur = estimate1RM(l.weight_kg, l.reps);
      if (cur == null) return b;
      if (!b) return { w: l.weight_kg, r: l.reps };
      const prev = estimate1RM(b.w, b.r);
      return prev != null && cur > prev ? { w: l.weight_kg, r: l.reps } : b;
    }, null);

    decisionsInserts.push({
      user_id: user.id,
      exercise_id: p.exercise_id,
      workout_day_id: session.workout_day_id,
      session_id: sessionId,
      date: session.date,
      action: decision.action,
      pct: decision.pct,
      from_weight: decision.fromWeight ?? undefined,
      to_weight: decision.toWeight ?? undefined,
      to_reps: decision.toReps ?? undefined,
      remove_set: decision.removeSet ?? false,
      rationale: decision.rationale,
      applied: false,
    });

    if (best) {
      const e1rm = estimate1RM(best.w, best.r);
      if (e1rm != null) {
        e1rmInserts.push({
          user_id: user.id,
          exercise_id: p.exercise_id,
          e1rm,
          method: "epley",
          session_id: sessionId,
          date: session.date,
        });
      }
    }
  }

  const { data: inserted } =
    decisionsInserts.length > 0
      ? await supabase.from("progression_decisions").insert(decisionsInserts).select()
      : { data: [] };

  if (e1rmInserts.length > 0) {
    await supabase.from("estimated_1rm").insert(e1rmInserts);
  }

  const byId = new Map((exRows ?? []).map((e) => [e.id, e]));
  return ((inserted ?? []) as ProgressionDecision[]).map((d) => ({
    decision: d,
    exercise: d.exercise_id ? (byId.get(d.exercise_id) ?? null) : null,
  }));
}

// Aplica una decisión al plan (solo con confirmación del usuario).
export async function applyDecision(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: d } = await supabase
    .from("progression_decisions")
    .select("*")
    .eq("id", id)
    .single();
  if (!d || d.applied) return;

  const { data: planned } = await supabase
    .from("planned_exercises")
    .select("*")
    .eq("workout_day_id", d.workout_day_id)
    .eq("exercise_id", d.exercise_id)
    .maybeSingle();
  if (!planned) return;

  const patch: Partial<PlannedExerciseInput> = {};
  if (d.action === "increase_load" || d.action === "reduce_load") {
    if (d.to_weight != null) patch.target_weight = Number(d.to_weight);
  }
  if (d.action === "increase_reps") {
    const low = (planned.reps_low ?? 10) + 1;
    patch.reps_low = low;
    patch.reps_high = Math.max(low, d.to_reps ?? (planned.reps_high ?? 12) + 1);
  }
  if (d.action === "switch_variant") {
    if (d.to_reps != null) patch.reps_low = d.to_reps;
    patch.target_weight = null;
  }
  if (d.action === "deload") {
    if (d.to_weight != null) patch.target_weight = Number(d.to_weight);
    if (d.remove_set) patch.sets = Math.max(1, (planned.sets ?? 3) - 1);
  }

  await updatePlannedExercise(planned.id, patch);
  await supabase.from("progression_decisions").update({ applied: true }).eq("id", id);
}

// ─── Analítica de entrenamiento ──────────────────────────────

export interface WeeklyVolumePoint {
  weekStart: string; // lunes YYYY-MM-DD
  label: string;     // "dd MMM"
  volume: number;    // kg totales (peso × reps)
}

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

export async function fetchWeeklyVolume(userId: string, weeks = 8): Promise<WeeklyVolumePoint[]> {
  const supabase = createClient();
  const from = new Date();
  from.setDate(from.getDate() - weeks * 7);
  const { data } = await supabase
    .from("workout_sessions")
    .select("date, exercise_logs(weight_kg, reps)")
    .eq("user_id", userId)
    .gte("date", from.toISOString().split("T")[0])
    .order("date", { ascending: true });

  const byWeek = new Map<string, number>();
  for (const s of (data ?? []) as { date: string; exercise_logs?: { weight_kg?: number | null; reps: number }[] }[]) {
    if (!s.date) continue;
    let vol = 0;
    for (const l of s.exercise_logs ?? []) {
      if (l.weight_kg != null && l.reps > 0) vol += l.weight_kg * l.reps;
    }
    const wk = mondayOf(s.date);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + vol);
  }

  return [...byWeek.entries()]
    .map(([weekStart, volume]) => {
      const d = new Date(`${weekStart}T00:00:00`);
      return {
        weekStart,
        label: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
        volume: Math.round(volume),
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export interface E1rmTrend {
  exerciseId: string;
  name: string;
  points: { date: string; e1rm: number }[];
}

export async function fetchE1rmTrends(userId: string, top = 5): Promise<E1rmTrend[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estimated_1rm")
    .select("exercise_id, date, e1rm, exercises(id, name)")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  const byExercise = new Map<string, E1rmTrend>();
  for (const r of (data ?? []) as {
    exercise_id?: string | null;
    date: string;
    e1rm: number;
    exercises?: { id: string; name: string } | { id: string; name: string }[] | null;
  }[]) {
    const id = r.exercise_id;
    const ex = Array.isArray(r.exercises) ? (r.exercises[0] ?? null) : r.exercises;
    if (!id || !ex) continue;
    const trend = byExercise.get(id) ?? {
      exerciseId: id,
      name: ex.name,
      points: [],
    };
    trend.points.push({ date: r.date, e1rm: Math.round(r.e1rm) });
    byExercise.set(id, trend);
  }

  return [...byExercise.values()]
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, top);
}

// ─── Hidratación ─────────────────────────────────────────────

export async function fetchHydration(userId: string, date: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hydration_logs")
    .select("glasses")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  return data?.glasses ?? 0;
}

export async function setHydration(userId: string, date: string, glasses: number): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) throw new Error("Sin sesión");
  await supabase.from("hydration_logs").upsert(
    { user_id: userId, date, glasses },
    { onConflict: "user_id,date" }
  );
}

// ─── Fotos de progreso (storage privado + metadata) ──────────

export interface ProgressPhoto {
  id: string;
  date: string;
  note?: string | null;
  signedUrl: string;
}

const PHOTOS_BUCKET = "progress-photos";
const SIGN_URL_TTL = 60 * 60 * 24; // 24 h

export async function uploadProgressPhoto(file: File): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-zA-Z0-9]/g, "");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return null;
  return path;
}

export async function addProgressPhoto(
  userId: string,
  date: string,
  path: string,
  note?: string
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) throw new Error("Sin sesión");
  await supabase.from("progress_photos").insert({ user_id: userId, date, url: path, note });
}

export async function fetchProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  const rows = (data ?? []) as { id: string; date: string; url: string; note?: string | null }[];
  const photos = await Promise.all(
    rows.map(async (r) => {
      const { data: signed } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(r.url, SIGN_URL_TTL);
      return { id: r.id, date: r.date, note: r.note ?? null, signedUrl: signed?.signedUrl ?? "" };
    })
  );
  return photos.filter((p) => p.signedUrl);
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: row } = await supabase
    .from("progress_photos")
    .select("url")
    .eq("id", id)
    .single();
  await supabase.from("progress_photos").delete().eq("id", id);
  if (row?.url) await supabase.storage.from(PHOTOS_BUCKET).remove([row.url]);
}
