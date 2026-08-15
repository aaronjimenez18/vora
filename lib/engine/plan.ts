import type { CardioSpec, UserProfile } from "@/app/types";
import { calculateTargets, type EnergyTargets } from "./energy";
import { buildDietPlan, type DietPlanData } from "./diet";
import {
  DAY_NAMES,
  TEMPLATES,
  SPLIT_NAMES,
  composeStrengthSequence,
  resolveDay,
  type DayTemplate,
  type PlannedExercise,
  type SplitPreference,
} from "./workout";
import { buildRunningDays, type RunningDayData } from "./running";
import { buildSchedule, WEEKDAYS_ES, type ScheduledDay } from "./schedule";
import type { EquipmentTier } from "./exercises";

export interface WorkoutDayData {
  dayType: "strength" | "running" | "cardio";
  name: string;
  focus?: DayTemplate["focus"];
  position: number;
  dayOfWeek: number;
  exercises: PlannedExercise[];
  cardioSpec?: CardioSpec | null;
}

export interface GeneratedPlan {
  targets: EnergyTargets;
  splitType: SplitPreference;
  splitName: string;
  workoutDays: WorkoutDayData[];
  schedule: ScheduledDay[];
  runningSummary: string;
  rationale: string[];
  diet: DietPlanData;
}

export function buildFullPlan(
  profile: UserProfile,
  opts?: { priceOverrides?: Record<string, number> }
): GeneratedPlan {
  const targets = calculateTargets(profile);

  const strengthDays = Math.max(0, Math.min(7, Number(profile.training_days) || 0));
  const splitType = (profile.split_pref as SplitPreference) ?? "auto";

  const used: string[] = [];
  const userTier = (profile.equipment as EquipmentTier) || "gym";

  const sequence =
    strengthDays > 0 ? composeStrengthSequence(strengthDays, profile.experience, profile.split_pref) : [];

  const strengthDaysOut = sequence.map((focus) => {
    const template = TEMPLATES[focus];
    return {
      focus,
      name: `${DAY_NAMES[focus]}`,
      exercises: resolveDay(template, profile.experience, userTier, used),
    };
  });

  const runningDays = buildRunningDays(profile);

  const schedule = buildSchedule(
    strengthDaysOut.map((d) => ({ focus: d.focus, name: d.name })),
    runningDays
  );

  const workoutDays: WorkoutDayData[] = [];
  for (const s of schedule) {
    if (s.dayType === "rest") continue;
    const base = {
      position: workoutDays.length,
      dayOfWeek: s.dayOfWeek,
      name: `${WEEKDAYS_ES[s.dayOfWeek]} · ${s.name}`,
    };
    if (s.dayType === "strength") {
      const src = strengthDaysOut.find((d) => d.name === s.strength?.name);
      workoutDays.push({
        ...base,
        dayType: "strength",
        focus: s.strength?.focus,
        exercises: src?.exercises ?? [],
        cardioSpec: null,
      });
    } else {
      workoutDays.push({
        ...base,
        dayType: s.dayType,
        exercises: [],
        cardioSpec: s.cardio ?? null,
      });
    }
  }

  const scheduledRun = workoutDays.filter((d) => d.dayType !== "strength");
  const runningSummary =
    scheduledRun.length === 0
      ? "Sin carrera ni cardio extra"
      : scheduledRun.map((r) => `${r.name} (${r.cardioSpec?.durationMin ?? 0} min · RPE ${r.cardioSpec?.rpe ?? 0})`).join(" + ");

  const rationale: string[] = [];
  if (strengthDays > 0) {
    rationale.push(
      `Rutina de fuerza de ${strengthDays} días: ${SPLIT_NAMES[splitType]}, ajustada a tu nivel (${profile.experience}) y equipo.`
    );
  }
  if (runningDays.length > 0) {
    rationale.push(`Carrera/cardio integrado al horario: ${runningSummary}.`);
  }
  rationale.push(
    targets.bmrMethod === "katch_mcardle"
      ? `Calorías basadas en masa magra (Katch-McArdle) con ${targets.adjustmentLabel}.`
      : `Calorías con fórmula Harris-Benedict y ${targets.adjustmentLabel}.`
  );

  return {
    targets,
    splitType,
    splitName: SPLIT_NAMES[splitType],
    workoutDays,
    schedule,
    runningSummary,
    rationale,
    diet: buildDietPlan(profile, opts),
  };
}

// Alias compatible: el motor ahora orquesta fuerza + running/cardio + dieta.
export function buildPlan(
  profile: UserProfile,
  opts?: { priceOverrides?: Record<string, number> }
): GeneratedPlan {
  return buildFullPlan(profile, opts);
}

export type { RunningDayData };
