import type { Goal, Sex, UserProfile } from "@/app/types";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "very_high";

export type SexForEquation = "male" | "female";

export type BudgetPeriod = "per_day" | "per_week" | "per_month";
export type ShoppingFrequency = "daily" | "weekly" | "biweekly" | "monthly";
export type DietStyle = "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "other";
export type PriceType = "retail" | "wholesale" | "promotional" | "user_entered" | "estimated";
export type PriceConfidence = "high" | "medium" | "low";

export interface EnergyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  bmr?: number;
  tdee?: number;
  goalPct?: number;
  proteinPerKg?: number;
  adjustmentLabel?: string;
}

export interface NutritionTargets extends EnergyTargets {
  bmr: number;
  tdee: number;
  goalPct: number;
  proteinPerKg: number;
  adjustmentLabel: string;
}

export interface GoalAdjustment {
  goal: Goal;
  pct: number;
  rangePercent: [number, number];
  preferred: string;
  label: string;
}

export type SafetyFlag =
  | "under_18"
  | "pregnancy_or_breastfeeding"
  | "eating_disorder_history"
  | "diabetes_medication"
  | "kidney_disease"
  | "liver_disease"
  | "gastrointestinal_disease"
  | "clinician_prescribed_diet"
  | "severe_food_allergy"
  | "unintentional_weight_loss"
  | "rapid_weight_change";

export interface SafetyScreenResult {
  refer: boolean;
  activeFlags: SafetyFlag[];
  message: string;
}

export interface PriceRecord {
  food_id: string;
  price_mxn: number;
  unit: string;
  package_size?: number;
  store_or_market?: string;
  city_or_region?: string;
  observed_at?: string;
  source?: string;
  price_type?: PriceType;
  confidence?: PriceConfidence;
}

export interface PriceEstimate {
  pricePer100g: number;
  record: PriceRecord;
}

export interface MicronutrientReference {
  nutrient: string;
  label: string;
  reference: number;
  referenceKind: "RDA" | "AI" | "EAR";
  ul: number | null;
}

export interface MicronutrientCoverage {
  nutrient: string;
  value: number;
  reference: number;
  coveragePct: number;
  aboveUl: boolean;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

const LEGACY_ACTIVITY: Record<string, ActivityLevel> = {
  active: "high",
  very_active: "very_high",
};

export function normalizeActivityLevel(
  level: string | undefined | null
): ActivityLevel {
  if (!level) return "moderate";
  if (level in ACTIVITY_FACTORS) return level as ActivityLevel;
  return LEGACY_ACTIVITY[level] ?? "moderate";
}

export function bmrHarrisBenedictRevised(
  sexForEquation: SexForEquation,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const female =
    447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  const male =
    88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  if (sexForEquation === "female") return female;
  if (sexForEquation === "male") return male;
  return (female + male) / 2;
}

function equationSexFor(sex: Sex, override?: SexForEquation): SexForEquation {
  if (override === "male" || override === "female") return override;
  if (sex === "male" || sex === "female") return sex;
  return "female";
}

export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  equationSex?: SexForEquation
): number {
  return bmrHarrisBenedictRevised(
    equationSexFor(sex, equationSex),
    weightKg,
    heightCm,
    age
  );
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

const GOAL_ADJUSTMENTS: Record<Goal, GoalAdjustment> = {
  lose_fat: {
    goal: "lose_fat",
    pct: -15,
    rangePercent: [-20, -10],
    preferred: "-10% a -15%",
    label: "Déficit para pérdida de grasa",
  },
  gain_muscle: {
    goal: "gain_muscle",
    pct: 10,
    rangePercent: [5, 15],
    preferred: "+5% a +10%",
    label: "Superávit para ganancia muscular",
  },
  maintain: {
    goal: "maintain",
    pct: 0,
    rangePercent: [-5, 5],
    preferred: "0%",
    label: "Mantenimiento",
  },
  recomp: {
    goal: "recomp",
    pct: 0,
    rangePercent: [-5, 5],
    preferred: "Mantenimiento con ajuste fino",
    label: "Recomposición corporal",
  },
};

export function goalAdjustment(goal: Goal): GoalAdjustment {
  return GOAL_ADJUSTMENTS[goal] ?? GOAL_ADJUSTMENTS.maintain;
}

const PROTEIN_PER_KG: Record<Goal, number> = {
  lose_fat: 2.0,
  gain_muscle: 2.0,
  maintain: 1.6,
  recomp: 1.8,
};

export function proteinPerKg(goal: Goal): number {
  return PROTEIN_PER_KG[goal] ?? PROTEIN_PER_KG.maintain;
}

export function calculateTargets(
  profile: UserProfile,
  opts?: { goalPct?: number; proteinPerKg?: number; fatPct?: number }
): NutritionTargets {
  const weight = Number(profile.weight_kg);
  const height = Number(profile.height_cm);
  const age = profile.age;

  const bmr = calculateBMR(profile.sex, weight, height, age);
  const activity = normalizeActivityLevel(profile.activity_level);
  const tdee = calculateTDEE(bmr, activity);

  const adj = goalAdjustment(profile.goal);
  const goalPct = opts?.goalPct ?? adj.pct;
  const targetCalories = Math.round(tdee * (1 + goalPct / 100));
  const calories =
    profile.goal === "lose_fat"
      ? Math.max(targetCalories, 1200)
      : Math.max(targetCalories, 1000);

  const perKg = opts?.proteinPerKg ?? proteinPerKg(profile.goal);
  const protein = Math.round(weight * perKg);

  const fatPct = opts?.fatPct ?? 0.25;
  const fat = Math.round((calories * fatPct) / 9);

  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((calories / 1000) * 14);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goalPct,
    proteinPerKg: perKg,
    adjustmentLabel: adj.label,
  };
}

