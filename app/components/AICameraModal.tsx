"use client";

import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { MealEntry, MealCategory } from "../types";

const SCAN_PRESETS = [
  {
    id: "s1",
    name: "Bowl de Salmón con Quinoa",
    calories: 520,
    macros: { protein: 38, carbs: 42, fat: 18 },
    confidence: 98,
  },
  {
    id: "s2",
    name: "Avena con Frutos Rojos y Chía",
    calories: 310,
    macros: { protein: 12, carbs: 52, fat: 7 },
    confidence: 95,
  },
  {
    id: "s3",
    name: "Pechuga de Pollo a las Hierbas",
    calories: 320,
    macros: { protein: 52, carbs: 2, fat: 10 },
    confidence: 99,
  },
];

type ScanState = "idle" | "scanning" | "result";

export default function AICameraModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [detected, setDetected] = useState<typeof SCAN_PRESETS[0] | null>(null);
  const [category, setCategory] = useState<MealCategory>("lunch");

  const startScan = () => {
    setScanState("scanning");
    setTimeout(() => {
      const pick = SCAN_PRESETS[Math.floor(Math.random() * SCAN_PRESETS.length)];
      setDetected(pick);
      setScanState("result");
    }, 1800);
  };

  const handleLog = () => {
    if (!detected) return;
    const entry: MealEntry = {
      id: `m-${Date.now()}`,
      name: detected.name,
      category,
      calories: detected.calories,
      macros: detected.macros,
      time: Date.now().toString(),
    };
    dispatch({ type: "ADD_MEAL", meal: entry });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b]/95 backdrop-blur-xl flex flex-col justify-between p-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
        <div>
          <span className="label-caps block mb-1">Escáner de Visión IA</span>
          <h3 className="font-serif-title text-2xl text-[#f4f4f0]">Reconocimiento Nutricional</h3>
        </div>
        <button onClick={onClose} className="btn-pill-secondary">
          Cerrar
        </button>
      </div>

      {/* Reticle Viewport */}
      <div className="w-full max-w-md mx-auto aspect-square rounded-3xl border border-white/[0.1] bg-white/[0.02] relative flex flex-col items-center justify-center p-8 overflow-hidden shadow-2xl">
        {scanState === "idle" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#71717a]">
              photo_camera
            </span>
            <p className="font-serif-title text-xl text-[#f4f4f0]">Apunte a su platillo</p>
            <p className="text-xs text-[#71717a]">La inteligencia artificial identificará los nutrientes e ingredientes.</p>
          </div>
        )}

        {scanState === "scanning" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-3 h-3 rounded-full bg-[#a3e635] animate-ping" />
            <span className="font-serif-title text-2xl text-[#a3e635] italic">Analizando composición...</span>
          </div>
        )}

        {scanState === "result" && detected && (
          <div className="flex flex-col items-center gap-3 text-center animate-fade-in-up">
            <span className="label-caps text-[#a3e635]">{detected.confidence}% de Coincidencia</span>
            <h4 className="font-serif-title text-3xl text-[#f4f4f0]">{detected.name}</h4>
            <div className="font-serif-title text-4xl text-[#a3e635]">{detected.calories} kcal</div>

            <div className="grid grid-cols-3 gap-4 w-full mt-4 pt-4 border-t border-white/[0.08]">
              <div>
                <span className="font-serif-title text-xl text-[#f4f4f0]">{detected.macros.protein}g</span>
                <span className="label-caps block mt-1">Proteína</span>
              </div>
              <div>
                <span className="font-serif-title text-xl text-[#f4f4f0]">{detected.macros.carbs}g</span>
                <span className="label-caps block mt-1">Carbos</span>
              </div>
              <div>
                <span className="font-serif-title text-xl text-[#f4f4f0]">{detected.macros.fat}g</span>
                <span className="label-caps block mt-1">Grasas</span>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    category === cat
                      ? "bg-[#a3e635] text-[#09090b]"
                      : "bg-white/[0.04] text-[#a1a1aa]"
                  }`}
                >
                  {cat === "breakfast" ? "Desayuno" : cat === "lunch" ? "Comida" : cat === "dinner" ? "Cena" : "Snack"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-3">
        {scanState === "idle" && (
          <button onClick={startScan} className="btn-pill-primary w-full py-4 text-base">
            Iniciar Escaneo Inteligente
          </button>
        )}

        {scanState === "result" && (
          <div className="flex gap-3">
            <button onClick={() => { setScanState("idle"); setDetected(null); }} className="btn-pill-secondary flex-1 py-3">
              Reintentar
            </button>
            <button onClick={handleLog} className="btn-pill-primary flex-1 py-3">
              Guardar en Diario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
