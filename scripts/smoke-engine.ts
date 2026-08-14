import { buildPlan } from "../lib/engine/index";

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
];

for (const { label, p } of cases) {
  const plan = buildPlan({ ...p, user_id: "x", updated_at: "" } as never);
  console.log("\n=== " + label + " ===");
  console.log("targets", JSON.stringify(plan.targets));
  for (const d of plan.workoutDays) {
    console.log(
      d.position + 1,
      d.name,
      "->",
      d.exercises.map((e) => e.customName).join(" | ")
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
  for (const m of plan.diet.meals.filter((m) => m.dayType === "training")) {
    console.log(" ", m.mealType, "|", m.name, "|", m.calories + "kcal", "| $" + m.cost);
  }
}
