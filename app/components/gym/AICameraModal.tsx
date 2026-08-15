"use client";

import { useRef, useState } from "react";
import type { MealType, VisionFood } from "../../types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Snack",
};

interface FoodItem extends VisionFood {
  base: VisionFood;
}

export default function AICameraModal({
  allergies,
  onLog,
  onClose,
}: {
  allergies: string[];
  onLog: (log: {
    meal_type: MealType;
    custom_name: string;
    quantity?: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    micros?: string[];
  }) => void;
  onClose: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [stage, setStage] = useState<"capture" | "analyzing" | "result" | "error">("capture");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o WEBP.");
      setStage("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!image) return;
    setStage("analyzing");
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "No se pudo analizar la foto.");
      const list: VisionFood[] = Array.isArray(j?.foods) ? j.foods : [];
      if (list.length === 0) {
        setError("No detecté comida en la foto. Intenta con otra más clara.");
        setStage("error");
        return;
      }
      setFoods(list.map((f) => ({ ...f, base: { ...f } })));
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setStage("error");
    }
  }

  function rescale(food: FoodItem, gramsStr: string) {
    const g = Math.max(0, Number(gramsStr) || 0);
    const base = food.base;
    const ratio = base.grams && base.grams > 0 ? g / base.grams : g / 100;
    setFoods((prev) =>
      prev.map((item) =>
        item === food
          ? {
              ...item,
              grams: g,
              calories: Math.round((base.calories ?? 0) * ratio),
              protein_g: Math.round((base.protein_g ?? 0) * ratio * 10) / 10,
              carbs_g: Math.round((base.carbs_g ?? 0) * ratio * 10) / 10,
              fat_g: Math.round((base.fat_g ?? 0) * ratio * 10) / 10,
              fiber_g: base.fiber_g ? Math.round(base.fiber_g * ratio * 10) / 10 : undefined,
            }
          : item
      )
    );
  }

  const allergenOf = (f: VisionFood) =>
    allergies.find((a) => a.trim() && f.name.toLowerCase().includes(a.trim().toLowerCase()));

  function registerAll() {
    setBusy(true);
    for (const f of foods) {
      onLog({
        meal_type: mealType,
        custom_name: f.name,
        quantity: f.grams ?? 0,
        calories: Math.round(f.calories ?? 0),
        protein_g: Math.round((f.protein_g ?? 0) * 10) / 10,
        carbs_g: Math.round((f.carbs_g ?? 0) * 10) / 10,
        fat_g: Math.round((f.fat_g ?? 0) * 10) / 10,
        fiber_g: f.fiber_g ? Math.round(f.fiber_g * 10) / 10 : undefined,
        micros: f.micros?.slice(0, 4),
      });
    }
    onClose();
  }

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
            <span className="label-caps block mb-0.5">Cámara IA</span>
            <h3 className="font-serif-title text-xl sm:text-2xl text-[#f4f4f0] truncate">
              {stage === "result" ? "Alimentos detectados" : "Registrar con una foto"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#71717a] hover:text-[#f4f4f0] shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
          {stage === "capture" && (
            <div className="flex flex-col gap-3 py-1">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL local, no aplica next/image
                <img
                  src={image}
                  alt="Foto de la comida"
                  className="w-full max-h-72 object-cover rounded-2xl border border-white/[0.08]"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-3 text-center p-6">
                  <span className="material-symbols-outlined text-[40px] text-[#71717a]">
                    photo_camera
                  </span>
                  <span className="text-xs text-[#71717a] max-w-[240px]">
                    Toma una foto de tu comida y Vora la registra con macros y micros.
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="btn-pill-primary flex-1 py-2.5 text-xs"
                >
                  Tomar foto
                </button>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={handleFile}
                />
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="btn-pill-secondary flex-1 py-2.5 text-xs"
                >
                  Elegir de galería
                </button>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              {image && (
                <button onClick={analyze} className="btn-pill-primary w-full py-2.5 text-xs">
                  Analizar con Vora
                </button>
              )}
            </div>
          )}

          {stage === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#a3e635]/30 border-t-[#a3e635] animate-spin" />
              <span className="text-xs text-[#a1a1aa]">Vora está leyendo tu plato…</span>
            </div>
          )}

          {stage === "error" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#f87171]">error_outline</span>
              <span className="text-xs text-[#a1a1aa] max-w-[260px]">{error}</span>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={() => setStage("capture")}
                  className="btn-pill-secondary flex-1 py-2.5 text-xs"
                >
                  Volver a intentar
                </button>
                <button
                  onClick={() => {
                    setImage(null);
                    setError("");
                    setStage("capture");
                  }}
                  className="btn-pill-secondary flex-1 py-2.5 text-xs"
                >
                  Cambiar foto
                </button>
              </div>
            </div>
          )}

          {stage === "result" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 shrink-0">
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

              {foods.map((f, i) => {
                const allergen = allergenOf(f);
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-3 sm:p-4 ${
                      allergen
                        ? "border-[#f87171]/30 bg-[#f87171]/[0.05]"
                        : "border-white/[0.08] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm text-[#f4f4f0] font-medium truncate flex-1 min-w-0">
                        {f.name}
                      </span>
                      <span className="font-mono-num text-xs text-[#a3e635] shrink-0">
                        {f.calories} kcal
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <span className="label-caps shrink-0">gramos</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={f.grams ?? ""}
                        onChange={(e) => rescale(f, e.target.value.replace(/[^0-9.]/g, ""))}
                        className="input-pill w-24 text-xs py-1.5 px-3"
                      />
                      <span className="font-mono-num text-[10px] text-[#52525b] shrink-0">
                        P{f.protein_g ?? 0} · C{f.carbs_g ?? 0} · F{f.fat_g ?? 0}
                        {f.fiber_g ? ` · Fib ${f.fiber_g}` : ""}
                      </span>
                    </div>
                    {(f.micros?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {f.micros!.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] text-[#a1a1aa] px-2 py-0.5 rounded-full bg-white/[0.05]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                    {allergen && (
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <span className="material-symbols-outlined text-[14px] text-[#f87171]">
                          warning
                        </span>
                        <span className="text-[10px] text-[#f87171]">
                          Posible alérgeno: {allergen}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => setStage("capture")}
                  className="btn-pill-secondary py-2.5 text-xs"
                >
                  Otra foto
                </button>
                <button
                  onClick={registerAll}
                  disabled={busy}
                  className="btn-pill-primary flex-1 py-2.5 text-xs"
                >
                  {busy ? "Registrando…" : `Registrar ${foods.length} ${foods.length === 1 ? "alimento" : "alimentos"}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
