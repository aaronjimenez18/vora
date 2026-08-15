import { buildPlan } from "../lib/engine/index";

const BAM_PRICES: Record<string, number> = {
  egg_whole: 6.5,
  chicken_breast_raw: 18.5,
  chicken_thigh: 11.5,
  tuna_canned_water: 38.5,
  milk_low_fat: 3.15,
  yogurt_plain: 3.15,
  beans_cooked: 4.5,
  lentils_cooked: 5,
  textured_soy_dry: 5.75,
  oats_dry: 5.5,
  rice_white_dry: 3.25,
  corn_tortilla: 2.7,
  potato: 3.4,
  banana: 2.65,
  orange: 2.9,
  seasonal_vegetables: 4.5,
  peanut: 11,
  avocado: 7.75,
};

const cases = [
  {
    label: "principiante + casa básico + 3 días",
    p: {
      age: 21, sex: "female", height_cm: 160, weight_kg: 60, goal: "recomp",
      experience: "beginner", training_days: 3, training_minutes: 40,
      equipment: "home_minimal", split_pref: "auto", weekly_budget: 900,
      dietary_prefs: "ninguna", activity_level: "light", mode: "guided",
    },
  },
  {
    label: "avanzado + 6 días ppl + vegano",
    p: {
      age: 34, sex: "male", height_cm: 185, weight_kg: 92, goal: "gain_muscle",
      experience: "advanced", training_days: 6, training_minutes: 90,
      equipment: "gym", split_pref: "ppl", weekly_budget: 2200,
      dietary_prefs: "vegano", activity_level: "very_active", mode: "guided",
    },
  },
  {
    label: "omnivoro + presupuesto bajo + precios BAM CDMX",
    p: {
      age: 28, sex: "male", height_cm: 175, weight_kg: 80, goal: "lose_fat",
      experience: "intermediate", training_days: 4, training_minutes: 60,
      equipment: "gym", split_pref: "upper_lower", weekly_budget: 700,
      dietary_prefs: "ninguna", activity_level: "moderate", mode: "guided",
    },
  },
  {
    label: "híbrido torso/pierna+PPL 5d + running 3d",
    p: {
      age: 29, sex: "male", height_cm: 180, weight_kg: 85, goal: "lose_fat",
      experience: "intermediate", training_days: 5, training_minutes: 60,
      equipment: "gym", split_pref: "hybrid", running_days_per_week: 3,
      cardio_minutes_per_week: 30, running_level: "beginner", weekly_budget: 700,
      dietary_prefs: "ninguna", activity_level: "moderate", mode: "guided",
    },
  },
];

let failures = 0;

for (const { label, p } of cases) {
  const overrides = label.includes("BAM") ? BAM_PRICES : undefined;
  const plan = buildPlan(
    { ...p, user_id: "x", updated_at: "" } as never,
    overrides ? { priceOverrides: overrides } : undefined
  );
  console.log("\n=== " + label + " ===");
  console.log("split:", plan.splitName);
  console.log("targets", JSON.stringify(plan.targets));
  for (const d of plan.workoutDays) {
    console.log(
      d.position + 1,
      d.dayType.padEnd(8),
      "L" + (d.dayOfWeek + 1),
      d.name,
      d.cardioSpec
        ? `${d.cardioSpec.durationMin} min RPE ${d.cardioSpec.rpe}`
        : "-> " + d.exercises.map((e) => e.customName).join(" | ")
    );
  }
  console.log(
    "diet kcal",
    plan.diet.calories,
    "P",
    plan.diet.protein,
    "C",
    plan.diet.carbs,
    "F",
    plan.diet.fat
  );
  const dayCost = plan.diet.meals
    .filter((m) => m.dayType === "training")
    .reduce((s, m) => s + (m.cost ?? 0), 0);
  console.log("costo/día entrenando $", Math.round(dayCost * 100) / 100, "presupuesto/día $", Math.round((p.weekly_budget / 7) * 100) / 100);
  const unknown = plan.diet.meals.filter((m) => m.cost === null).length;
  console.log("costos desconocidos:", unknown, "/", plan.diet.meals.length);
  for (const m of plan.diet.meals.filter((m) => m.dayType === "training")) {
    console.log(" ", m.mealType, "|", m.name, "|", m.calories + "kcal", "| $" + m.cost);
  }

  // Invariantes del horario
  if (plan.workoutDays.length > 7) {
    failures++;
    console.log("✗ semana > 7 días");
  }
  const strengthCount = plan.workoutDays.filter((d) => d.dayType === "strength").length;
  if (p.training_days && strengthCount !== Math.min(p.training_days, 7)) {
    failures++;
    console.log(`✗ fuerza esperada ${p.training_days}, generada ${strengthCount}`);
  }
  if (strengthCount > 0) {
    const firstStrength = plan.workoutDays.find((d) => d.dayType === "strength");
    if (firstStrength?.focus == null) {
      failures++;
      console.log("✗ día de fuerza sin focus");
    }
  }
  for (const d of plan.workoutDays) {
    if (d.dayOfWeek < 0 || d.dayOfWeek > 6) {
      failures++;
      console.log("✗ dayOfWeek fuera de rango", d.dayOfWeek);
    }
  }
  if (plan.rationale.length === 0) {
    failures++;
    console.log("✗ sin rationale");
  }
}

console.log(failures === 0 ? "\nOK: invariantes verificadas" : `\nFALLOS: ${failures}`);
