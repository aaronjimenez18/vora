export type FoodCategory =
  | "animal_protein"
  | "plant_protein"
  | "legume"
  | "dairy"
  | "grain"
  | "starchy_vegetable"
  | "vegetable"
  | "fruit"
  | "fat_and_protein"
  | "fat_and_produce";

export interface FoodTemplate {
  slug: string;
  food_id: string;
  name: string;
  category: FoodCategory;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micronutrients: string[];
  allergens: string[];
  commonUnits: string[];
  substitutions: string[];
  tags: string[];
  nutrientSource: string;
  servingG: number;
  vegan: boolean;
  vegetarian: boolean;
  priceMXN: number | null;
  bamPriceKey: string;
}

export const FOODS: FoodTemplate[] = [
  { slug: "huevo", food_id: "egg_whole", name: "Huevo entero", category: "animal_protein", calories: 149, protein: 12.6, carbs: 0.7, fat: 10.6, fiber: 0, micronutrients: ["choline", "vitamin_b12", "selenium", "vitamin_a"], allergens: ["egg"], commonUnits: ["pieza", "100 g"], substitutions: ["tofu_firm", "chicken_breast", "textured_soy"], tags: ["budget", "high_protein", "breakfast"], nutrientSource: "USDA FoodData Central", servingG: 50, vegan: false, vegetarian: true, priceMXN: null },
  { slug: "pechuga-pollo", food_id: "chicken_breast_raw", name: "Pechuga de pollo", category: "animal_protein", calories: 113, protein: 22.5, carbs: 0, fat: 2.6, fiber: 0, micronutrients: ["vitamin_b6", "niacin", "selenium", "phosphorus"], allergens: [], commonUnits: ["100 g", "kg"], substitutions: ["chicken_thigh", "egg_whole", "textured_soy", "tuna_canned"], tags: ["budget", "high_protein", "meal_prep"], nutrientSource: "USDA FoodData Central", servingG: 150, vegan: false, vegetarian: false, priceMXN: null },
  { slug: "muslo-pollo", food_id: "chicken_thigh", name: "Muslo de pollo", category: "animal_protein", calories: 154, protein: 18.6, carbs: 0, fat: 8.8, fiber: 0, micronutrients: ["vitamin_b6", "niacin", "selenium", "zinc"], allergens: [], commonUnits: ["100 g", "kg"], substitutions: ["chicken_breast", "egg_whole", "beans_cooked"], tags: ["budget", "high_protein"], nutrientSource: "USDA FoodData Central", servingG: 150, vegan: false, vegetarian: false, priceMXN: null },
  { slug: "atun-agua", food_id: "tuna_canned_water", name: "Atún en agua", category: "animal_protein", calories: 102, protein: 23.6, carbs: 0, fat: 0.8, fiber: 0, micronutrients: ["vitamin_b12", "selenium", "niacin"], allergens: ["fish"], commonUnits: ["lata drenada", "100 g"], substitutions: ["sardine_canned", "egg_whole", "chicken_thigh"], tags: ["high_protein", "convenient"], nutrientSource: "USDA FoodData Central", servingG: 100, vegan: false, vegetarian: false, priceMXN: null },
  { slug: "leche-baja-grasa", food_id: "milk_low_fat", name: "Leche baja en grasa", category: "dairy", calories: 43, protein: 3.4, carbs: 5, fat: 1, fiber: 0, micronutrients: ["calcium", "vitamin_b12", "riboflavin", "vitamin_d_if_fortified"], allergens: ["milk"], commonUnits: ["vaso", "100 ml"], substitutions: ["yogurt_plain", "fortified_soy_drink"], tags: ["budget", "calcium"], nutrientSource: "USDA FoodData Central", servingG: 240, vegan: false, vegetarian: true, priceMXN: null },
  { slug: "yogur-natural", food_id: "yogurt_plain", name: "Yogur natural sin azúcar", category: "dairy", calories: 63, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, micronutrients: ["calcium", "riboflavin", "vitamin_b12"], allergens: ["milk"], commonUnits: ["vaso", "100 g"], substitutions: ["milk_low_fat", "fortified_soy_drink"], tags: ["calcium", "snack"], nutrientSource: "USDA FoodData Central", servingG: 200, vegan: false, vegetarian: true, priceMXN: null },
  { slug: "frijoles-cocidos", food_id: "beans_cooked", name: "Frijoles cocidos", category: "legume", calories: 135, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 6.4, micronutrients: ["iron", "magnesium", "potassium", "folate"], allergens: [], commonUnits: ["taza", "100 g"], substitutions: ["lentils_cooked", "chickpeas_cooked", "textured_soy"], tags: ["budget", "fiber", "plant_protein"], nutrientSource: "USDA FoodData Central", servingG: 200, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "lentejas-cocidas", food_id: "lentils_cooked", name: "Lentejas cocidas", category: "legume", calories: 120, protein: 9, carbs: 20.1, fat: 0.4, fiber: 7.9, micronutrients: ["iron", "folate", "potassium", "magnesium"], allergens: [], commonUnits: ["taza", "100 g"], substitutions: ["beans_cooked", "chickpeas_cooked", "textured_soy"], tags: ["budget", "fiber", "plant_protein"], nutrientSource: "USDA FoodData Central", servingG: 200, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "soya-texturizada", food_id: "textured_soy_dry", name: "Soya texturizada seca", category: "plant_protein", calories: 348, protein: 52.9, carbs: 33, fat: 0.5, fiber: 17.5, micronutrients: ["iron", "calcium", "magnesium"], allergens: ["soy"], commonUnits: ["100 g seca", "porción hidratada"], substitutions: ["beans_cooked", "lentils_cooked", "egg_whole"], tags: ["budget", "high_protein", "plant_protein"], nutrientSource: "USDA FoodData Central", servingG: 30, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "avena", food_id: "oats_dry", name: "Avena seca", category: "grain", calories: 382, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, micronutrients: ["magnesium", "iron", "thiamin", "zinc"], allergens: ["gluten_possible"], commonUnits: ["taza", "40 g", "100 g"], substitutions: ["corn_tortilla", "rice_dry", "potato"], tags: ["budget", "fiber", "breakfast"], nutrientSource: "USDA FoodData Central", servingG: 40, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "arroz-blanco", food_id: "rice_white_dry", name: "Arroz blanco seco", category: "grain", calories: 355, protein: 7.1, carbs: 80, fat: 0.7, fiber: 1.3, micronutrients: ["manganese", "selenium", "thiamin"], allergens: [], commonUnits: ["taza cocida", "100 g seco"], substitutions: ["potato", "corn_tortilla", "oats_dry"], tags: ["budget", "carbohydrate"], nutrientSource: "USDA FoodData Central", servingG: 70, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "tortilla-maiz", food_id: "corn_tortilla", name: "Tortilla de maíz", category: "grain", calories: 227, protein: 5.7, carbs: 44.6, fat: 2.9, fiber: 5, micronutrients: ["calcium", "magnesium", "niacin"], allergens: [], commonUnits: ["pieza", "100 g"], substitutions: ["rice_white_dry", "potato", "oats_dry"], tags: ["budget", "carbohydrate", "mexican_staple"], nutrientSource: "USDA FoodData Central", servingG: 60, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "papa", food_id: "potato", name: "Papa", category: "starchy_vegetable", calories: 79, protein: 2, carbs: 17.5, fat: 0.1, fiber: 2.2, micronutrients: ["potassium", "vitamin_c", "vitamin_b6"], allergens: [], commonUnits: ["pieza", "100 g"], substitutions: ["rice_white_dry", "corn_tortilla", "oats_dry"], tags: ["budget", "carbohydrate"], nutrientSource: "USDA FoodData Central", servingG: 200, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "platano", food_id: "banana", name: "Plátano", category: "fruit", calories: 98, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, micronutrients: ["potassium", "vitamin_b6", "vitamin_c"], allergens: [], commonUnits: ["pieza", "100 g"], substitutions: ["apple", "orange", "seasonal_fruit"], tags: ["budget", "pre_training", "fruit"], nutrientSource: "USDA FoodData Central", servingG: 120, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "naranja", food_id: "orange", name: "Naranja", category: "fruit", calories: 52, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4, micronutrients: ["vitamin_c", "folate", "potassium"], allergens: [], commonUnits: ["pieza", "100 g"], substitutions: ["banana", "apple", "seasonal_fruit"], tags: ["budget", "fruit"], nutrientSource: "USDA FoodData Central", servingG: 150, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "verduras-temporada", food_id: "seasonal_vegetables", name: "Verduras de temporada", category: "vegetable", calories: 39, protein: 2, carbs: 7, fat: 0.3, fiber: 3, micronutrients: ["vitamin_c", "vitamin_a", "vitamin_k", "potassium"], allergens: [], commonUnits: ["taza", "100 g", "kg"], substitutions: ["frozen_vegetables", "cabbage", "carrot"], tags: ["budget", "fiber", "micronutrient_dense"], nutrientSource: "USDA FoodData Central; exact value depends on vegetable", servingG: 150, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "cacahuate", food_id: "peanut", name: "Cacahuate", category: "fat_and_protein", calories: 610, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5, micronutrients: ["magnesium", "vitamin_e", "niacin"], allergens: ["peanut"], commonUnits: ["30 g", "100 g"], substitutions: ["pumpkin_seed", "sunflower_seed", "avocado"], tags: ["budget", "energy_dense"], nutrientSource: "USDA FoodData Central", servingG: 30, vegan: true, vegetarian: true, priceMXN: null },
  { slug: "aguacate", food_id: "avocado", name: "Aguacate", category: "fat_and_produce", calories: 174, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, micronutrients: ["potassium", "vitamin_e", "vitamin_k", "folate"], allergens: [], commonUnits: ["pieza", "100 g"], substitutions: ["peanut", "olive_oil", "pumpkin_seed"], tags: ["produce", "fat", "fiber"], nutrientSource: "USDA FoodData Central", servingG: 100, vegan: true, vegetarian: true, priceMXN: null },
];

