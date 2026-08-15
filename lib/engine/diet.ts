import type { MealType, UserProfile } from "@/app/types";
import {
  calculateTargets,
  weeklyBudgetMXN,
  budgetBandsMXN,
  type NutritionTargets,
} from "./nutrition";
import {
  FOODS,
  type FoodCategory,
  type FoodTemplate,
} from "./foods";

export interface DietMeal {
  dayType: "training" | "rest";
  mealType: MealType;
  name: string;
  recipe: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  cost: number | null;
}

export interface DietPlanData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weeklyBudget: number;
  budgetBands: {
    proteins: [number, number];
    staples: [number, number];
    produce: [number, number];
    fats_and_misc: [number, number];
  };
  meals: DietMeal[];
}

const CALORIE_SHARES: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

const PROTEIN_SHARES: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function macrosFor(food: FoodTemplate, grams: number, priceOverride: number | null) {
  const k = grams / 100;
  const pricePer100g = priceOverride ?? food.priceMXN;
  return {
    calories: Math.round(food.calories * k),
    protein: Math.round(food.protein * k * 10) / 10,
    carbs: Math.round(food.carbs * k * 10) / 10,
    fat: Math.round(food.fat * k * 10) / 10,
    fiber: Math.round(food.fiber * k * 10) / 10,
    cost: pricePer100g === null ? null : Math.round(pricePer100g * k * 100) / 100,
  };
}

function sumCost(costs: (number | null)[]): number | null {
  if (costs.some((c) => c === null)) return null;
  return Math.round(costs.reduce<number>((s, c) => s + (c ?? 0), 0) * 100) / 100;
}

interface Pool {
  protein: FoodTemplate[];
  staple: FoodTemplate[];
  produce: FoodTemplate[];
  fat: FoodTemplate[];
}

function buildPools(profile: UserProfile): Pool {
  const style = profile.diet_style ?? profile.dietary_prefs;
  const allergies = profile.allergies ?? [];
  const poolFor = (cats: FoodCategory[]): FoodTemplate[] =>
    FOODS.filter((f) => cats.includes(f.category) && allowed(f, style, allergies));
  const protein = poolFor(["animal_protein", "plant_protein", "legume", "dairy"]);
  const staple = poolFor(["grain", "starchy_vegetable"]);
  const produce = poolFor(["vegetable", "fruit"]);
  const fat = poolFor(["fat_and_protein", "fat_and_produce"]);
  return {
    protein: protein.length ? protein : poolFor(["legume", "grain"]),
    staple: staple.length ? staple : poolFor(["grain"]),
    produce: produce.length ? produce : poolFor(["vegetable"]),
    fat: fat.length ? fat : poolFor(["fat_and_protein"]),
  };
}

function allowed(
  f: FoodTemplate,
  style: string | undefined | null,
  allergies: string[]
): boolean {
  if (allergies.some((a) => f.allergens.includes(a))) return false;
  const s = (style ?? "").toLowerCase();
  if (s.startsWith("vegan") && !f.vegan) return false;
  if (s.startsWith("vegetarian") && !f.vegetarian) return false;
  if (s.startsWith("pescatarian") && !f.vegetarian) return false;
  return true;
}

interface MealBuild {
  mealType: MealType;
  name: string;
  recipe: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  cost: number | null;
}

