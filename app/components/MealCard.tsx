"use client";

import { useState } from "react";
import type { MealEntry } from "../types";
import { useApp } from "../context/AppContext";

function formatTime(ts: string) {
  const d = new Date(parseInt(ts));
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function MealCard({ meal }: { meal: MealEntry }) {
  const { dispatch } = useApp();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-floating p-5 transition-all duration-300 hover:border-white/[0.15] cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {/* Image Thumbnail */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {meal.image ? (
              <img
                src={meal.image}
                alt={meal.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-[20px] text-[#71717a]">
                restaurant
              </span>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="label-caps">{meal.category}</span>
              <span className="text-[#71717a] text-[10px]">•</span>
              <span className="font-mono-num text-xs text-[#a1a1aa]">
                {formatTime(meal.time)}
              </span>
            </div>
            <h4 className="font-serif-title text-xl font-normal text-[#f4f4f0] truncate">
              {meal.name}
            </h4>
          </div>
        </div>

        {/* Calories & Delete Action */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span className="font-serif-title text-xl font-normal text-[#a3e635] block">
              {meal.calories} <span className="text-xs font-sans font-light text-[#a1a1aa]">kcal</span>
            </span>
            <span className="text-xs text-[#a1a1aa] hidden sm:block">
              P:{meal.macros.protein}g C:{meal.macros.carbs}g F:{meal.macros.fat}g
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "REMOVE_MEAL", id: meal.id });
            }}
            className="text-[#a1a1aa] hover:text-[#ef4444] transition-colors p-2"
            title="Eliminar registro"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {expanded && (
        <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-white/[0.06]">
          {[
            { label: "proteínas", val: `${meal.macros.protein}g`, highlight: true },
            { label: "carbohidratos", val: `${meal.macros.carbs}g`, highlight: false },
            { label: "grasas", val: `${meal.macros.fat}g`, highlight: false },
          ].map(({ label, val, highlight }) => (
            <div
              key={label}
              className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
            >
              <span className={`font-serif-title text-xl ${highlight ? "text-[#a3e635]" : "text-[#f4f4f0]"}`}>
                {val}
              </span>
              <span className="label-caps block mt-1">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
