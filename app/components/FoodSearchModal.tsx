"use client";

import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { MealEntry, MealCategory } from "../types";

const FOOD_DB = [
  { id: "f1", name: "Pechuga de Pollo a la Plancha", calories: 165, macros: { protein: 31, carbs: 0, fat: 4 }, serving: 100, unit: "g" },
  { id: "f2", name: "Arroz Integral al Vapor", calories: 216, macros: { protein: 5, carbs: 45, fat: 2 }, serving: 100, unit: "g" },
  { id: "f3", name: "Avena con Frutos Rojos", calories: 310, macros: { protein: 12, carbs: 52, fat: 7 }, serving: 300, unit: "g" },
  { id: "f4", name: "Huevo Entero de Granja", calories: 74, macros: { protein: 6, carbs: 1, fat: 5 }, serving: 50, unit: "g" },
  { id: "f5", name: "Bowl de Ensalada de Atún", calories: 180, macros: { protein: 28, carbs: 6, fat: 5 }, serving: 200, unit: "g" },
  { id: "f6", name: "Filete de Salmón al Horno", calories: 208, macros: { protein: 28, carbs: 0, fat: 10 }, serving: 100, unit: "g" },
  { id: "f7", name: "Yogurt Griego Natural", calories: 100, macros: { protein: 17, carbs: 6, fat: 1 }, serving: 170, unit: "g" },
  { id: "f8", name: "Batido de Proteína Isolatada", calories: 150, macros: { protein: 30, carbs: 5, fat: 2 }, serving: 300, unit: "ml" },
  { id: "f9", name: "Aguacate Hass Fresco", calories: 160, macros: { protein: 2, carbs: 9, fat: 15 }, serving: 100, unit: "g" },
];

const CATEGORIES: { id: MealCategory; label: string }[] = [
  { id: "breakfast", label: "Desayuno" },
  { id: "lunch", label: "Comida" },
  { id: "dinner", label: "Cena" },
  { id: "snack", label: "Snack" },
];

export default function FoodSearchModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<typeof FOOD_DB[0] | null>(null);
  const [servings, setServings] = useState(1);
  const [category, setCategory] = useState<MealCategory>("lunch");

  const results = FOOD_DB.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = () => {
    if (!selected) return;
    const entry: MealEntry = {
      id: `m-${Date.now()}`,
      name: selected.name,
      category,
      calories: Math.round(selected.calories * servings),
      macros: {
        protein: Math.round(selected.macros.protein * servings),
        carbs: Math.round(selected.macros.carbs * servings),
        fat: Math.round(selected.macros.fat * servings),
      },
      time: Date.now().toString(),
    };
    dispatch({ type: "ADD_MEAL", meal: entry });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-modal-panel p-8 flex flex-col gap-6 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="label-caps block mb-1">Registro de Alimentos</span>
            <h3 className="font-serif-title text-2xl text-[#f4f4f0]">
              Buscar en la Base de Datos
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#71717a] hover:text-[#f4f4f0]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Input */}
        <input
          autoFocus
          type="text"
          placeholder="Escribe un ingrediente o plato..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-pill w-full"
        />

        {/* Results */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-[220px]">
          {results.map((food) => {
            const isSel = selected?.id === food.id;
            return (
              <button
                key={food.id}
                onClick={() => setSelected(isSel ? null : food)}
                className={`flex items-center justify-between p-4 rounded-2xl text-left transition-all ${
                  isSel
                    ? "bg-[#a3e635]/15 border border-[#a3e635]/30 text-[#f4f4f0]"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] text-[#f4f4f0]"
                }`}
              >
                <div>
                  <span className="font-serif-title text-base font-normal block">
                    {food.name}
                  </span>
                  <span className="text-xs text-[#71717a]">
                    P:{food.macros.protein}g C:{food.macros.carbs}g F:{food.macros.fat}g por {food.serving}{food.unit}
                  </span>
                </div>
                <span className="font-serif-title text-lg text-[#a3e635]">
                  {food.calories} kcal
                </span>
              </button>
            );
          })}
        </div>

        {/* Category & Action */}
        {selected && (
          <div className="flex flex-col gap-4 pt-4 border-t border-white/[0.08]">
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex-1 py-2 rounded-full text-xs font-medium transition-all ${
                    category === c.id
                      ? "bg-[#a3e635] text-[#09090b] font-semibold"
                      : "bg-white/[0.04] text-[#71717a]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <span className="label-caps">Porción:</span>
                <button
                  onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                  className="btn-pill-secondary px-3 py-1 text-xs"
                >
                  -
                </button>
                <span className="font-serif-title text-xl text-[#f4f4f0] w-6 text-center">
                  {servings}
                </span>
                <button
                  onClick={() => setServings(servings + 0.5)}
                  className="btn-pill-secondary px-3 py-1 text-xs"
                >
                  +
                </button>
              </div>

              <button onClick={handleAdd} className="btn-pill-primary">
                Agregar {Math.round(selected.calories * servings)} kcal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
