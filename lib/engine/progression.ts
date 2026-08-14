// ─── Motor de RIR y Progresión ─────────────────────────────────
// Implementación fiel a supabase/migrations/progresion-rules.db y a
// los overrides por ejercicio de supabase/migrations/ejercicios.db
// (campos default_rir_*, progression_rule, failure_policy,
//  beginner_regression, advanced_progression, category, power_reps).
// Prioridad: técnica/tolerancia → repeticiones → carga/dificultad.
// Módulo puro: sin imports runtime (funciona en Next y en Node).

export type Experience = "beginner" | "intermediate" | "advanced";
export type RirPain = "green" | "yellow" | "red";
export type RirVelocity = "fast" | "normal" | "slow";

export type ExerciseCategory =
  | "libre_multiar"
  | "maquina_polea"
  | "aislamiento"
  | "power";

export type ProgressionAction =
  | "increase_load"
  | "increase_reps"
  | "switch_variant"
  | "maintain"
  | "reduce_load"
  | "deload"
  | "stop";

export interface LoggedSet {
  reps: number;
  weightKg: number | null;
  rir: number | null;
  pain?: RirPain | null;
  velocity?: RirVelocity | null;
  technique?: boolean | null; // true = estable
  technicalFailure?: boolean | null;
}

export interface PlannedTarget {
  sets: number;
  repsLow: number;
  repsHigh: number;
  rir: number | null;
  unilateral?: boolean;
}

export interface ExerciseRef {
  slug: string;
  gear?: string;
  variationGroup?: string;
  pattern?: string;
  unilateralSupport?: boolean;
  meta?: Record<string, unknown> | null;
}

export interface ProgressionInput {
  experience: Experience;
  exercise: ExerciseRef;
  planned: PlannedTarget;
  sets: LoggedSet[];
  prevBestWeight?: number | null;
  prevE1rm?: number | null;
  consecutivePoorSessions?: number;
  beginnerFirstWeeks?: boolean;
}

export interface ProgressionDecision {
  action: ProgressionAction;
  pct?: number;
  fromWeight?: number | null;
  toWeight?: number | null;
  toReps?: number | null;
  removeSet?: boolean;
  rationale: string[];
}

// ─── RIR objetivo por nivel (progresion-rules.db › rir_by_level) ─

export interface RirBand {
  min: number;
  max: number;
}

const RIR_BY_LEVEL: Record<Experience, Record<ExerciseCategory, RirBand>> = {
  beginner: {
    libre_multiar: { min: 3, max: 4 },
    maquina_polea: { min: 2, max: 4 },
    aislamiento: { min: 2, max: 4 },
    power: { min: 2, max: 4 },
  },
  intermediate: {
    libre_multiar: { min: 2, max: 3 },
    maquina_polea: { min: 1, max: 3 },
    aislamiento: { min: 1, max: 3 },
    power: { min: 1, max: 3 },
  },
  advanced: {
    libre_multiar: { min: 1, max: 3 },
    maquina_polea: { min: 0, max: 2 },
    aislamiento: { min: 0, max: 2 },
    power: { min: 1, max: 2 },
  },
};

// Grupos compuestos (espejo de lib/engine/workout.ts, sin dependencia runtime)
const COMPOUND_GROUPS = new Set([
  "squat",
  "horizontal_push",
  "vertical_push",
  "vertical_pull",
  "row",
  "deadlift",
  "lunge",
  "dips",
  "incline_push",
  "glute_hinge",
  "carry",
  "pullover",
]);

export function isCompoundGroup(group: string): boolean {
  return COMPOUND_GROUPS.has(group);
}

export function classify(exercise: ExerciseRef): ExerciseCategory {
  const cat = (exercise.meta?.category as string | undefined) ?? "";
  if (cat === "potencia" || exercise.pattern === "power") return "power";
  if (!isCompoundGroup(exercise.variationGroup ?? "")) return "aislamiento";
  const g = exercise.gear;
  if (g === "machine" || g === "cable") return "maquina_polea";
  return "libre_multiar";
}

