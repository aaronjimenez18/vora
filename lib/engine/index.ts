import type { UserProfile } from "@/app/types";
import { calculateTargets, type EnergyTargets } from "./energy";
import { buildDietPlan, type DietPlanData } from "./diet";
import { buildWorkoutDays, type PlannedExercise } from "./workout";

export interface WorkoutDayData {
  name: string;
  focus: string;
  position: number;
  exercises: PlannedExercise[];
}

export interface GeneratedPlan {
  targets: EnergyTargets;
  splitType: string;
  workoutDays: WorkoutDayData[];
  diet: DietPlanData;
}

export function buildPlan(profile: UserProfile): GeneratedPlan {
  const targets = calculateTargets(profile);
  const used: string[] = [];

  const days = buildWorkoutDays(profile, used);
  const workoutDays: WorkoutDayData[] = days.map((d, i) => ({
    name: d.name,
    focus: d.focus,
    position: i,
    exercises: d.exercises,
  }));

  const splitType =
    profile.training_days <= 2 || profile.split_pref === "full_body"
      ? "full_body"
      : profile.training_days <= 4 && profile.split_pref !== "ppl"
        ? "upper_lower"
        : "ppl";

  return {
    targets,
    splitType,
    workoutDays,
    diet: buildDietPlan(profile),
  };
}
