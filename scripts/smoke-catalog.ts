// Smoke del curado de catálogo BAM: pool sizes, nombres limpios y comidas
// generadas con buildPlan(catalog). Offline: lee catalog-prices.db.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlan, buildCatalogPools, type GeneratedPlan } from "../lib/engine";
import type { UserProfile } from "../app/types";

interface BamRow {
  food_id: string;
  name_es: string;
  category: string;
  nutrients?: {
    energy_kcal?: number;
    protein_g?: number;
    carbohydrates_g?: number;
    fat_g?: number;
    fiber_g?: number;
  };
  allergens?: string[];
  price_records?: Array<{
    price_mxn?: number;
    price_mxn_low?: number;
    price_mxn_high?: number;
    price_mxn_reference?: number;
    unit?: string;
  }>;
}

const db = JSON.parse(
  readFileSync(join(__dirname, "..", "supabase", "migrations", "catalog-prices.db"), "utf8")
) as { foods: BamRow[] };

const pricePer100g = (f: BamRow): number | null => {
  const r = (f.price_records ?? [])[0];
  if (!r) return null;
  const ref = r.price_mxn_reference ?? r.price_mxn_low ?? r.price_mxn;
  if (ref == null) return null;
  const unit = (r.unit ?? "kg").toLowerCase();
  if (unit === "kg" || unit === "kilogramo" || unit === "kilogramos") return ref / 10;
  if (unit === "l" || unit === "lt" || unit === "litro" || unit === "litros") return ref / 10;
  return null;
};

const catalog = db.foods.map((f) => ({
  food_id: f.food_id,
  name: f.name_es,
  bamCategory: f.category,
  calories: Number(f.nutrients?.energy_kcal) || 0,
  protein: Number(f.nutrients?.protein_g) || 0,
  carbs: Number(f.nutrients?.carbohydrates_g) || 0,
  fat: Number(f.nutrients?.fat_g) || 0,
  fiber: Number(f.nutrients?.fiber_g) || 0,
  allergens: f.allergens ?? [],
  pricePer100g: pricePer100g(f),
}));

const base = {
  user_id: "catalog-smoke",
  updated_at: "",
  age: 29,
  sex: "male" as const,
  height_cm: 175,
  weight_kg: 80,
  goal: "lose_fat" as const,
  activity_level: "moderate" as const,
  weekly_budget: 700,
  mode: "guided" as const,
};

function meals(plan: GeneratedPlan) {
  const out: string[] = [];
  for (const m of plan.diet.meals) {
    const cost = m.cost == null ? "sin precio" : `$${m.cost}`;
    out.push(`  ${m.dayType === "training" ? "E" : "D"} ${m.mealType.padEnd(9)} ${m.name.padEnd(48)} ${m.calories} kcal P${m.protein} C${m.carbs} F${m.fat} ${cost}`);
  }
  return out.join("\n");
}

const cases: Array<{ label: string; profile: Partial<UserProfile>; disliked?: string[] }> = [
  {
    label: "OMNÍVORO",
    profile: { ...base, experience: "beginner", training_days: 3, split_pref: "auto", dietary_prefs: "ninguna" },
  },
  {
    label: "VEGANO",
    profile: { ...base, experience: "intermediate", training_days: 4, split_pref: "upper_lower", dietary_prefs: "vegano" },
  },
  {
    label: "PESCATARIANO con dislikes (atún, hígado)",
    profile: { ...base, experience: "intermediate", training_days: 4, split_pref: "ppl", dietary_prefs: "pescatariano" },
    disliked: ["atún", "hígado"],
  },
];

for (const { label, profile, disliked } of cases) {
  const pools = buildCatalogPools(catalog, {
    ...profile,
    foods_disliked: disliked ?? [],
    allergies: [],
  });
  console.log(
    `pools ${label}: proteína ${pools.protein.length} | carbohidrato ${pools.staple.length} | verdura ${pools.produce.length} | grasa ${pools.fat.length}`
  );
  for (const t of pools.protein) console.log("   prot:", t.name, t.priceMXN != null ? `($${t.priceMXN}/100g)` : "sin precio");

  const plan = buildPlan(
    { ...profile, foods_disliked: disliked ?? [], allergies: [] } as UserProfile,
    { catalog }
  );
  const dietPlan = plan.diet;
  console.log("\n==== " + label + " ====");
  console.log("targets", dietPlan.calories, "kcal | P", dietPlan.protein, "| C", dietPlan.carbs, "| F", dietPlan.fat);
  console.log(meals(plan));
}