const PROTEIN_CATEGORIES: FoodCategory[] = [
  "animal_protein",
  "plant_protein",
  "legume",
  "dairy",
];

export function foodBySlug(slug: string): FoodTemplate | undefined {
  return FOODS.find((f) => f.slug === slug);
}

export function foodById(foodId: string): FoodTemplate | undefined {
  return FOODS.find((f) => f.food_id === foodId);
}

export function foodsByCategory(category: FoodCategory): FoodTemplate[] {
  return FOODS.filter((f) => f.category === category);
}

export type DietaryPrefs = "vegano" | "vegetariano" | "pescatariano" | "omnivoro" | string;

export function normalizeDietaryPrefs(
  prefs: string | undefined | null
): DietaryPrefs {
  const p = (prefs ?? "ninguna").toLowerCase().trim();
  if (p.startsWith("vegan")) return "vegano";
  if (p.startsWith("vegetarian")) return "vegetariano";
  if (p.startsWith("pescatarian")) return "pescatariano";
  if (p.startsWith("omni")) return "omnivoro";
  return p;
}

export function isAllowed(
  food: FoodTemplate,
  dietaryPrefs: string | undefined | null,
  allergies: string[] = []
): boolean {
  const style = normalizeDietaryPrefs(dietaryPrefs);
  if (style === "vegano" && !food.vegan) return false;
  if (style === "vegetariano" && !food.vegetarian) return false;
  if (style === "pescatariano" && !food.vegetarian) return false;
  if (food.allergens.some((a) => allergies.includes(a))) return false;
  return true;
}

export function proteinFoodsFor(
  dietaryPrefs: string | undefined | null,
  allergies: string[] = []
): FoodTemplate[] {
  return FOODS.filter(
    (f) => PROTEIN_CATEGORIES.includes(f.category) && isAllowed(f, dietaryPrefs, allergies)
  );
}

export function substitutionsFor(
  food: FoodTemplate,
  allergies: string[] = []
): FoodTemplate[] {
  return food.substitutions
    .map((id) => foodById(id))
    .filter((f): f is FoodTemplate => !!f && !f.allergens.some((a) => allergies.includes(a)));
}

export function allergensFor(food: FoodTemplate): string[] {
  return food.allergens;
}
