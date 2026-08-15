"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Food, MealLog, MealType } from "../../types";
import {
  fetchActiveDiet,
  fetchMealLogs,
  fetchFoods,
  fetchPriceRecords,
  insertMealLog,
  deleteMealLog,
} from "@/lib/supabase/gym";
import { budgetBandsMXN, LOW_BUDGET_STRATEGY, pricePer100gFromRecord } from "@/lib/engine/nutrition";
import { SectionHeader, Empty } from "./Shared";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Snack",
};

export default function DietView() {
  const { user, profile } = useApp();
  const [diet, setDiet] = useState<Awaited<ReturnType<typeof fetchActiveDiet>>>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const load = useCallback(async () => {
    if (!user) return;
    const [d, m] = await Promise.all([
      fetchActiveDiet(user.id),
      fetchMealLogs(user.id, today),
    ]);
    setDiet(d);
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
      custom_name: meal.name ?? "Comida",
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
  const planMeals = useMemo(
    () =>
      (diet?.meals ?? [])
        .filter((m) => m.day_type === "training")
        .sort((a, b) => MEAL_ORDER.indexOf(a.meal_type ?? "snack") - MEAL_ORDER.indexOf(b.meal_type ?? "snack")),
    [diet]
  );
  const pricesUnknown =
    planMeals.length > 0 && planMeals.every((m) => m.cost_mxn === null || m.cost_mxn === undefined);
  const bands = useMemo(() => (weekly > 0 ? budgetBandsMXN(weekly) : null), [weekly]);

  if (loading) {
    return (
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">dieta</span>
        <div className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">dieta</span>
        <Empty icon="restaurant" title="Aún no tienes un plan de dieta." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 animate-fade-in-up">
      <SectionHeader
        kicker="plan activo"
        title={plan.name ?? "Plan de comidas"}
        action={
          <div className="text-right">
            <span className="font-mono-num text-sm text-[#a3e635]">
              ${Math.round(weekly).toLocaleString("es-MX")}
            </span>
            <span className="label-caps block">/ semana</span>
          </div>
        }
      />

      <div className="glass-floating p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="label-caps block mb-1">gasto hoy</span>
          <span className="font-mono-num text-lg sm:text-xl text-[#f4f4f0] block truncate">
            ${Math.round(spentToday * 100) / 100}
          </span>
        </div>
        <div className="text-right min-w-0">
          <span className="label-caps block mb-1">presupuesto diario</span>
          <span className="font-mono-num text-lg sm:text-xl text-[#a1a1aa] block truncate">
            ${dailyBudget ? Math.round(dailyBudget * 100) / 100 : "—"}
          </span>
        </div>
      </div>

      <div className="glass-floating p-3 sm:p-5 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto">
        {(["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"] as const).map((k) => (
          <div key={k} className="text-center flex-1 min-w-[52px]">
            <span className="font-mono-num text-xs sm:text-sm text-[#f4f4f0] block truncate">
              {k === "fiber_g" && (plan.fiber_g === null || plan.fiber_g === undefined) ? "—" : plan[k]}
            </span>
            <span className="label-caps block mt-1 !text-[9px] sm:!text-[10px]">
              {k === "calories" ? "kcal" : k === "fiber_g" ? "fibra" : k.replace("_g", "")}
            </span>
          </div>
        ))}
      </div>

      {pricesUnknown && (
        <div className="rounded-2xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] p-4 sm:p-5">
          <span className="label-caps text-[#fbbf24] block mb-2">precios por confirmar</span>
          <p className="text-xs text-[#a1a1aa]">
            Los precios no son constantes: se necesitan registros fechados por tienda, mercado y
            presentación. Hasta entonces, el costo del plan se muestra como pendiente y el
            presupuesto no puede ajustarse con precisión.
          </p>
          <div className="flex flex-col gap-1.5 mt-3">
            {LOW_BUDGET_STRATEGY.map((tip) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="text-[#a3e635] mt-px text-[10px]">•</span>
                <span className="text-[11px] text-[#d4d4d8]">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bands && !pricesUnknown && (
        <div className="glass-floating p-4 sm:p-5 flex flex-col gap-3">
          <SectionHeader kicker="presupuesto" title="reparto sugerido por semana" />
          {(
            [
              ["Proteínas", bands.proteins],
              ["Básicos", bands.staples],
              ["Verduras y frutas", bands.produce],
              ["Grasas y varios", bands.fats_and_misc],
            ] as const
          ).map(([label, [min, max]]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#a1a1aa] truncate">{label}</span>
              <span className="font-mono-num text-xs text-[#f4f4f0] shrink-0">
                ${min}–${max}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionHeader kicker="comidas" title="comidas del plan" />
        <div className="flex flex-col gap-3">
          {planMeals.map((meal) => {
            const logged = logs.some(
              (m) => m.custom_name === meal.name && m.meal_type === meal.meal_type
            );
            return (
              <div key={meal.id} className="glass-floating p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="label-caps block mb-1">
                      {MEAL_LABELS[meal.meal_type ?? "snack"]}
                    </span>
                    <span className="text-sm text-[#f4f4f0] font-medium block truncate">{meal.name}</span>
                    <span className="block text-[11px] text-[#71717a] mt-1 break-words">{meal.recipe}</span>
                  </div>
                  <div className="text-left sm:text-right shrink-0 mt-1 sm:mt-0">
                    <span className="font-mono-num text-sm text-[#f4f4f0] block">
                      {meal.calories} kcal
                    </span>
                    <span className="block font-mono-num text-[10px] text-[#a1a1aa]">
                      P{meal.protein_g} · C{meal.carbs_g} · F{meal.fat_g}
                      {meal.fiber_g !== null && meal.fiber_g !== undefined
                        ? ` · Fib ${meal.fiber_g}`
                        : ""}
                    </span>
                    <span className="block font-mono-num text-[10px] text-[#71717a]">
                      {meal.cost_mxn === null || meal.cost_mxn === undefined
                        ? "precio pendiente"
                        : `$${meal.cost_mxn}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {logged ? (
                    <button
                      onClick={() => {
                        const l = logs.find((m) => m.custom_name === meal.name && m.meal_type === meal.meal_type);
                        if (l) handleDelete(l.id);
                      }}
                      className="btn-pill-secondary text-xs py-1.5 px-3"
                    >
                      Quitar registro
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLog(meal.id)}
                      className="btn-pill-primary text-xs py-1.5 px-3"
                    >
                      Registrar hoy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader
          kicker="diario"
          title="registrado hoy"
          action={
            <button
              onClick={() => setPickerOpen(true)}
              className="btn-pill-secondary text-xs py-1.5 px-3"
            >
              + Alimento
            </button>
          }
        />
        {logs.length === 0 ? (
          <Empty icon="event_note" title="Nada registrado hoy todavía." />
        ) : (
          <div className="glass-floating divide-y divide-white/[0.06]">
            {logs.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3 px-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-[#f4f4f0] truncate block">{m.custom_name}</span>
                  <span className="font-mono-num text-[10px] text-[#52525b] block truncate mt-0.5">
                    {m.calories} kcal
                    {m.fiber_g ? ` · ${m.fiber_g} g fibra` : ""}
                    {m.cost_mxn ? ` · $${m.cost_mxn}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-[#52525b] hover:text-[#f87171] transition-colors shrink-0 p-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
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
    </div>
  );
}

function FoodPicker({
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
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isBlocked = (f: Food) =>
      (f.allergens ?? []).some((a) => allergies.includes(a));
    const list = foods.filter((f) => !isBlocked(f));
    const filtered = q
      ? list.filter((f) => f.name.toLowerCase().includes(q))
      : list;
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 pb-20 sm:pb-6 bg-black/80 backdrop-blur-md animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-modal-panel p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 max-h-[82vh] sm:max-h-[85vh] overflow-hidden rounded-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <span className="label-caps block mb-0.5">Registro de Alimentos</span>
            <h3 className="font-serif-title text-xl sm:text-2xl text-[#f4f4f0] truncate">Buscar en el catálogo</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#71717a] hover:text-[#f4f4f0] shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Escribe un ingrediente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-pill w-full text-sm py-2.5 px-4 shrink-0"
        />

        {allergies.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 shrink-0">
            <span className="label-caps block mb-1">alérgenos bloqueados</span>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a) => (
                <span key={a} className="text-[10px] text-[#f87171] px-2 py-0.5 rounded-full bg-[#f87171]/10">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
          {results.map((food) => {
            const isSel = selected?.id === food.id;
            const p100 = prices[food.id] ?? null;
            return (
              <button
                key={food.id}
                onClick={() => setSelected(isSel ? null : food)}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl text-left transition-all gap-2 shrink-0 ${
                  isSel
                    ? "bg-[#a3e635]/15 border border-[#a3e635]/30 text-[#f4f4f0]"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] text-[#f4f4f0]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-medium block truncate">{food.name}</span>
                  <span className="text-[10px] sm:text-[11px] text-[#71717a] block truncate mt-0.5">
                    P:{food.protein_g} · C:{food.carbs_g} · F:{food.fat_g}
                    {food.fiber_g ? ` · Fib:${food.fiber_g}` : ""} /100 g
                  </span>
                  {p100 !== null && (
                    <span className="block text-[10px] sm:text-[11px] text-[#a3e635] mt-0.5">≈ ${p100}/100 g</span>
                  )}
                </div>
                <span className="font-mono-num text-xs sm:text-sm text-[#a1a1aa] shrink-0">
                  {food.calories} kcal
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <Empty icon="search" title="Sin resultados." />
          )}
        </div>

        {selected && (
          <div className="shrink-0 flex flex-col gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-white/[0.08] bg-[#0e0e11]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {MEAL_ORDER.map((c) => (
                <button
                  key={c}
                  onClick={() => setMealType(c)}
                  className={`py-2 px-2 rounded-full text-xs font-medium transition-all text-center truncate ${
                    mealType === c
                      ? "bg-[#a3e635] text-[#09090b] font-semibold"
                      : "bg-white/[0.04] text-[#71717a]"
                  }`}
                >
                  {MEAL_LABELS[c]}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="label-caps shrink-0">gramos</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input-pill flex-1 min-w-0 text-sm py-2 px-4"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <span className="font-mono-num text-xs sm:text-sm text-[#a1a1aa] text-center sm:text-right shrink-0">
                {selectedGrams > 0
                  ? `${Math.round((selected.calories ?? 0) * k)} kcal`
                  : "0 kcal"}
              </span>
            </div>

            <button onClick={add} className="btn-pill-primary w-full py-2.5 sm:py-3 text-xs sm:text-sm">
              Registrar {selected.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