const RIR_LEVEL_KEY = {
  beginner: "default_rir_beginner",
  intermediate: "default_rir_intermediate",
  advanced: "default_rir_advanced",
} as const;

function parseRirRange(value: unknown): RirBand | null {
  if (typeof value !== "string") return null;
  const m = value.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const min = Math.max(0, Number(m[1]));
  const max = Math.max(min, Number(m[2]));
  return { min, max };
}

// Banda objetivo: override por ejercicio > tabla por nivel > RIR del plan.
export function rirTargets(
  experience: Experience,
  category: ExerciseCategory,
  exercise?: ExerciseRef | null,
  plannedRir?: number | null
): RirBand {
  const metaRir = exercise?.meta?.[RIR_LEVEL_KEY[experience]];
  const parsed = parseRirRange(metaRir);
  if (parsed) return parsed;

  const band = RIR_BY_LEVEL[experience][category];
  if (band) return band;

  const r = plannedRir ?? 2;
  return { min: Math.max(0, r - 1), max: r + 1 };
}

// ─── 1RM estimado (Epley) ──────────────────────────────────────

export function estimate1RM(weightKg: number | null, reps: number): number | null {
  if (weightKg == null || weightKg <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function roundPlate(w: number): number {
  return Math.round(w * 2) / 2;
}

function bestWeight(setWeight: number | null, prev: number | null | undefined): number | null {
  const candidates = [setWeight, prev ?? null].filter(
    (v): v is number => v != null && v > 0
  );
  return candidates.length ? Math.max(...candidates) : null;
}

// ─── Decisor de progresión ─────────────────────────────────────

export function decideProgression(input: ProgressionInput): ProgressionDecision {
  const { experience, exercise, planned, sets } = input;
  const category = classify(exercise);
  const band = rirTargets(experience, category, exercise, planned.rir);

  const realReps = sets.map((s) => s.reps).filter((r) => r > 0);
  if (realReps.length === 0) {
    return { action: "maintain", rationale: ["Sin series registradas en esta sesión."] };
  }

  const allTop = realReps.every((r) => r >= planned.repsHigh);
  const allBottom = realReps.every((r) => r < planned.repsLow);

  const realRirs = sets.map((s) => s.rir).filter((r) => r != null);
  const mostlyRir = (pred: (r: number) => boolean) => {
    if (realRirs.length === 0) return false;
    return realRirs.filter(pred).length / realRirs.length >= 0.5;
  };
  const rirTooLow = mostlyRir((r) => r <= band.min - 2);
  const rirTooHigh = mostlyRir((r) => r >= band.max + 2);
  const rirInBand = mostlyRir((r) => r >= band.min - 1 && r <= band.max + 1);

  const anyRed = sets.some((s) => s.pain === "red");
  const painYellow = sets.some((s) => s.pain === "yellow");
  const techBreak =
    sets.some((s) => s.technicalFailure === true) ||
    sets.some((s) => s.technique === false);

  const velocities = sets.map((s) => s.velocity).filter((v): v is RirVelocity => v != null);
  const mostlySlow =
    velocities.length > 0 &&
    velocities.filter((v) => v === "slow").length / velocities.length >= 0.5;
  const mostlyFast =
    velocities.length > 0 &&
    velocities.filter((v) => v === "fast").length / velocities.length >= 0.7;

  const weights = sets.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
  const setWeight = weights.length ? Math.max(...weights) : null;
  const baseWeight = bestWeight(setWeight, input.prevBestWeight);

  const jumpPct = category === "aislamiento" ? 2 : 3; // 1.5–2.5% aisla · 2.5–5% multi
  const reducePct = category === "aislamiento" ? 2.5 : 5;

  // 1. Rojo: dolor agudo / pérdida súbita de fuerza → parar
  if (anyRed) {
    return {
      action: "stop",
      rationale: [
        "Dolor agudo, irradiado, pérdida de fuerza súbita o inestabilidad: detener la sesión y valoración profesional.",
        "No usar RIR para justificar dolor.",
      ],
    };
  }

  // 2. Rama de potencia: criterio de velocidad, no RIR muscular
  if (category === "power") {
    if (techBreak) {
      return {
        action: "reduce_load",
        pct: reducePct,
        fromWeight: baseWeight,
        toWeight: baseWeight ? roundPlate(baseWeight * (1 - reducePct / 100)) : null,
        rationale: [
          "Fallo técnico o pérdida de calidad: detener por caída de velocidad o calidad.",
          "Potencia: priorizar intención máxima y pocas repeticiones con descansos suficientes.",
        ],
      };
    }
    if (mostlySlow) {
      return {
        action: "reduce_load",
        pct: reducePct,
        fromWeight: baseWeight,
        toWeight: baseWeight ? roundPlate(baseWeight * (1 - reducePct / 100)) : null,
        rationale: ["Caída observable de velocidad: reducir la carga o la dificultad."],
      };
    }
    if (mostlyFast && !painYellow) {
      return {
        action: "increase_load",
        pct: 2.5,
        fromWeight: baseWeight,
        toWeight: baseWeight ? roundPlate(baseWeight * 1.025) : null,
        rationale: ["Intención máxima mantenida a alta velocidad: subir un poco la carga."],
      };
    }
    return { action: "maintain", rationale: ["Potencia estable: mantener carga e intención."] };
  }

  // 3. Descarga: 2+ sesiones peores o fatiga sistémica (progresion-rules.db › deload)
  const poorSessions = input.consecutivePoorSessions ?? 0;
  const systemic = painYellow && mostlySlow;
  if (poorSessions >= 2 || systemic) {
    return {
      action: "deload",
      pct: 35,
      fromWeight: baseWeight,
      toWeight: baseWeight ? roundPlate(baseWeight * 0.75) : null,
      removeSet: true,
      rationale: [
        poorSessions >= 2
          ? "Dos o más sesiones consecutivas con rendimiento claramente inferior."
          : "Fatiga persistente con molestias crecientes.",
        "Descarga: reducir el volumen 30–50% durante una semana, cargas moderadas y sin acercarse al fallo.",
        "No es automático por calendario: se aplica solo por señales reales.",
      ],
    };
  }

  // 4. Dolor amarillo: modificar antes de progresar
  if (painYellow) {
    return {
      action: "reduce_load",
      pct: reducePct,
      fromWeight: baseWeight,
      toWeight: baseWeight ? roundPlate(baseWeight * (1 - reducePct / 100)) : null,
      rationale: [
        "Molestia que cambia la técnica o aumenta serie a serie (amarillo).",
        "Reducir carga, rango, volumen o cambiar variante.",
      ],
    };
  }

  // 5. Fallo técnico temprano o RIR bajo el piso → no progresar
  if (techBreak) {
    return {
      action: "reduce_load",
      pct: reducePct,
      fromWeight: baseWeight,
      toWeight: baseWeight ? roundPlate(baseWeight * (1 - reducePct / 100)) : null,
      rationale: [
        "Fallo técnico o técnica deformada: la serie termina cuando se pierde rango, trayectoria o velocidad.",
      ],
    };
  }

  // 6. Reps bajo el mínimo o RIR real ≥2 repeticiones bajo el objetivo → reducir
  if (allBottom || rirTooLow) {
    return {
      action: "reduce_load",
      pct: rirTooLow ? 5 : reducePct,
      fromWeight: baseWeight,
      toWeight: baseWeight ? roundPlate(baseWeight * (1 - (rirTooLow ? 0.05 : reducePct / 100))) : null,
      removeSet: baseWeight == null,
      rationale: [
        allBottom ? `No se alcanzó el mínimo del rango (${planned.repsLow} reps).` : "",
        rirTooLow ? `RIR real al menos 2 repeticiones inferior al objetivo (${band.min}-${band.max}).` : "",
        "Reducir la carga 2.5–10% o quitar una serie.",
      ].filter(Boolean),
    };
  }

  // 7. Tope del rango con RIR en objetivo (o demasiado alto) → progresar
  if (allTop && !techBreak && !painYellow && !mostlySlow && (rirInBand || rirTooHigh)) {
    // Principiante en las primeras semanas: margen conservador (velocidad como respaldo)
    const conservative =
      experience === "beginner" &&
      (input.beginnerFirstWeeks ?? false) &&
      velocities.length > 0 &&
      !mostlyFast;
    if (conservative) {
      return {
        action: "maintain",
        rationale: [
          "Estás en las primeras semanas: margen conservador si el RIR percibido no es fiable.",
          "Repite el tope del rango con velocidad y técnica estables antes de subir carga.",
        ],
      };
    }

    // Peso corporal: subir dificultad/variante o reps antes que "carga"
    if (exercise.gear === "bodyweight") {
      const advanced = exercise.meta?.advanced_progression;
      const beginner = exercise.meta?.beginner_regression;
      const suggestUnilateral =
        exercise.unilateralSupport === true && planned.unilateral !== true;
      if (suggestUnilateral) {
        return {
          action: "switch_variant",
          toReps: planned.repsLow,
          rationale: [
            "Tope del rango con bilateral dominado: cambia a una pierna / un brazo.",
            "La progresión unilateral va después de dominar la versión bilateral.",
          ],
        };
      }
      if (typeof advanced === "string" && advanced.length > 0) {
        return {
          action: "switch_variant",
          toReps: planned.repsLow,
          rationale: [
            "Tope del rango con técnica estable: sube la dificultad de la variante.",
            advanced,
          ],
        };
      }
      if (typeof beginner === "string" && beginner.length > 0 && planned.repsLow >= 6) {
        return {
          action: "increase_reps",
          toReps: planned.repsHigh + 1,
          rationale: [
            "Aún sin variante más difícil disponible: domina más repeticiones en el rango.",
            "Si dominas la variante actual, progresa hacia: " + beginner,
          ],
        };
      }
      return {
        action: "increase_reps",
        toReps: planned.repsHigh + 1,
        rationale: ["Tope del rango en peso corporal: sube el objetivo de repeticiones."],
      };
    }

    // Carga progresiva (doble progresión)
    const target = baseWeight ?? setWeight;
    const toWeight = target ? roundPlate(target * (1 + jumpPct / 100)) : null;
    if (toWeight == null) {
      return {
        action: "increase_reps",
        toReps: planned.repsHigh + 1,
        rationale: ["Sin peso registrado: sube una repetición antes de cargar."],
      };
    }
    return {
      action: "increase_load",
      pct: jumpPct,
      fromWeight: target,
      toWeight,
      toReps: planned.repsLow,
      rationale: [
        `Todas las series al extremo alto del rango (${planned.repsHigh}) con RIR ${band.min}-${band.max} y técnica estable.`,
        `Aumentar la carga entre 2 y 5% (aislamiento 1–2.5%): ${target} kg → ${toWeight} kg (+${jumpPct}%).`,
        "Vuelve al extremo bajo o medio del rango y repite el ciclo.",
      ],
    };
  }

  // 8. RIR demasiado alto sin llegar al tope: señal de carga fácil, mantener el ciclo
  if (rirTooHigh) {
    return {
      action: "maintain",
      rationale: [
        `RIR real ≥2 repeticiones superior al objetivo (${band.min}-${band.max}): la carga quedó fácil.`,
        "Llega primero al extremo alto del rango para justificar el salto de carga.",
      ],
    };
  }

  // 9. Banda media: sigue el ciclo de doble progresión
  return {
    action: "maintain",
    rationale: [
      `Serie dentro del rango ${planned.repsLow}-${planned.repsHigh} con RIR ${band.min}-${band.max}.`,
      "Mantén la carga hasta alcanzar el extremo alto del rango en todas las series.",
    ],
  };
}
