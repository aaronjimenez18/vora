import type { Experience, UserProfile } from "@/app/types";
import {
  EXERCISES,
  DIFFICULTY_RANK,
  equipmentTier,
  maxDifficultyFor,
  type EquipmentTier,
  type ExerciseTemplate,
} from "./exercises";

export interface ExerciseSlot {
  group: string;
  fallback?: string;
  minTier?: EquipmentTier;
  compound: boolean;
}

export interface DayTemplate {
  focus: "push" | "pull" | "legs" | "upper" | "lower" | "full_body";
  slots: ExerciseSlot[];
}

export const DAY_NAMES: Record<DayTemplate["focus"], string> = {
  push: "Empuje",
  pull: "Tirón",
  legs: "Pierna",
  upper: "Torso (Upper)",
  lower: "Pierna (Lower)",
  full_body: "Cuerpo completo",
};

const DIFF_RANK = { beginner: 0, intermediate: 1, advanced: 2 } as const;

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

const FULL_BODY: DayTemplate = {
  focus: "full_body",
  slots: [
    { group: "squat", fallback: "bodyweight-squat", compound: true },
    { group: "horizontal_push", fallback: "push-up", compound: true },
    { group: "row", fallback: "inverted-row", compound: true },
    { group: "deadlift", fallback: "glute-bridge", compound: true },
    { group: "plank", fallback: "plank", compound: false },
    { group: "lateral_raise", fallback: "front-raise", minTier: "home_dumbbells", compound: false },
    { group: "calf", fallback: "standing-calf-raise", compound: false },
  ],
};

const UPPER: DayTemplate = {
  focus: "upper",
  slots: [
    { group: "horizontal_push", fallback: "push-up", compound: true },
    { group: "vertical_pull", fallback: "inverted-row", compound: true },
    { group: "vertical_push", fallback: "pike-push-up", compound: true },
    { group: "row", fallback: "inverted-row", compound: true },
    { group: "biceps_curl", fallback: "dumbbell-curl", minTier: "home_dumbbells", compound: false },
    { group: "triceps_pressdown", fallback: "bench-dips", compound: false },
    { group: "rear_delt", fallback: "rear-delt-fly", minTier: "home_dumbbells", compound: false },
  ],
};

const LOWER: DayTemplate = {
  focus: "lower",
  slots: [
    { group: "squat", fallback: "bodyweight-squat", compound: true },
    { group: "deadlift", fallback: "glute-bridge", compound: true },
    { group: "lunge", fallback: "walking-lunge", compound: true },
    { group: "ham_iso", fallback: "glute-bridge", compound: false },
    { group: "calf", fallback: "standing-calf-raise", compound: false },
    { group: "plank", fallback: "plank", compound: false },
  ],
};

const PUSH: DayTemplate = {
  focus: "push",
  slots: [
    { group: "horizontal_push", fallback: "push-up", compound: true },
    { group: "vertical_push", fallback: "pike-push-up", compound: true },
    { group: "incline_push", fallback: "incline-dumbbell-press", minTier: "home_dumbbells", compound: true },
    { group: "lateral_raise", fallback: "front-raise", minTier: "home_dumbbells", compound: false },
    { group: "fly", fallback: "dumbbell-fly", minTier: "home_dumbbells", compound: false },
    { group: "triceps_pressdown", fallback: "bench-dips", compound: false },
  ],
};

const PULL: DayTemplate = {
  focus: "pull",
  slots: [
    { group: "vertical_pull", fallback: "inverted-row", compound: true },
    { group: "row", fallback: "inverted-row", compound: true },
    { group: "deadlift", fallback: "glute-bridge", compound: true },
    { group: "rear_delt", fallback: "rear-delt-fly", minTier: "home_dumbbells", compound: false },
    { group: "biceps_curl", fallback: "dumbbell-curl", minTier: "home_dumbbells", compound: false },
    { group: "carry", fallback: "dumbbell-farmer-carry", minTier: "home_dumbbells", compound: true },
  ],
};