function buildDay(
  profile: UserProfile,
  targets: NutritionTargets,
  dayType: "training" | "rest",
  dailyBudget: number | null,
  priceOverrides?: Record<string, number>
): DietMeal[] {
  const carbFactor = dayType === "rest" ? 0.85 : 1;
  const pool = buildPools(profile);
  const priceOf = (f: FoodTemplate): number | null =>
    priceOverrides?.[f.food_id] ?? null;

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const meals: MealBuild[] = [];

  mealTypes.forEach((mealType, i) => {
    const mealCal = targets.calories * CALORIE_SHARES[mealType] * carbFactor;
    const proteinGramTarget = targets.protein * PROTEIN_SHARES[mealType] * carbFactor;

    let proteinFood: FoodTemplate;
    let stapleFood: FoodTemplate;
    let produceFood: FoodTemplate;
    let fatFood: FoodTemplate | null = null;

    if (mealType === "snack") {
      proteinFood = pool.protein[(i + 2) % pool.protein.length] ?? pool.protein[0];
      produceFood = pool.produce[(i + 3) % pool.produce.length] ?? pool.produce[0];
      stapleFood = pool.staple[i % pool.staple.length] ?? pool.staple[0];
    } else {
      proteinFood = pool.protein[(i + 1) % pool.protein.length] ?? pool.protein[0];
      stapleFood = pool.staple[i % pool.staple.length] ?? pool.staple[0];
      produceFood = pool.produce[(i + 2) % pool.produce.length] ?? pool.produce[0];
      if (mealType === "lunch" || mealType === "dinner") {
        fatFood = pool.fat[(i + 1) % pool.fat.length] ?? pool.fat[0];
      }
    }

    const qtyVeggie = mealType === "snack" ? 0 : 100;
    const qtyFat = mealType === "snack" ? 10 : mealType === "lunch" || mealType === "dinner" ? 15 : 0;

    const fixedV = macrosFor(produceFood, qtyVeggie, priceOf(produceFood));
    const fixedFat = fatFood && qtyFat > 0 ? macrosFor(fatFood, qtyFat, priceOf(fatFood)) : null;

    let qtyProtein = roundTo((proteinGramTarget / proteinFood.protein) * 100, 10);
    qtyProtein = clamp(qtyProtein, 20, 400);

    let fixedP = macrosFor(proteinFood, qtyProtein, priceOf(proteinFood));
    let carbCalBudget =
      mealCal -
      fixedP.calories -
      fixedV.calories -
      (fixedFat?.calories ?? 0);
    let qtyCarbs = roundTo((carbCalBudget / stapleFood.calories) * 100, 10);
    qtyCarbs = clamp(qtyCarbs, 0, 500);

    const incidentalProtein =
      macrosFor(stapleFood, qtyCarbs, priceOf(stapleFood)).protein +
      fixedV.protein +
      (fixedFat?.protein ?? 0);
    qtyProtein = roundTo(
      ((proteinGramTarget - incidentalProtein) / proteinFood.protein) * 100,
      10
    );
    qtyProtein = clamp(qtyProtein, 20, 400);

    fixedP = macrosFor(proteinFood, qtyProtein, priceOf(proteinFood));
    carbCalBudget =
      mealCal -
      fixedP.calories -
      fixedV.calories -
      (fixedFat?.calories ?? 0);
    qtyCarbs = roundTo((carbCalBudget / stapleFood.calories) * 100, 10);
    qtyCarbs = clamp(qtyCarbs, 0, 500);

    const c = macrosFor(stapleFood, qtyCarbs, priceOf(stapleFood));

    const calorie = Math.round(
      fixedP.calories +
        c.calories +
        fixedV.calories +
        (fixedFat?.calories ?? 0)
    );
    const protein =
      Math.round(
        (fixedP.protein + c.protein + fixedV.protein + (fixedFat?.protein ?? 0)) * 10
      ) / 10;
    const carbs =
      Math.round(
        (fixedP.carbs + c.carbs + fixedV.carbs + (fixedFat?.carbs ?? 0)) * 10
      ) / 10;
    const fat =
      Math.round(
        (fixedP.fat + c.fat + fixedV.fat + (fixedFat?.fat ?? 0)) * 10
      ) / 10;
    const fiber =
      Math.round(
        (fixedP.fiber + c.fiber + fixedV.fiber + (fixedFat?.fiber ?? 0)) * 10
      ) / 10;
    const fatCost = fatFood ? (fixedFat?.cost ?? null) : 0;
    const cost = sumCost([fixedP.cost, c.cost, fixedV.cost, fatCost]);

    const parts = [
      mealType === "snack" ? "" : `${proteinFood.name} (${qtyProtein} g)`,
      `${stapleFood.name} (${qtyCarbs} g)`,
      qtyVeggie > 0 ? `${produceFood.name} (${qtyVeggie} g)` : "",
      fatFood && qtyFat > 0 ? `${fatFood.name} (${qtyFat} g)` : "",
    ].filter(Boolean);

    const name =
      mealType === "snack"
        ? `${proteinFood.name} + ${stapleFood.name}`
        : `${proteinFood.name} con ${stapleFood.name}`;

    meals.push({
      mealType,
      name,
      recipe: parts.join(", "),
      calories: calorie,
      protein,
      carbs,
      fat,
      fiber,
      cost,
    });
  });

  if (dailyBudget && dailyBudget > 0) {
    const knownCosts = meals.filter((m) => m.cost !== null);
    if (knownCosts.length === meals.length) {
      const totalCost = meals.reduce((s, m) => s + (m.cost ?? 0), 0);
      if (totalCost > dailyBudget) {
        const factor = dailyBudget / totalCost;
        for (const meal of meals) {
          meal.calories = Math.round(meal.calories * factor);
          meal.protein = Math.round(meal.protein * factor * 10) / 10;
          meal.carbs = Math.round(meal.carbs * factor * 10) / 10;
          meal.fat = Math.round(meal.fat * factor * 10) / 10;
          meal.fiber = Math.round(meal.fiber * factor * 10) / 10;
          meal.cost = meal.cost === null ? null : Math.round(meal.cost * factor * 100) / 100;
        }
      }
    }
  }

  return meals.map((m) => ({ ...m, dayType }));
}

export function buildDietPlan(
  profile: UserProfile,
  opts?: { priceOverrides?: Record<string, number> }
): DietPlanData {
  const targets = calculateTargets(profile);

  const weeklyBudget =
    profile.budget_amount_mxn !== undefined && profile.budget_period
      ? weeklyBudgetMXN(profile.budget_amount_mxn, profile.budget_period)
      : Number(profile.weekly_budget) || 0;
  const dailyBudget = weeklyBudget > 0 ? weeklyBudget / 7 : null;
  const budgetBands = budgetBandsMXN(weeklyBudget);

  const training = buildDay(profile, targets, "training", dailyBudget, opts?.priceOverrides);
  const rest = buildDay(profile, targets, "rest", dailyBudget, opts?.priceOverrides);

  const meals: DietMeal[] = [...training, ...rest];
  const trainingTotals = training.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    name: "Plan de comidas",
    calories: trainingTotals.calories,
    protein: Math.round(trainingTotals.protein * 10) / 10,
    carbs: Math.round(trainingTotals.carbs * 10) / 10,
    fat: Math.round(trainingTotals.fat * 10) / 10,
    fiber: Math.round(trainingTotals.fiber * 10) / 10,
    weeklyBudget,
    budgetBands,
    meals,
  };
}
