// ─── Vora App Types ───────────────────────────────────────────

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

export interface Macros {
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
  fiber?: number;    // grams
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  macros: Macros;
  serving: number;   // grams
  servingUnit: string;
  emoji?: string;
  category?: string;
  image?: string;
}

export interface MealEntry {
  id: string;
  name: string;
  category: MealCategory;
  calories: number;
  macros: Macros;
  time: string;       // ISO string
  image?: string;
  foods?: FoodItem[];
}

export interface MacroGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WaterLog {
  date: string;       // YYYY-MM-DD
  glasses: number;    // 250ml each
  goal: number;
}

export interface WeightEntry {
  date: string;
  weight: number;     // kg
}

export interface AnalyticsDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiresAt?: string;
  category: string;
  cost?: number;
}

export interface BudgetEntry {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type TabId = "today" | "workout" | "diet" | "progress" | "coach";

// ─── Coach de gym ─────────────────────────────────────────────

export type Goal = "lose_fat" | "gain_muscle" | "recomp" | "maintain";
export type Experience = "beginner" | "intermediate" | "advanced";
export type AppMode = "guided" | "manual";
export type Sex = "male" | "female" | "other";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DayType = "training" | "rest";
export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export interface UserProfile {
  user_id: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  body_fat?: number;
  goal: Goal;
  experience: Experience;
  training_days: number;
  training_minutes: number;
  equipment: string;
  injuries?: string;
  split_pref?: string;
  running_level?: "first_time" | "beginner" | "intermediate" | "advanced";
  weekly_budget: number;
  dietary_prefs?: string;
  activity_level?: string;
  mode: AppMode;
  updated_at: string;
  sex_for_equation?: "male" | "female";
  budget_amount_mxn?: number;
  budget_period?: "per_day" | "per_week" | "per_month";
  budget_includes_supplements?: boolean;
  budget_includes_eating_out?: boolean;
  household_size?: number;
  shared_foods?: boolean;
  shopping_frequency?: "daily" | "weekly" | "biweekly" | "monthly";
  store_preferences?: string;
  diet_style?: "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "other";
  allergies?: string[];
  intolerances?: string[];
  religious_restrictions?: string;
  foods_liked?: string[];
  foods_disliked?: string[];
  cooking_time_minutes?: number;
  kitchen_equipment?: string[];
  meals_per_day?: number;
  snacks_per_day?: number;
  occupation_activity?: string;
  steps_per_day?: number;
  strength_days_per_week?: number;
  running_days_per_week?: number;
  average_session_minutes?: number;
  training_intensity?: "low" | "moderate" | "high";
  cardio_minutes_per_week?: number;
  health_flags?: string[];
  output_preferences?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  slug?: string;
  primary_muscle?: string;
  secondary_muscles?: string[];
  equipment?: string;
  gear?: string;
  family?: string;
  unilateral_support?: boolean;
  difficulty?: ExerciseDifficulty;
  movement_pattern?: string;
  variation_group?: string;
  cues?: string;
  how_to?: string;
  tips?: string;
  meta?: Record<string, unknown>;
  created_by?: string;
}

export interface PlannedExercise {
  id: string;
  workout_day_id: string;
  exercise_id?: string;
  custom_name?: string;
  sets?: number;
  reps_low?: number;
  reps_high?: number;
  rir?: number;
  unilateral?: boolean;
  target_weight?: number;
  notes?: string;
  position?: number;
}

export type WorkoutDayType = "strength" | "running" | "cardio";

export type CardioMode =
  | "recovery"
  | "easy"
  | "long"
  | "tempo"
  | "interval"
  | "steady"
  | "hiit";

export interface CardioSpec {
  mode: CardioMode;
  durationMin: number;
  rpe: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  name?: string;
  focus?: string;
  day_type?: WorkoutDayType;
  cardio_spec?: CardioSpec | null;
  day_of_week?: number;
  position?: number;
  source: "generated" | "custom";
  exercises?: PlannedExercise[];
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  exercise_id?: string;
  custom_name?: string;
  set_index: number;
  reps: number;
  weight_kg?: number;
  rir?: number;
  pain?: "green" | "yellow" | "red" | null;
  velocity?: "fast" | "normal" | "slow" | null;
  technique?: boolean | null;
  technical_failure?: boolean | null;
  notes?: string;
}

export type ProgressionAction =
  | "increase_load"
  | "increase_reps"
  | "switch_variant"
  | "maintain"
  | "reduce_load"
  | "deload"
  | "stop";

export interface Estimated1RM {
  id: string;
  user_id: string;
  exercise_id?: string;
  e1rm: number;
  method?: string;
  session_id?: string;
  date: string;
  created_at?: string;
}

export interface ProgressionDecision {
  id: string;
  user_id: string;
  exercise_id?: string;
  workout_day_id?: string;
  session_id?: string;
  date: string;
  action: ProgressionAction;
  pct?: number;
  from_weight?: number;
  to_weight?: number;
  to_reps?: number;
  remove_set?: boolean;
  rationale: string[];
  applied?: boolean;
  created_at?: string;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  serving_g?: number;
  serving_unit?: string;
  price_mxn?: number;
  category?: string;
  food_id?: string;
  micronutrients?: string[];
  allergens?: string[];
  common_units?: string[];
  nutrient_source?: string;
  source?: "seed" | "usda" | "user" | "bam";
  bam_code?: string;
  local_price_key?: string;
  preparation_state?: string;
  price_update_required?: boolean;
  nutrients?: Record<string, number | null>;
  created_by?: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  name?: string;
  split_type?: string;
  days_per_week?: number;
  source?: "generated" | "custom";
  is_active?: boolean;
  created_at?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_day_id?: string;
  date: string;
  notes?: string;
  created_at?: string;
}

export interface DietPlan {
  id: string;
  user_id: string;
  name?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  weekly_budget?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface DietMeal {
  id: string;
  plan_id: string;
  day_type?: DayType;
  meal_type?: MealType;
  name?: string;
  recipe?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  cost_mxn?: number;
}

export interface MealLog {
  id: string;
  user_id: string;
  date: string;
  meal_type?: MealType;
  food_id?: string;
  custom_name?: string;
  quantity?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  cost_mxn?: number;
  notes?: string;
  created_at?: string;
}
export interface ProgressEntry {
  id: string;
  user_id: string;
  date: string;
  weight_kg?: number;
  body_fat?: number;
  chest_cm?: number;
  waist_cm?: number;
  arm_cm?: number;
  notes?: string;
}

export interface AppState {
  // Today
  meals: MealEntry[];
  water: WaterLog;
  goals: MacroGoal;
  // History
  analytics: AnalyticsDay[];
  weights: WeightEntry[];
  // Budget
  inventory: InventoryItem[];
  budgetEntries: BudgetEntry[];
  budgetGoal: number;
  // AI Coach
  chatMessages: ChatMessage[];
  // UI
  activeTab: TabId;
}