export const TEMPLATES: Record<DayTemplate["focus"], DayTemplate> = {
  push: PUSH,
  pull: PULL,
  legs: LOWER,
  upper: UPPER,
  lower: LOWER,
  full_body: FULL_BODY,
};

// ─── Volumen por experiencia ──────────────────────────────────

export interface VolumePreset {
  sets: number;
  repsLow: number;
  repsHigh: number;
  rir: number;
}

export function volumeForExperience(experience: Experience, compound: boolean): VolumePreset {
  switch (experience) {
    case "beginner":
      return compound
        ? { sets: 3, repsLow: 10, repsHigh: 12, rir: 3 }
        : { sets: 3, repsLow: 12, repsHigh: 15, rir: 2 };
    case "intermediate":
      return compound
        ? { sets: 4, repsLow: 8, repsHigh: 10, rir: 2 }
        : { sets: 3, repsLow: 10, repsHigh: 12, rir: 2 };
    case "advanced":
      return compound
        ? { sets: 4, repsLow: 6, repsHigh: 8, rir: 1 }
        : { sets: 3, repsLow: 8, repsHigh: 12, rir: 2 };
  }
}

export function isCompoundExercise(ex: ExerciseTemplate): boolean {
  return COMPOUND_GROUPS.has(ex.variation_group);
}

export function defaultVolume(experience: Experience, ex: ExerciseTemplate): VolumePreset {
  return volumeForExperience(experience, isCompoundExercise(ex));
}

// ─── Selección de split (presets compuestos) ─────────────────

export type SplitPreference = "auto" | "full_body" | "upper_lower" | "ppl" | "hybrid";

export const SPLIT_NAMES: Record<SplitPreference, string> = {
  auto: "Automático",
  full_body: "Cuerpo completo",
  upper_lower: "Torso / Pierna",
  ppl: "Push / Pull / Pierna (PPL)",
  hybrid: "Híbrido Torso/Pierna + PPL",
};

// Compone la secuencia de tipos de día según días, nivel y preferencia.
// Permite rutinas híbridas: ej. 5 días = Push/Pull/Pierna + Torso/Pierna,
// 4 días = Torso/Pierna + Push/Pull, 6 días = Torso/Pierna + PPL.
export function composeStrengthSequence(
  days: number,
  experience: Experience,
  pref: string | undefined
): DayTemplate["focus"][] {
  const p = (pref as SplitPreference) ?? "auto";

  if (days <= 2) return Array.from({ length: days }, () => "full_body" as const);

  if (p === "full_body") return Array.from({ length: days }, () => "full_body" as const);

  if (days === 3) {
    if (p === "upper_lower") return ["upper", "lower", "full_body"];
    if (p === "hybrid") return ["upper", "push", "lower"];
    return experience === "beginner"
      ? ["full_body", "full_body", "full_body"]
      : ["push", "pull", "legs"];
  }

  if (days === 4) {
    if (p === "ppl") return ["push", "pull", "legs", "full_body"];
    if (p === "hybrid") return ["upper", "lower", "push", "pull"];
    return ["upper", "lower", "upper", "lower"];
  }

  if (days === 5) {
    if (p === "upper_lower") return ["upper", "lower", "upper", "lower", "full_body"];
    return ["push", "pull", "legs", "upper", "lower"];
  }

  if (days === 6) {
    if (p === "upper_lower") return ["upper", "lower", "push", "pull", "legs", "full_body"];
    if (p === "hybrid") return ["upper", "lower", "push", "pull", "legs", "upper"];
    return ["push", "pull", "legs", "push", "pull", "legs"];
  }

  // 7+
  if (p === "upper_lower") return ["upper", "lower", "push", "pull", "legs", "upper", "lower"];
  if (p === "hybrid") return ["push", "pull", "legs", "upper", "lower", "push", "pull"];
  return ["push", "pull", "legs", "push", "pull", "legs", "full_body"];
}

// ─── Resolución de ejercicios ─────────────────────────────────

export interface PlannedExercise {
  slug: string;
  customName: string;
  sets: number;
  repsLow: number;
  repsHigh: number;
  rir: number;
}