const SAFETY_FLAGS: SafetyFlag[] = [
  "under_18",
  "pregnancy_or_breastfeeding",
  "eating_disorder_history",
  "diabetes_medication",
  "kidney_disease",
  "liver_disease",
  "gastrointestinal_disease",
  "clinician_prescribed_diet",
  "severe_food_allergy",
  "unintentional_weight_loss",
  "rapid_weight_change",
];

export function safetyScreen(flags: SafetyFlag[]): SafetyScreenResult {
  const activeFlags = flags.filter((f) => SAFETY_FLAGS.includes(f));
  if (activeFlags.length === 0) {
    return {
      refer: false,
      activeFlags: [],
      message: "Sin banderas de seguridad.",
    };
  }
  return {
    refer: true,
    activeFlags,
    message:
      "Se detectaron condiciones que requieren valoración profesional. No se genera una dieta automática restrictiva. Consulta a un profesional de la salud antes de comenzar.",
  };
}

export function driReference(
  sex: SexForEquation,
  nutrient: string
): MicronutrientReference | undefined {
  const male = sex === "male";
  const r: Record<string, MicronutrientReference> = {
    calcium: { nutrient: "calcium", label: "Calcio", reference: 1000, referenceKind: "RDA", ul: 2500 },
    iron: { nutrient: "iron", label: "Hierro", reference: male ? 8 : 18, referenceKind: "RDA", ul: 45 },
    magnesium: { nutrient: "magnesium", label: "Magnesio", reference: male ? 420 : 320, referenceKind: "RDA", ul: 350 },
    potassium: { nutrient: "potassium", label: "Potasio", reference: male ? 3400 : 2600, referenceKind: "AI", ul: null },
    sodium: { nutrient: "sodium", label: "Sodio", reference: 1500, referenceKind: "AI", ul: 2300 },
    zinc: { nutrient: "zinc", label: "Zinc", reference: male ? 11 : 8, referenceKind: "RDA", ul: 40 },
    vitamin_a: { nutrient: "vitamin_a", label: "Vitamina A", reference: male ? 900 : 700, referenceKind: "RDA", ul: 3000 },
    vitamin_c: { nutrient: "vitamin_c", label: "Vitamina C", reference: male ? 90 : 75, referenceKind: "RDA", ul: 2000 },
    vitamin_d: { nutrient: "vitamin_d", label: "Vitamina D", reference: 15, referenceKind: "RDA", ul: 100 },
    vitamin_e: { nutrient: "vitamin_e", label: "Vitamina E", reference: 15, referenceKind: "RDA", ul: 1000 },
    vitamin_k: { nutrient: "vitamin_k", label: "Vitamina K", reference: male ? 120 : 90, referenceKind: "AI", ul: null },
    thiamin: { nutrient: "thiamin", label: "Tiamina", reference: male ? 1.2 : 1.1, referenceKind: "RDA", ul: null },
    riboflavin: { nutrient: "riboflavin", label: "Riboflavina", reference: male ? 1.3 : 1.1, referenceKind: "RDA", ul: null },
    niacin: { nutrient: "niacin", label: "Niacina", reference: male ? 16 : 14, referenceKind: "RDA", ul: 35 },
    vitamin_b6: { nutrient: "vitamin_b6", label: "Vitamina B6", reference: 1.3, referenceKind: "RDA", ul: 100 },
    folate: { nutrient: "folate", label: "Folato", reference: 400, referenceKind: "RDA", ul: 1000 },
    vitamin_b12: { nutrient: "vitamin_b12", label: "Vitamina B12", reference: 2.4, referenceKind: "RDA", ul: null },
    iodine: { nutrient: "iodine", label: "Yodo", reference: 150, referenceKind: "RDA", ul: 1100 },
    fiber: { nutrient: "fiber", label: "Fibra", reference: male ? 38 : 25, referenceKind: "AI", ul: null },
    water: { nutrient: "water", label: "Agua", reference: male ? 3700 : 2700, referenceKind: "AI", ul: null },
  };
  return r[nutrient];
}

