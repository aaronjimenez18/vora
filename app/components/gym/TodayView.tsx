"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { MealLog, TabId, WorkoutDay } from "../../types";
import {
  fetchActiveDiet,
  fetchActiveWorkout,
  fetchMealLogs,
  insertMealLog,
  deleteMealLog,
} from "@/lib/supabase/gym";
import { Ring, MacroBar, SectionHeader, Empty } from "./Shared";

export default function TodayView({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user, profile } = useApp();
  const [workout, setWorkout] = useState<{ plan: unknown; days: WorkoutDay[] } | null>(null);
  const [diet, setDiet] = useState<Awaited<ReturnType<typeof fetchActiveDiet>>>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickMeal, setPickMeal] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const todayLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const load = useCallback(async () => {
    if (!user) return;
    const [w, d, m] = await Promise.all([
      fetchActiveWorkout(user.id),
      fetchActiveDiet(user.id),
      fetchMealLogs(user.id, new Date().toISOString().split("T")[0]),
    ]);
    setWorkout(w);
    setDiet(d);
    setLogs(m);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const plan = diet?.plan ?? null;
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
      custom_name: meal.name ?? "Comida",
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
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">{todayLabel}</span>
        <div className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
      <span className="label-caps">{todayLabel}</span>

      {/* Objetivos / macros */}
      {plan ? (
        <div className="glass-floating divide-y divide-white/[0.06]">
          <Ring value={total.calories} goal={plan.calories ?? 0} label="kcal consumidas" />
          <MacroBar label="proteína" consumed={total.protein} goal={plan.protein_g ?? 0} />
          <MacroBar label="carbohidratos" consumed={total.carbs} goal={plan.carbs_g ?? 0} />
          <MacroBar label="grasas" consumed={total.fat} goal={plan.fat_g ?? 0} />
          {profile && (profile.weight_kg != null || profile.body_fat != null) && (
            <div className="flex items-center justify-between px-4 sm:px-5 py-3">
              <span className="label-caps">composición</span>
              <span className="font-mono-num text-xs text-[#a1a1aa]">
                {profile.weight_kg != null && `${profile.weight_kg} kg`}
                {profile.weight_kg != null && profile.body_fat != null && " · "}
                {profile.body_fat != null && `${profile.body_fat}% grasa`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-floating p-6">
          <span className="text-xs text-[#a1a1aa]">
            {profile?.mode === "manual"
              ? "Modo libre activo: registra tus comidas y entrenos manualmente."
              : "Todavía no tienes plan de dieta. Genéralo desde el onboarding o el coach."}
          </span>
        </div>
      )}

      {/* Entreno de hoy */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          kicker="rutina"
          title={todayDay ? "entreno de hoy" : "hoy es descanso"}
          action={
            todayDay ? (
              <button
                onClick={() => onNavigate("workout")}
                className="btn-pill-primary text-xs py-2 px-4"
              >
                Entrenar
              </button>
            ) : undefined
          }
        />
        {todayDay ? (
          <button
            onClick={() => onNavigate("workout")}
            className="glass-floating p-5 flex items-center justify-between text-left hover:border-white/[0.15] transition-colors"
          >
            <div>
              <span className="block text-sm text-[#f4f4f0] font-medium">{todayDay.name}</span>
              <span className="text-xs text-[#a1a1aa] mt-1 block">
                {todayDay.day_type === "running" || todayDay.day_type === "cardio" ? (
                  <>
                    {todayDay.cardio_spec?.durationMin ?? 0} min · RPE {todayDay.cardio_spec?.rpe ?? 0}
                    {todayDay.cardio_spec?.notes ? ` · ${todayDay.cardio_spec.notes}` : ""}
                  </>
                ) : (
                  `${todayDay.exercises?.length ?? 0} ejercicios`
                )}
              </span>
            </div>
            <span className="material-symbols-outlined text-[20px] text-[#a3e635]">
              arrow_forward_ios
            </span>
          </button>
        ) : (
          <div className="glass-floating p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-[#a1a1aa]">bedtime</span>
            <span className="text-xs text-[#a1a1aa]">
              Recuperación programada. Camina, estira o descansa.
            </span>
          </div>
        )}
      </div>

      {/* Comidas de hoy */}
      <div className="flex flex-col gap-3">
        <SectionHeader kicker="comidas" title="comidas de hoy" />

        {logs.length === 0 ? (
          <Empty icon="restaurant" title="Todavía no registras comidas hoy.">
            {diet && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 w-full max-w-full">
                <select
                  value={pickMeal}
                  onChange={(e) => setPickMeal(e.target.value)}
                  className="input-pill flex-1 text-xs truncate max-w-full bg-[#18181b] min-w-0"
                >
                  <option value="">Elegir comida del plan…</option>
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
                  Añadir
                </button>
              </div>
            )}
          </Empty>
        ) : (
          <>
            <div className="glass-floating divide-y divide-white/[0.06] overflow-hidden">
              {logs.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-3.5 px-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#f4f4f0] truncate">{m.custom_name}</span>
                      <span className="label-caps !text-[8px] shrink-0">{m.meal_type}</span>
                    </div>
                    <span className="font-mono-num text-[10px] text-[#52525b] block truncate mt-0.5">
                      P{m.protein_g ?? 0} · C{m.carbs_g ?? 0} · F{m.fat_g ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-num text-xs text-[#f4f4f0]">{m.calories} kcal</span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-[#52525b] hover:text-[#f87171] transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
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
                  <option value="">Registrar comida del plan…</option>
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
                  Añadir
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}