export function resolveDay(
  template: DayTemplate,
  experience: Experience,
  userTier: EquipmentTier,
  used: string[]
): PlannedExercise[] {
  const maxDiff = maxDifficultyFor(experience);
  const tier = equipmentTier(userTier);

  const exercises: PlannedExercise[] = [];

  const byTier = (a: (typeof EXERCISES)[number], b: (typeof EXERCISES)[number]) =>
    equipmentTier(b.equipment) - equipmentTier(a.equipment);

  for (const slot of template.slots) {
    if (slot.minTier && equipmentTier(slot.minTier) > tier) continue;

    let pick = EXERCISES.filter(
      (e) =>
        e.variation_group === slot.group &&
        equipmentTier(e.equipment) <= tier &&
        DIFF_RANK[e.difficulty] <= maxDiff &&
        !used.includes(e.slug)
    ).sort(byTier)[0];

    if (!pick && slot.fallback) {
      const fb = EXERCISES.find(
        (e) => e.slug === slot.fallback && equipmentTier(e.equipment) <= tier
      );
      if (fb && DIFF_RANK[fb.difficulty] <= maxDiff) pick = fb;
    }

    if (!pick) continue;

    used.push(pick.slug);
    const vol = volumeForExperience(experience, slot.compound || COMPOUND_GROUPS.has(slot.group));
    exercises.push({
      slug: pick.slug,
      customName: pick.name,
      sets: vol.sets,
      repsLow: vol.repsLow,
      repsHigh: vol.repsHigh,
      rir: vol.rir,
    });
  }

  return exercises;
}

// ─── Recomendaciones para el picker ───────────────────────────

export function dayTemplateFor(focus: DayTemplate["focus"]): DayTemplate {
  return TEMPLATES[focus] ?? FULL_BODY;
}

export interface FamilyRecommendation {
  family: string;
  slotGroup: string;
  variants: ExerciseTemplate[];
}

// Pool de familias recomendadas para un día, con sus variantes elegibles.
export function recommendForDay(
  focus: DayTemplate["focus"],
  experience: Experience,
  userTier: EquipmentTier,
  used: string[]
): FamilyRecommendation[] {
  const maxDiff = maxDifficultyFor(experience);
  const tier = equipmentTier(userTier);
  const template = dayTemplateFor(focus);
  const out: FamilyRecommendation[] = [];
  const seen = new Set<string>();

  for (const slot of template.slots) {
    const pool = EXERCISES.filter(
      (e) =>
        e.variation_group === slot.group &&
        equipmentTier(e.equipment) <= tier &&
        DIFFICULTY_RANK[e.difficulty] <= maxDiff &&
        !used.includes(e.slug)
    );

    const group = pool.length ? pool : [];
    if (!group.length && slot.fallback) {
      const fb = EXERCISES.find((e) => e.slug === slot.fallback);
      if (
        fb &&
        equipmentTier(fb.equipment) <= tier &&
        DIFFICULTY_RANK[fb.difficulty] <= maxDiff &&
        !used.includes(fb.slug)
      ) {
        group.push(fb);
      }
    }

    if (!group.length) continue;

    const family = group[0].family;
    if (seen.has(family)) continue;
    seen.add(family);

    out.push({ family, slotGroup: slot.group, variants: group });
  }

  return out;
}

export function buildWorkoutDays(
  profile: UserProfile,
  used: string[]
): { focus: DayTemplate["focus"]; name: string; exercises: PlannedExercise[] }[] {
  const days = Math.min(profile.training_days, 7);
  const userTier = (profile.equipment as EquipmentTier) || "gym";
  const focuses = composeStrengthSequence(days, profile.experience, profile.split_pref);

  return focuses.map((focus, i) => {
    const template = TEMPLATES[focus];
    const exercises = resolveDay(template, profile.experience, userTier, used);
    return {
      focus,
      name: `Día ${i + 1} · ${DAY_NAMES[focus]}`,
      exercises,
    };
  });
}