export function micronutrientCoverage(
  sex: SexForEquation,
  consumed: Record<string, number>
): MicronutrientCoverage[] {
  const entries: MicronutrientCoverage[] = [];
  for (const [nutrient, value] of Object.entries(consumed)) {
    const ref = driReference(sex, nutrient);
    if (!ref) continue;
    entries.push({
      nutrient,
      value,
      reference: ref.reference,
      coveragePct: Math.round((value / ref.reference) * 100),
      aboveUl: ref.ul !== null && value > ref.ul,
    });
  }
  return entries.sort((a, b) => a.coveragePct - b.coveragePct);
}

export const BUDGET_ALLOCATION_DEFAULT: {
  proteins: [number, number];
  staples: [number, number];
  produce: [number, number];
  fats_and_misc: [number, number];
} = {
  proteins: [25, 40],
  staples: [20, 35],
  produce: [20, 35],
  fats_and_misc: [5, 20],
};

export const LOW_BUDGET_STRATEGY: string[] = [
  "Usar legumbres, huevo, soya texturizada, avena, arroz, tortillas, papa y verduras de temporada.",
  "Comprar presentaciones grandes cuando el precio por kilogramo sea menor.",
  "Usar pollo entero o cortes económicos cuando sean compatibles con las preferencias.",
  "Calcular costo por gramo de proteína y por 1000 kcal, no solo el precio por paquete.",
  "Mantener variedad mínima de alimentos y no eliminar frutas y verduras por perseguir macros.",
];

export const BUDGET_SCOPE_REQUIRED = [
  "amount",
  "period",
  "household_size",
  "includes_supplements",
  "includes_eating_out",
];

export const PRICE_RECORD_REQUIRED = [
  "food_id",
  "price_mxn",
  "unit",
  "package_size",
  "store_or_market",
  "city_or_region",
  "observed_at",
  "source",
  "price_type",
  "confidence",
];

export const PRICE_TYPES: PriceType[] = [
  "retail",
  "wholesale",
  "promotional",
  "user_entered",
  "estimated",
];

const PERIOD_TO_WEEK: Record<BudgetPeriod, number> = {
  per_day: 7,
  per_week: 1,
  per_month: 12 / 52,
};

export function weeklyBudgetMXN(amount: number, period: BudgetPeriod): number {
  const factor = PERIOD_TO_WEEK[period] ?? 1;
  return Math.round(amount * factor * 100) / 100;
}

export function budgetBandsMXN(weekly: number): {
  proteins: [number, number];
  staples: [number, number];
  produce: [number, number];
  fats_and_misc: [number, number];
} {
  const p = BUDGET_ALLOCATION_DEFAULT;
  const band = (range: [number, number]): [number, number] => [
    Math.round((weekly * range[0]) / 100),
    Math.round((weekly * range[1]) / 100),
  ];
  return {
    proteins: band(p.proteins),
    staples: band(p.staples),
    produce: band(p.produce),
    fats_and_misc: band(p.fats_and_misc),
  };
}

export function pricePer100gFromRecord(record: PriceRecord): number | null {
  const unit = (record.unit ?? "").toLowerCase().trim();
  const price = Number(record.price_mxn);
  if (!Number.isFinite(price)) return null;
  if (unit.includes("kg")) return price / 10;
  if (unit.includes("100") && unit.includes("g")) return price;
  if (unit.includes("100") && unit.includes("ml")) return price;
  if (unit === "g" || unit === "gr" || unit === "gramo") {
    if (record.package_size && record.package_size > 0) {
      return (price * 100) / record.package_size;
    }
  }
  return null;
}

const CONFIDENCE_ORDER: Record<PriceConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function pickBestPrice(
  foodId: string,
  records: PriceRecord[],
  opts?: { cityOrRegion?: string; asOf?: string }
): PriceEstimate | null {
  const candidates = records
    .filter((r) => r.food_id === foodId)
    .map((r) => ({ pricePer100g: pricePer100gFromRecord(r), record: r }))
    .filter((e): e is PriceEstimate => e.pricePer100g !== null);

  if (candidates.length === 0) return null;

  const asOf = opts?.asOf ? new Date(opts.asOf).getTime() : Infinity;
  const score = (c: PriceEstimate): number => {
    const r = c.record;
    const cityMatch = opts?.cityOrRegion
      ? (r.city_or_region ?? "").toLowerCase() ===
        opts.cityOrRegion.toLowerCase()
        ? 1
        : 0
      : 0;
    const recency = r.observed_at
      ? Math.abs(new Date(r.observed_at).getTime() - asOf)
      : Number.MAX_SAFE_INTEGER;
    return cityMatch * -1_000_000_000 + recency + (CONFIDENCE_ORDER[r.confidence ?? "low"] ?? 2) * 1000;
  };

  candidates.sort((a, b) => score(a) - score(b));
  return candidates[0];
}

export function costPerProteinGram(
  pricePer100g: number | null,
  proteinPer100g: number
): number | null {
  if (pricePer100g === null) return null;
  return Math.round((pricePer100g / proteinPer100g) * 100) / 100;
}

export function costPer1000Kcal(
  pricePer100g: number | null,
  caloriesPer100g: number
): number | null {
  if (pricePer100g === null) return null;
  return Math.round((pricePer100g / Math.max(caloriesPer100g, 1)) * 1000 * 100) / 100;
}
