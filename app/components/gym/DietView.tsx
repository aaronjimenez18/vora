"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Food, MealLog, MealType } from "../../types";
import {
  fetchActiveDiet,
  fetchActiveWorkout,
  fetchMealLogs,
  fetchFoods,
  fetchPriceRecords,
  insertMealLog,
  deleteMealLog,
} from "@/lib/supabase/gym";
import { budgetBandsMXN, LOW_BUDGET_STRATEGY, pricePer100gFromRecord } from "@/lib/engine/nutrition";
import { SectionHeader, Empty } from "./Shared";
import AICameraModal from "./AICameraModal";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "desayuno",
  lunch: "comida",
  dinner: "cena",
  snack: "snack",
};
const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const WEEKDAY_FULL = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

// dot color per meal type
const MEAL_COLOR: Record<MealType, string> = {
  breakfast: "#fbbf24",
  lunch: "#60a5fa",
  dinner: "#a78bfa",
  snack: "#34d399",
};

export default function DietView() {
  const { user, profile } = useApp();
  const [diet, setDiet] = useState<Awaited<ReturnType<typeof fetchActiveDiet>>>(null);
  const [workout, setWorkout] = useState<Awaited<ReturnType<typeof fetchActiveWorkout>>>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayWeekday = useMemo(() => (new Date().getDay() + 6) % 7, []);
  const [selectedDay, setSelectedDay] = useState(todayWeekday);

  const load = useCallback(async () => {
    if (!user) return;
    const [d, w, m] = await Promise.all([
      fetchActiveDiet(user.id),
      fetchActiveWorkout(user.id),
      fetchMealLogs(user.id, today),
    ]);
    setDiet(d);
    setWorkout(w);
    setLogs(m);
    setLoading(false);
  }, [user, today]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleLog(mealId: string) {
    if (!user) return;
    const meal = diet?.meals.find((m) => m.id === mealId);
    if (!meal) return;
    await insertMealLog(user.id, {
      date: today,
      meal_type: meal.meal_type ?? "snack",
      custom_name: meal.name ?? "comida",
      calories: meal.calories ?? 0,
      protein_g: meal.protein_g ?? 0,
      carbs_g: meal.carbs_g ?? 0,
      fat_g: meal.fat_g ?? 0,
      fiber_g: meal.fiber_g,
      cost_mxn: meal.cost_mxn,
    });
    load();
  }

  async function handleDelete(id: string) {
    await deleteMealLog(id);
    load();
  }

  const plan = diet?.plan ?? null;
  const weekly = plan?.weekly_budget ?? 0;
  const dailyBudget = weekly > 0 ? weekly / 7 : null;
  const spentToday = logs.reduce((s, m) => s + (m.cost_mxn ?? 0), 0);

  const trainingByWeekday = useMemo(() => {
    const map = new Array<boolean>(7).fill(false);
    for (const d of workout?.days ?? []) {
      if (d.day_of_week != null) map[d.day_of_week] = true;
    }
    return map;
  }, [workout]);

  const selectedMeals = useMemo(
    () =>
      (diet?.meals ?? []).filter((m) => {
        const want = trainingByWeekday[selectedDay] ? "training" : "rest";
        if (m.day_type === want) return true;
        return !(diet?.meals ?? []).some((x) => x.day_type === want);
      }),
    [diet, trainingByWeekday, selectedDay]
  );

  const planMeals = useMemo(
    () => selectedMeals.sort((a, b) => MEAL_ORDER.indexOf(a.meal_type ?? "snack") - MEAL_ORDER.indexOf(b.meal_type ?? "snack")),
    [selectedMeals]
  );
  const pricesUnknown =
    planMeals.length > 0 && planMeals.every((m) => m.cost_mxn === null || m.cost_mxn === undefined);
  const bands = useMemo(() => (weekly > 0 ? budgetBandsMXN(weekly) : null), [weekly]);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 pb-28 animate-fade-in-up">
        <div className="flex flex-col gap-1">
          <div className="h-3 w-16 rounded-full bg-white/[0.04] animate-pulse" />
          <div className="h-7 w-32 rounded-full bg-white/[0.03] animate-pulse mt-1" />
        </div>
        <div className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />
        <div className="h-16 rounded-3xl bg-white/[0.015] animate-pulse" />
      </div>
    );
  }

  if (!plan) {
    const isManual = profile?.mode === "manual";
    return (
      <div className="flex flex-col gap-8 pb-28 animate-fade-in-up">
        <div className="flex flex-col gap-0.5 pt-1">
          <span className="label-caps">plan</span>
          <h1 className="font-serif-italic text-2xl text-[#f4f4f0]">dieta</h1>
        </div>

        {isManual ? (
          <>
            <div className="glass-floating p-5">
              <span className="label-meta">
                modo libre activo — sin plan de comidas generado. registra tus comidas a mano o
                busca alimentos del catálogo.
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <SectionHeader
                kicker="diario"
                title="registrado hoy"
                action={
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCameraOpen(true)}
                      className="btn-pill-secondary text-[11px] py-1.5 px-3 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                      foto
                    </button>
                    <button
                      onClick={() => setPickerOpen(true)}
                      className="btn-pill-secondary text-[11px] py-1.5 px-3"
                    >
                      + alimento
                    </button>
                  </div>
                }
              />
              {logs.length === 0 ? (
                <Empty
                  icon="event_note"
                  title="nada registrado hoy todavía."
                  hint="toca '+ alimento' o 'foto' para añadir una comida."
                />
              ) : (
                <div className="glass-floating divide-y divide-white/[0.05] overflow-hidden">
                  {logs.map((m, idx) => (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 py-3.5 px-4 animate-fade-in-up stagger-${Math.min(idx + 1, 5)}`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-[#f4f4f0] truncate block">{m.custom_name}</span>
                        <span className="font-mono-num text-[10px] text-[#3f3f46] block truncate mt-0.5">
                          {m.calories} kcal
                          {m.fiber_g ? ` · ${m.fiber_g}g fibra` : ""}
                          {m.cost_mxn ? ` · $${m.cost_mxn}` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-[#3f3f46] hover:text-[#f87171] transition-colors shrink-0 p-1.5 rounded-full hover:bg-[#f87171]/10"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <Empty icon="restaurant" title="aún no tienes un plan de dieta." />
        )}

        {pickerOpen && (
          <FoodPicker
            allergies={profile?.allergies ?? []}
            onAdd={(log) => {
              if (!user) return;
              insertMealLog(user.id, { date: today, ...log }).then(load);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}

        {cameraOpen && (
          <AICameraModal
            allergies={profile?.allergies ?? []}
            onLog={(log) => {
              if (!user) return;
              insertMealLog(user.id, { date: today, ...log }).then(load);
            }}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-28 animate-fade-in-up">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <span className="label-caps block mb-1.5">plan activo</span>
          <h1 className="font-serif-italic text-2xl sm:text-3xl text-[#f4f4f0] truncate">
            {plan.name ?? "plan de comidas"}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono-num text-lg text-[#a3e635]">
            ${Math.round(weekly).toLocaleString("es-MX")}
          </span>
          <span className="label-caps block">/ semana</span>
        </div>
      </div>

      {/* ── Gasto del día ───────────────────────────────────── */}
      <div className="glass-floating p-4 sm:p-5 grid grid-cols-2 gap-3 animate-fade-in-up stagger-1">
        <div className="min-w-0">
          <span className="label-caps block mb-1.5">gasto hoy</span>
          <span className="font-mono-num text-xl text-[#f4f4f0] block">
            ${Math.round(spentToday * 100) / 100}
          </span>
        </div>
        <div className="text-right min-w-0">
          <span className="label-caps block mb-1.5">presupuesto diario</span>
          <span className="font-mono-num text-xl text-[#a1a1aa] block">
            ${dailyBudget ? Math.round(dailyBudget * 100) / 100 : "—"}
          </span>
        </div>
        {/* hairline presupuesto */}
        {dailyBudget && (
          <div className="col-span-2 h-px bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#a3e635] transition-all duration-700"
              style={{ width: `${Math.min(1, spentToday / dailyBudget) * 100}%`, opacity: 0.6 }}
            />
          </div>
        )}
      </div>

      {/* ── Macros strip ────────────────────────────────────── */}
      <div className="glass-floating p-3 sm:p-4 grid grid-cols-5 gap-2 animate-fade-in-up stagger-1">
        {(["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"] as const).map((k) => (
          <div key={k} className="text-center">
            <span className="font-mono-num text-xs sm:text-sm text-[#f4f4f0] block truncate">
              {k === "fiber_g" && (plan.fiber_g === null || plan.fiber_g === undefined) ? "—" : plan[k]}
            </span>
            <span className="label-caps block mt-1">
              {k === "calories" ? "kcal" : k === "fiber_g" ? "fibra" : k.replace("_g", "")}
            </span>
          </div>
        ))}
      </div>

      {/* ── Aviso precios ───────────────────────────────────── */}
      {pricesUnknown && (
        <div className="rounded-2xl border border-[#fbbf24]/20 bg-[#fbbf24]/[0.05] p-4">
          <span className="label-caps text-[#fbbf24] block mb-2">precios por confirmar</span>
          <p className="label-meta mb-3">
            los precios no son constantes: se necesitan registros fechados por tienda, mercado y
            presentación.
          </p>
          <div className="flex flex-col gap-1.5">
            {LOW_BUDGET_STRATEGY.map((tip) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="text-[#a3e635] mt-px text-[10px] shrink-0">•</span>
                <span className="text-[11px] text-[#a1a1aa] leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reparto presupuesto ─────────────────────────────── */}
      {bands && !pricesUnknown && (
        <div className="glass-floating p-4 sm:p-5 flex flex-col gap-3 animate-fade-in-up stagger-2">
          <SectionHeader kicker="presupuesto" title="reparto sugerido" />
          {(
            [
              ["proteínas", bands.proteins, "#60a5fa"],
              ["básicos", bands.staples, "#a3e635"],
              ["verduras y frutas", bands.produce, "#34d399"],
              ["grasas y varios", bands.fats_and_misc, "#fb923c"],
            ] as const
          ).map(([label, [min, max], color]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: color, opacity: 0.7 }}
                />
                <span className="label-meta truncate">{label}</span>
              </div>
              <span className="font-mono-num text-xs text-[#f4f4f0] shrink-0">
                ${min}–${max}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Comidas del plan ────────────────────────────────── */}
      <div className="flex flex-col gap-3 animate-fade-in-up stagger-2">
        <SectionHeader kicker="comidas" title="comidas del plan" />

        {/* selector de día */}
        <div className="glass-floating p-2 flex items-center gap-1">
          {WEEKDAY_SHORT.map((label, i) => {
            const isSel = selectedDay === i;
            const isToday = i === todayWeekday;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                aria-pressed={isSel}
                aria-label={WEEKDAY_FULL[i]}
                title={WEEKDAY_FULL[i]}
                className={`flex-1 py-2 rounded-full text-[10px] font-medium transition-all text-center ${
                  isSel
                    ? "bg-[#a3e635] text-[#09090b] font-semibold"
                    : "bg-white/[0.04] text-[#52525b] hover:text-[#a1a1aa]"
                }`}
              >
                {isToday ? "hoy" : label}
              </button>
            );
          })}
        </div>

        <span className="label-caps -mt-1">
          {WEEKDAY_FULL[selectedDay]} · {trainingByWeekday[selectedDay] ? "entreno" : "descanso"}
        </span>

        <div className="flex flex-col gap-3">
          {planMeals.map((meal) => {
            const logged = logs.some(
              (m) => m.custom_name === meal.name && m.meal_type === meal.meal_type
            );
            const mealColor = MEAL_COLOR[meal.meal_type ?? "snack"];
            return (
              <div key={meal.id} className={`glass-floating p-4 sm:p-5 ${logged ? "border-[#a3e635]/20" : ""}`}>
                <div className="flex items-start gap-3">
                  {/* dot indicador */}
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ background: mealColor, opacity: 0.7 }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="label-caps block mb-1">
                          {MEAL_LABELS[meal.meal_type ?? "snack"]}
                        </span>
                        <span className="text-sm text-[#f4f4f0] font-medium block truncate">
                          {meal.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono-num text-sm text-[#f4f4f0] block">
                          {meal.calories} kcal
                        </span>
                        <span className="font-mono-num text-[10px] text-[#52525b] block mt-0.5">
                          p{meal.protein_g} · c{meal.carbs_g} · f{meal.fat_g}
                        </span>
                        <span className="label-caps block mt-0.5" style={{ color: mealColor, opacity: 0.8 }}>
                          {meal.cost_mxn === null || meal.cost_mxn === undefined
                            ? "precio pendiente"
                            : `$${meal.cost_mxn}`}
                        </span>
                      </div>
                    </div>
                    {meal.recipe && (
                      <span className="block text-[11px] text-[#52525b] mt-2 leading-relaxed">
                        {meal.recipe}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {logged ? (
                        <button
                          onClick={() => {
                            const l = logs.find((m) => m.custom_name === meal.name && m.meal_type === meal.meal_type);
                            if (l) handleDelete(l.id);
                          }}
                          className="btn-pill-secondary text-[11px] py-1.5 px-3"
                        >
                          quitar registro
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLog(meal.id)}
                          className="btn-pill-primary text-[11px] py-1.5 px-3"
                        >
                          registrar hoy
                        </button>
                      )}
                      {logged && (
                        <span
                          className="font-mono-num text-[10px] tracking-wide"
                          style={{ color: "#a3e635" }}
                        >
                          ✓ registrado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Registrado hoy ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 animate-fade-in-up stagger-3">
        <SectionHeader
          kicker="diario"
          title="registrado hoy"
          action={
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCameraOpen(true)}
                className="btn-pill-secondary text-[11px] py-1.5 px-3 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                foto
              </button>
              <button
                onClick={() => setPickerOpen(true)}
                className="btn-pill-secondary text-[11px] py-1.5 px-3"
              >
                + alimento
              </button>
            </div>
          }
        />
        {logs.length === 0 ? (
          <Empty icon="event_note" title="nada registrado hoy todavía." />
        ) : (
          <div className="glass-floating divide-y divide-white/[0.05] overflow-hidden">
            {logs.map((m, idx) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 py-3.5 px-4 animate-fade-in-up stagger-${Math.min(idx + 1, 5)}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-[#f4f4f0] truncate block">{m.custom_name}</span>
                  <span className="font-mono-num text-[10px] text-[#3f3f46] block truncate mt-0.5">
                    {m.calories} kcal
                    {m.fiber_g ? ` · ${m.fiber_g}g fibra` : ""}
                    {m.cost_mxn ? ` · $${m.cost_mxn}` : ""}
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
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-[#3f3f46] hover:text-[#f87171] transition-colors shrink-0 p-1.5 rounded-full hover:bg-[#f87171]/10"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <FoodPicker
          allergies={profile?.allergies ?? []}
          onAdd={(log) => {
            if (!user) return;
            insertMealLog(user.id, { date: today, ...log }).then(load);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {cameraOpen && (
        <AICameraModal
          allergies={profile?.allergies ?? []}
          onLog={(log) => {
            if (!user) return;
            insertMealLog(user.id, { date: today, ...log }).then(load);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}

export function FoodPicker({
  allergies,
  onAdd,
  onClose,
}: {
  allergies: string[];
  onAdd: (log: {
    meal_type: MealType;
    food_id: string;
    custom_name: string;
    quantity: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    cost_mxn?: number;
  }) => void;
  onClose: () => void;
}) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [mealType, setMealType] = useState<MealType>("snack");

  useEffect(() => {
    let active = true;
    Promise.all([fetchFoods(), fetchPriceRecords()]).then(([f, records]) => {
      if (!active) return;
      setFoods(f.filter((x) => x.source !== "seed"));
      const map: Record<string, number> = {};
      for (const r of records) {
        const per100 = pricePer100gFromRecord(r);
        if (per100 === null) continue;
        if (map[r.food_id] === undefined) map[r.food_id] = per100;
      }
      setPrices(map);
    });
    return () => { active = false; };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isBlocked = (f: Food) => (f.allergens ?? []).some((a) => allergies.includes(a));
    const list = foods.filter((f) => !isBlocked(f));
    const filtered = q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list;
    return filtered.slice(0, 40);
  }, [foods, query, allergies]);

  const selectedGrams = Number(grams) || 0;
  const k = selectedGrams / 100;

  const add = () => {
    if (!selected) return;
    const p100 = prices[selected.id] ?? null;
    onAdd({
      meal_type: mealType,
      food_id: selected.id,
      custom_name: selected.name,
      quantity: selectedGrams,
      calories: Math.round((selected.calories ?? 0) * k),
      protein_g: Math.round((selected.protein_g ?? 0) * k * 10) / 10,
      carbs_g: Math.round((selected.carbs_g ?? 0) * k * 10) / 10,
      fat_g: Math.round((selected.fat_g ?? 0) * k * 10) / 10,
      fiber_g: selected.fiber_g ? Math.round(selected.fiber_g * k * 10) / 10 : undefined,
      cost_mxn: p100 !== null ? Math.round(p100 * k * 100) / 100 : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl glass-modal-panel flex flex-col gap-3 overflow-hidden
                   rounded-t-[28px] sm:rounded-[28px]
                   max-h-[90vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* handle bar móvil */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 shrink-0">
          <div className="min-w-0 flex-1">
            <span className="label-caps block mb-0.5">catálogo</span>
            <h3 className="font-serif-italic text-xl text-[#f4f4f0] truncate">buscar alimento</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#52525b] hover:text-[#f4f4f0] shrink-0 ml-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* search */}
        <div className="px-5 shrink-0">
          <input
            autoFocus
            type="text"
            placeholder="escribe un ingrediente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-pill w-full text-sm"
          />
        </div>

        {/* alérgenos bloqueados */}
        {allergies.length > 0 && (
          <div className="mx-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 shrink-0">
            <span className="label-caps block mb-1.5">alérgenos bloqueados</span>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a) => (
                <span key={a} className="text-[10px] text-[#f87171] px-2 py-0.5 rounded-full bg-[#f87171]/10">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* lista */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 px-5 pb-2">
          {results.map((food) => {
            const isSel = selected?.id === food.id;
            const p100 = prices[food.id] ?? null;
            return (
              <button
                key={food.id}
                onClick={() => setSelected(isSel ? null : food)}
                className={`flex items-center justify-between p-3.5 rounded-2xl text-left transition-all gap-3 shrink-0 ${
                  isSel
                    ? "bg-[#a3e635]/12 border border-[#a3e635]/30"
                    : "bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.10]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-[#f4f4f0] block truncate">{food.name}</span>
                  <span className="label-meta block mt-0.5 truncate">
                    p:{food.protein_g} · c:{food.carbs_g} · f:{food.fat_g}
                    {food.fiber_g ? ` · fib:${food.fiber_g}` : ""} /100g
                  </span>
                  {p100 !== null && (
                    <span className="block text-[10px] text-[#a3e635]/70 mt-0.5">≈ ${p100}/100g</span>
                  )}
                </div>
                <span className="font-mono-num text-xs text-[#a1a1aa] shrink-0">{food.calories} kcal</span>
              </button>
            );
          })}
          {results.length === 0 && <Empty icon="search" title="sin resultados." />}
        </div>

        {/* panel de confirmación */}
        {selected && (
          <div className="shrink-0 flex flex-col gap-3 px-5 pb-5 pt-4 border-t border-white/[0.07] bg-[#0d0d10]">
            {/* tipo de comida */}
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_ORDER.map((c) => (
                <button
                  key={c}
                  onClick={() => setMealType(c)}
                  className={`py-2 rounded-full text-[10px] font-medium transition-all text-center truncate ${
                    mealType === c
                      ? "bg-[#a3e635] text-[#09090b] font-semibold"
                      : "bg-white/[0.04] text-[#52525b] hover:text-[#a1a1aa]"
                  }`}
                >
                  {MEAL_LABELS[c]}
                </button>
              ))}
            </div>

            {/* gramos + kcal preview */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="label-caps shrink-0">gramos</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input-pill flex-1 min-w-0 text-sm py-2.5 px-4"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <span className="font-mono-num text-sm text-[#a1a1aa] shrink-0 w-20 text-right">
                {selectedGrams > 0 ? `${Math.round((selected.calories ?? 0) * k)} kcal` : "0 kcal"}
              </span>
            </div>

            <button onClick={add} className="btn-pill-primary w-full py-3 text-sm">
              registrar {selected.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
