"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { MealLog, TabId, WorkoutDay } from "../../types";
import {
  fetchActiveDiet,
  fetchActiveWorkout,
  fetchHydration,
  fetchMealLogs,
  insertMealLog,
  deleteMealLog,
} from "@/lib/supabase/gym";
import { calculateTargets } from "@/lib/engine/nutrition";
import { Ring, MacroBar, SectionHeader, Empty } from "./Shared";
import AICameraModal from "./AICameraModal";
import { FoodPicker } from "./DietView";

export default function TodayView({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user, profile } = useApp();
  const [workout, setWorkout] = useState<{ plan: unknown; days: WorkoutDay[] } | null>(null);
  const [diet, setDiet] = useState<Awaited<ReturnType<typeof fetchActiveDiet>>>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [glasses, setGlasses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pickMeal, setPickMeal] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Formato de fecha editorial: "viernes · 15 ago"
  const todayLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const waterGoal = useMemo(() => {
    if (!profile?.weight_kg) return 8;
    return Math.max(6, Math.min(16, Math.round((profile.weight_kg * 35) / 250)));
  }, [profile]);

  const load = useCallback(async () => {
    if (!user) return;
    const [w, d, m, h] = await Promise.all([
      fetchActiveWorkout(user.id),
      fetchActiveDiet(user.id),
      fetchMealLogs(user.id, new Date().toISOString().split("T")[0]),
      fetchHydration(user.id, new Date().toISOString().split("T")[0]),
    ]);
    setWorkout(w);
    setDiet(d);
    setLogs(m);
    setGlasses(h);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const plan = diet?.plan ?? null;
  const isManual = profile?.mode === "manual";
  const profileTargets = useMemo(
    () => (isManual && profile ? calculateTargets(profile) : null),
    [isManual, profile]
  );
  const dayGoals = plan
    ? {
        calories: plan.calories ?? 0,
        protein: plan.protein_g ?? 0,
        carbs: plan.carbs_g ?? 0,
        fat: plan.fat_g ?? 0,
      }
    : profileTargets
      ? {
          calories: profileTargets.calories,
          protein: profileTargets.protein,
          carbs: profileTargets.carbs,
          fat: profileTargets.fat,
        }
      : null;
  const weekdayIndex = (new Date().getDay() + 6) % 7; // lunes = 0
  const dayMap = new Map<number, WorkoutDay>(
    (workout?.days ?? []).filter((d) => d.day_of_week != null).map((d) => [d.day_of_week!, d])
  );
  const todayDay = dayMap.get(weekdayIndex) ?? null;
  const isTrainingDay = Boolean(todayDay);

  const total = logs.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein: acc.protein + (m.protein_g ?? 0),
      carbs: acc.carbs + (m.carbs_g ?? 0),
      fat: acc.fat + (m.fat_g ?? 0),
      cost: acc.cost + (m.cost_mxn ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, cost: 0 }
  );

  async function handleAddLog() {
    if (!user || !pickMeal) return;
    const meal = diet?.meals.find((m) => m.id === pickMeal);
    if (!meal) return;
    await insertMealLog(user.id, {
      date: today,
      meal_type: meal.meal_type ?? "snack",
      custom_name: meal.name ?? "comida",
      calories: meal.calories ?? 0,
      protein_g: meal.protein_g ?? 0,
      carbs_g: meal.carbs_g ?? 0,
      fat_g: meal.fat_g ?? 0,
      cost_mxn: meal.cost_mxn,
    });
    setPickMeal("");
    load();
  }

  async function handleDelete(id: string) {
    await deleteMealLog(id);
    load();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-8 pb-28 animate-fade-in-up">
        {/* skeleton fecha */}
        <div className="flex flex-col gap-1">
          <div className="h-3 w-16 rounded-full bg-white/[0.04] animate-pulse" />
          <div className="h-7 w-40 rounded-full bg-white/[0.03] animate-pulse mt-1" />
        </div>
        {/* skeleton card */}
        <div className="h-44 rounded-3xl bg-white/[0.02] animate-pulse" />
        <div className="h-24 rounded-3xl bg-white/[0.015] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-28 animate-fade-in-up">

      {/* ── Fecha — header editorial ─────────────────────────── */}
      <div className="flex flex-col gap-0.5 pt-1">
        <span className="label-caps">{new Date().getFullYear()}</span>
        <h1 className="font-serif-italic text-2xl sm:text-3xl text-[#f4f4f0] leading-tight">
          {todayLabel}
        </h1>
      </div>

      {/* ── Objetivos / macros ───────────────────────────────── */}
      {dayGoals ? (
        <div className="glass-floating divide-y divide-white/[0.05] animate-fade-in-up stagger-1">
          <Ring value={total.calories} goal={dayGoals.calories} label="kcal consumidas" />
          <MacroBar label="proteína" consumed={total.protein} goal={dayGoals.protein} />
          <MacroBar label="carbohidratos" consumed={total.carbs} goal={dayGoals.carbs} />
          <MacroBar label="grasas" consumed={total.fat} goal={dayGoals.fat} />
          {profile && (profile.weight_kg != null || profile.body_fat != null) && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <span className="label-caps">composición</span>
              <span className="font-mono-num text-[11px] text-[#52525b]">
                {profile.weight_kg != null && `${profile.weight_kg} kg`}
                {profile.weight_kg != null && profile.body_fat != null && " · "}
                {profile.body_fat != null && `${profile.body_fat}% grasa`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-floating p-6 animate-fade-in-up stagger-1">
          <span className="label-meta">
            {profile?.mode === "manual"
              ? "modo libre activo — registra tus comidas y entrenos manualmente."
              : "sin plan de dieta activo. genéralo desde el onboarding o el coach."}
          </span>
        </div>
      )}

      {/* ── Entreno de hoy ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 animate-fade-in-up stagger-3">
        <SectionHeader
          kicker="rutina"
          title={todayDay ? "entreno de hoy" : "hoy es descanso"}
          action={
            todayDay ? (
              <button
                onClick={() => onNavigate("workout")}
                className="btn-pill-primary text-xs py-2 px-4"
              >
                entrenar
              </button>
            ) : undefined
          }
        />
        {todayDay ? (
          <button
            onClick={() => onNavigate("workout")}
            className="glass-floating p-5 flex items-center justify-between text-left group"
          >
            <div className="min-w-0">
              <span className="block text-sm text-[#f4f4f0] font-medium truncate">
                {todayDay.name}
              </span>
              <span className="label-meta mt-1 block">
                {todayDay.day_type === "running" || todayDay.day_type === "cardio" ? (
                  <>
                    {todayDay.cardio_spec?.durationMin ?? 0} min · rpe {todayDay.cardio_spec?.rpe ?? 0}
                    {todayDay.cardio_spec?.notes ? ` · ${todayDay.cardio_spec.notes}` : ""}
                  </>
                ) : (
                  `${todayDay.exercises?.length ?? 0} ejercicios`
                )}
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-[#a3e635] shrink-0 transition-transform group-hover:translate-x-0.5">
              arrow_forward_ios
            </span>
          </button>
        ) : isManual && !workout ? (
          <button
            onClick={() => onNavigate("workout")}
            className="glass-card p-5 flex items-center gap-3 text-left w-full"
          >
            <span className="material-symbols-outlined text-[20px] text-[#a3e635]">fitness_center</span>
            <span className="label-meta">modo libre: registra tu entreno desde la pestaña rutina.</span>
            <span className="material-symbols-outlined text-[16px] text-[#3f3f46] ml-auto shrink-0">
              arrow_forward_ios
            </span>
          </button>
        ) : (
          <div className="glass-card p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-[#52525b]">bedtime</span>
            <span className="label-meta">recuperación programada — camina, estira o descansa.</span>
          </div>
        )}
      </div>

      {/* ── Comidas de hoy ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 animate-fade-in-up stagger-4">
        <SectionHeader
          kicker="comidas"
          title="comidas de hoy"
          action={
            <div className="flex items-center gap-1.5">
              {!diet && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="btn-pill-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span>
                  alimento
                </button>
              )}
              <button
                onClick={() => setCameraOpen(true)}
                className="btn-pill-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                foto
              </button>
            </div>
          }
        />

        {logs.length === 0 ? (
          <Empty icon="restaurant" title="todavía no registras comidas hoy.">
            {diet && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 w-full max-w-full">
                <select
                  value={pickMeal}
                  onChange={(e) => setPickMeal(e.target.value)}
                  className="input-pill flex-1 text-xs truncate max-w-full bg-[#18181b] min-w-0"
                >
                  <option value="">elegir comida del plan…</option>
                  {diet.meals
                    .filter((m) => m.day_type === (isTrainingDay ? "training" : "rest") || diet.meals.every(x => x.day_type !== (isTrainingDay ? "training" : "rest")))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.calories} kcal
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddLog}
                  disabled={!pickMeal}
                  className="btn-pill-primary text-xs py-2.5 px-4 shrink-0 w-full sm:w-auto"
                >
                  añadir
                </button>
              </div>
            )}
          </Empty>
        ) : (
          <>
            <div className="glass-floating divide-y divide-white/[0.05] overflow-hidden">
              {logs.map((m, idx) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-3 py-3.5 px-4 sm:px-5 animate-fade-in-up stagger-${Math.min(idx + 1, 5)}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#f4f4f0] truncate">{m.custom_name}</span>
                      <span className="label-caps !text-[8px] shrink-0 px-1.5 py-0.5 rounded-full bg-white/[0.05]">
                        {m.meal_type}
                      </span>
                    </div>
                    <span className="font-mono-num text-[10px] text-[#3f3f46] block truncate mt-0.5">
                      p{m.protein_g ?? 0} · c{m.carbs_g ?? 0} · f{m.fat_g ?? 0}
                    </span>
                    {(m.micros?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {m.micros!.slice(0, 3).map((micro) => (
                          <span
                            key={micro}
                            className="text-[9px] text-[#52525b] px-1.5 py-0.5 rounded-full bg-white/[0.04]"
                          >
                            {micro}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-num text-xs text-[#f4f4f0]">{m.calories} kcal</span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-[#3f3f46] hover:text-[#f87171] transition-colors p-1 rounded-full hover:bg-[#f87171]/10"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {diet && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={pickMeal}
                  onChange={(e) => setPickMeal(e.target.value)}
                  className="input-pill flex-1 text-xs truncate max-w-full bg-[#18181b] min-w-0"
                >
                  <option value="">registrar comida del plan…</option>
                  {diet.meals
                    .filter((m) => m.day_type === (isTrainingDay ? "training" : "rest") || diet.meals.every(x => x.day_type !== (isTrainingDay ? "training" : "rest")))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.calories} kcal
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddLog}
                  disabled={!pickMeal}
                  className="btn-pill-primary text-xs py-2.5 px-4 shrink-0 w-full sm:w-auto"
                >
                  añadir
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {cameraOpen && (
        <AICameraModal
          allergies={profile?.allergies ?? []}
          onLog={(log: {
            meal_type: import("../../types").MealType;
            custom_name: string;
            quantity?: number;
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
            fiber_g?: number;
            micros?: string[];
          }) => {
            if (!user) return;
            insertMealLog(user.id, { date: today, ...log }).then(load);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {pickerOpen && (
        <FoodPicker
          allergies={profile?.allergies ?? []}
          onAdd={(log: {
            meal_type: import("../../types").MealType;
            food_id: string;
            custom_name: string;
            quantity: number;
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
            fiber_g?: number;
            cost_mxn?: number;
          }) => {
            if (!user) return;
            insertMealLog(user.id, { date: today, ...log }).then(load);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}