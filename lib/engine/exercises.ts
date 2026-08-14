import type { Experience } from "@/app/types";

export type EquipmentTier = "gym" | "home_dumbbells" | "home_minimal";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type MovementPattern =
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "carry"
  | "power";

// Equipo concreto (para el picker: elegir barra / mancuernas / máquina / polea / peso corporal)
export type Gear = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";

export interface ExerciseTemplate {
  slug: string;
  name: string;
  muscle: string;
  secondary: string[];
  equipment: EquipmentTier; // mínimo requerido (compat motor)
  gear: Gear;               // implemento concreto (picker)
  family: string;           // agrupador de variantes (picker)
  difficulty: Difficulty;
  pattern: MovementPattern;
  variation_group: string;  // grupo de slot del motor
  unilateral_support?: boolean;
  cues?: string;
  how_to?: string;
  tips?: string;
}

export const EQUIPMENT_TIER: Record<EquipmentTier, number> = {
  gym: 3,
  home_dumbbells: 2,
  home_minimal: 1,
};

export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export const GEAR_LABEL: Record<Gear, string> = {
  barbell: "Barra",
  dumbbell: "Mancuernas",
  machine: "Máquina",
  cable: "Polea",
  bodyweight: "Peso corporal",
};

export const FAMILY_LABEL: Record<string, string> = {
  press_banca: "Press de banca",
  press_inclinado: "Press inclinado",
  press_hombros: "Press de hombros",
  aperturas_pecho: "Aperturas de pecho",
  pullover: "Pullover",
  fondos: "Fondos",
  lagartijas: "Lagartijas",
  elevacion_lateral: "Elevación lateral",
  elevacion_frontal: "Elevación frontal",
  vuelo_posterior: "Vuelo posterior",
  triceps_extension: "Extensión de tríceps",
  dominadas: "Dominadas / jalones",
  remo: "Remos",
  peso_muerto: "Peso muerto",
  curl_biceps: "Curl de bíceps",
  sentadilla: "Sentadillas",
  zancada: "Zancadas",
  empuje_cadera: "Empuje de cadera",
  cuadriceps_iso: "Cuádriceps (aislado)",
  isquio_iso: "Isquiotibiales (aislado)",
  gemelos: "Gemelos",
  plancha: "Planchas",
  elevacion_piernas: "Elevación de piernas",
  crunch: "Crunch",
  pallof: "Pallof / anti-rotación",
  carga: "Cargas",
  potencia: "Potencia",
  abductores: "Abductores",
  anti_extension: "Anti-extensión",
  gluteo_iso: "Glúteo (aislado)",
};

// ─── Catálogo ─────────────────────────────────────────────────

export const EXERCISES: ExerciseTemplate[] = [
  // Empuje — pecho
  { slug: "barbell-bench-press", name: "Press de banca con barra", muscle: "pecho", secondary: ["hombros", "tríceps"], equipment: "gym", gear: "barbell", family: "press_banca", difficulty: "beginner", pattern: "push", variation_group: "horizontal_push" },
  { slug: "dumbbell-bench-press", name: "Press de banca con mancuernas", muscle: "pecho", secondary: ["hombros", "tríceps"], equipment: "home_dumbbells", gear: "dumbbell", family: "press_banca", difficulty: "beginner", pattern: "push", variation_group: "horizontal_push" },
  { slug: "machine-chest-press", name: "Press de pecho en máquina", muscle: "pecho", secondary: ["tríceps"], equipment: "gym", gear: "machine", family: "press_banca", difficulty: "beginner", pattern: "push", variation_group: "horizontal_push" },
  { slug: "push-up", name: "Lagartijas", muscle: "pecho", secondary: ["hombros", "tríceps", "core"], equipment: "home_minimal", gear: "bodyweight", family: "lagartijas", difficulty: "beginner", pattern: "push", variation_group: "horizontal_push", cues: "Cuerpo en línea recta, baja hasta que el pecho toque el piso." },
  { slug: "incline-barbell-press", name: "Press inclinado con barra", muscle: "pecho superior", secondary: ["hombros"], equipment: "gym", gear: "barbell", family: "press_inclinado", difficulty: "intermediate", pattern: "push", variation_group: "incline_push" },
  { slug: "incline-dumbbell-press", name: "Press inclinado con mancuernas", muscle: "pecho superior", secondary: ["hombros", "tríceps"], equipment: "home_dumbbells", gear: "dumbbell", family: "press_inclinado", difficulty: "beginner", pattern: "push", variation_group: "incline_push" },
  { slug: "incline-machine-press", name: "Press inclinado en máquina", muscle: "pecho superior", secondary: ["hombros", "tríceps"], equipment: "gym", gear: "machine", family: "press_inclinado", difficulty: "beginner", pattern: "push", variation_group: "incline_push" },
  { slug: "dips", name: "Fondos en paralelas", muscle: "pecho inferior", secondary: ["tríceps", "hombros"], equipment: "gym", gear: "bodyweight", family: "fondos", difficulty: "intermediate", pattern: "push", variation_group: "dips" },
  { slug: "bench-dips", name: "Fondos en banca", muscle: "tríceps", secondary: ["pecho"], equipment: "home_minimal", gear: "bodyweight", family: "fondos", difficulty: "beginner", pattern: "push", variation_group: "dips" },
  // Empuje — hombros
  { slug: "barbell-overhead-press", name: "Press militar con barra", muscle: "hombros", secondary: ["tríceps"], equipment: "gym", gear: "barbell", family: "press_hombros", difficulty: "beginner", pattern: "push", variation_group: "vertical_push" },
  { slug: "dumbbell-shoulder-press", name: "Press de hombros con mancuernas", muscle: "hombros", secondary: ["tríceps"], equipment: "home_dumbbells", gear: "dumbbell", family: "press_hombros", difficulty: "beginner", pattern: "push", variation_group: "vertical_push" },
  { slug: "machine-shoulder-press", name: "Press de hombros en máquina", muscle: "hombros", secondary: ["tríceps"], equipment: "gym", gear: "machine", family: "press_hombros", difficulty: "beginner", pattern: "push", variation_group: "vertical_push" },
  { slug: "pike-push-up", name: "Lagartijas en pico", muscle: "hombros", secondary: ["tríceps"], equipment: "home_minimal", gear: "bodyweight", family: "lagartijas", difficulty: "intermediate", pattern: "push", variation_group: "vertical_push" },
  { slug: "lateral-raise", name: "Elevaciones laterales", muscle: "hombro lateral", secondary: [], equipment: "home_dumbbells", gear: "dumbbell", family: "elevacion_lateral", difficulty: "beginner", pattern: "push", variation_group: "lateral_raise", unilateral_support: true },
  { slug: "cable-lateral-raise", name: "Elevaciones laterales en polea", muscle: "hombro lateral", secondary: [], equipment: "gym", gear: "cable", family: "elevacion_lateral", difficulty: "intermediate", pattern: "push", variation_group: "lateral_raise", unilateral_support: true },
  { slug: "machine-lateral-raise", name: "Elevaciones laterales en máquina", muscle: "hombro lateral", secondary: [], equipment: "gym", gear: "machine", family: "elevacion_lateral", difficulty: "beginner", pattern: "push", variation_group: "lateral_raise" },
  { slug: "front-raise", name: "Elevaciones frontales", muscle: "hombro frontal", secondary: [], equipment: "home_dumbbells", gear: "dumbbell", family: "elevacion_frontal", difficulty: "beginner", pattern: "push", variation_group: "front_raise", unilateral_support: true },
  { slug: "cable-front-raise", name: "Elevaciones frontales en polea", muscle: "hombro frontal", secondary: [], equipment: "gym", gear: "cable", family: "elevacion_frontal", difficulty: "beginner", pattern: "push", variation_group: "front_raise" },
  { slug: "rear-delt-fly", name: "Vuelos posteriores", muscle: "hombro posterior", secondary: ["espalda alta"], equipment: "home_dumbbells", gear: "dumbbell", family: "vuelo_posterior", difficulty: "beginner", pattern: "pull", variation_group: "rear_delt" },
  { slug: "face-pull", name: "Face pull en polea", muscle: "hombro posterior", secondary: ["espalda alta"], equipment: "gym", gear: "cable", family: "vuelo_posterior", difficulty: "intermediate", pattern: "pull", variation_group: "rear_delt" },
  { slug: "machine-rear-delt", name: "Vuelos posteriores en máquina", muscle: "hombro posterior", secondary: [], equipment: "gym", gear: "machine", family: "vuelo_posterior", difficulty: "beginner", pattern: "pull", variation_group: "rear_delt" },
  // Empuje — aperturas
  { slug: "cable-fly", name: "Aperturas en polea", muscle: "pecho", secondary: [], equipment: "gym", gear: "cable", family: "aperturas_pecho", difficulty: "intermediate", pattern: "push", variation_group: "fly" },
  { slug: "pec-deck", name: "Pecho en máquina (peck deck)", muscle: "pecho", secondary: [], equipment: "gym", gear: "machine", family: "aperturas_pecho", difficulty: "beginner", pattern: "push", variation_group: "fly" },
  { slug: "dumbbell-fly", name: "Aperturas con mancuernas", muscle: "pecho", secondary: [], equipment: "home_dumbbells", gear: "dumbbell", family: "aperturas_pecho", difficulty: "intermediate", pattern: "push", variation_group: "fly", unilateral_support: true },
  { slug: "dumbbell-pullover", name: "Pullover con mancuerna", muscle: "pecho", secondary: ["dorsales"], equipment: "home_dumbbells", gear: "dumbbell", family: "pullover", difficulty: "intermediate", pattern: "push", variation_group: "pullover" },
  { slug: "cable-pullover", name: "Pullover en polea", muscle: "pecho", secondary: ["dorsales"], equipment: "gym", gear: "cable", family: "pullover", difficulty: "intermediate", pattern: "push", variation_group: "pullover" },
  // Empuje — tríceps
  { slug: "triceps-pushdown", name: "Extensiones de tríceps en polea", muscle: "tríceps", secondary: [], equipment: "gym", gear: "cable", family: "triceps_extension", difficulty: "beginner", pattern: "push", variation_group: "triceps_pressdown", unilateral_support: true },
  { slug: "cable-overhead-triceps-unilateral", name: "Extensión de tríceps en polea (a un brazo)", muscle: "tríceps", secondary: [], equipment: "gym", gear: "cable", family: "triceps_extension", difficulty: "intermediate", pattern: "push", variation_group: "triceps_pressdown", unilateral_support: true },
  { slug: "dumbbell-overhead-extension", name: "Extensión de tríceps sobre la cabeza", muscle: "tríceps", secondary: [], equipment: "home_dumbbells", gear: "dumbbell", family: "triceps_extension", difficulty: "intermediate", pattern: "push", variation_group: "triceps_pressdown", unilateral_support: true },
  { slug: "skull-crusher", name: "Rompe cráneos (acostado)", muscle: "tríceps", secondary: [], equipment: "gym", gear: "barbell", family: "triceps_extension", difficulty: "intermediate", pattern: "push", variation_group: "triceps_pressdown", unilateral_support: true },
  { slug: "machine-triceps-extension", name: "Extensión de tríceps en máquina", muscle: "tríceps", secondary: [], equipment: "gym", gear: "machine", family: "triceps_extension", difficulty: "beginner", pattern: "push", variation_group: "triceps_pressdown" },

  // Tirón — espalda vertical
  { slug: "pull-up", name: "Dominadas", muscle: "dorsales", secondary: ["bíceps", "espalda media"], equipment: "gym", gear: "bodyweight", family: "dominadas", difficulty: "intermediate", pattern: "pull", variation_group: "vertical_pull" },
  { slug: "chin-up", name: "Dominadas supinas", muscle: "dorsales", secondary: ["bíceps"], equipment: "gym", gear: "bodyweight", family: "dominadas", difficulty: "intermediate", pattern: "pull", variation_group: "vertical_pull" },
  { slug: "lat-pulldown", name: "Jalón al pecho", muscle: "dorsales", secondary: ["bíceps"], equipment: "gym", gear: "machine", family: "dominadas", difficulty: "beginner", pattern: "pull", variation_group: "vertical_pull" },
  { slug: "assisted-pull-up", name: "Dominadas asistidas", muscle: "dorsales", secondary: ["bíceps"], equipment: "gym", gear: "machine", family: "dominadas", difficulty: "beginner", pattern: "pull", variation_group: "vertical_pull" },
  // Tirón — espalda horizontal
  { slug: "inverted-row", name: "Remo invertido", muscle: "espalda media", secondary: ["dorsales", "bíceps"], equipment: "home_minimal", gear: "bodyweight", family: "remo", difficulty: "beginner", pattern: "pull", variation_group: "row" },
  { slug: "barbell-row", name: "Remo con barra", muscle: "espalda media", secondary: ["dorsales", "bíceps"], equipment: "gym", gear: "barbell", family: "remo", difficulty: "intermediate", pattern: "pull", variation_group: "row" },
  { slug: "dumbbell-row", name: "Remo con mancuerna", muscle: "espalda media", secondary: ["dorsales", "bíceps"], equipment: "home_dumbbells", gear: "dumbbell", family: "remo", difficulty: "beginner", pattern: "pull", variation_group: "row", unilateral_support: true },
  { slug: "cable-seated-row", name: "Remo sentado en polea", muscle: "espalda media", secondary: ["dorsales", "bíceps"], equipment: "gym", gear: "cable", family: "remo", difficulty: "beginner", pattern: "pull", variation_group: "row" },
  { slug: "machine-row", name: "Remo en máquina", muscle: "espalda media", secondary: ["dorsales"], equipment: "gym", gear: "machine", family: "remo", difficulty: "beginner", pattern: "pull", variation_group: "row" },
  { slug: "one-arm-dumbbell-row", name: "Remo a un brazo", muscle: "dorsales", secondary: ["espalda media"], equipment: "home_dumbbells", gear: "dumbbell", family: "remo", difficulty: "beginner", pattern: "pull", variation_group: "row" },
  // Tirón — peso muerto
  { slug: "barbell-deadlift", name: "Peso muerto con barra", muscle: "isquiotibiales", secondary: ["glúteos", "espalda", "core"], equipment: "gym", gear: "barbell", family: "peso_muerto", difficulty: "intermediate", pattern: "pull", variation_group: "deadlift", cues: "Espalda neutral, la barra pega a las piernas." },
  { slug: "romanian-deadlift", name: "Peso muerto rumano", muscle: "isquiotibiales", secondary: ["glúteos"], equipment: "gym", gear: "barbell", family: "peso_muerto", difficulty: "intermediate", pattern: "pull", variation_group: "deadlift" },
  { slug: "dumbbell-rdl", name: "Peso muerto rumano con mancuernas", muscle: "isquiotibiales", secondary: ["glúteos"], equipment: "home_dumbbells", gear: "dumbbell", family: "peso_muerto", difficulty: "beginner", pattern: "pull", variation_group: "deadlift" },
  { slug: "kettlebell-swing", name: "Balanceo con kettlebell", muscle: "glúteos", secondary: ["isquiotibiales", "erectores espinales", "core"], equipment: "home_dumbbells", gear: "dumbbell", family: "peso_muerto", difficulty: "intermediate", pattern: "power", variation_group: "deadlift" },
  // Tirón — bíceps
  { slug: "barbell-curl", name: "Curl con barra", muscle: "bíceps", secondary: [], equipment: "gym", gear: "barbell", family: "curl_biceps", difficulty: "beginner", pattern: "pull", variation_group: "biceps_curl", unilateral_support: true },
  { slug: "dumbbell-curl", name: "Curl con mancuernas", muscle: "bíceps", secondary: [], equipment: "home_dumbbells", gear: "dumbbell", family: "curl_biceps", difficulty: "beginner", pattern: "pull", variation_group: "biceps_curl", unilateral_support: true },
  { slug: "incline-dumbbell-curl", name: "Curl con mancuernas en banco inclinado", muscle: "bíceps", secondary: [], equipment: "home_dumbbells", gear: "dumbbell", family: "curl_biceps", difficulty: "intermediate", pattern: "pull", variation_group: "biceps_curl", unilateral_support: true },
  { slug: "cable-curl", name: "Curl en polea", muscle: "bíceps", secondary: [], equipment: "gym", gear: "cable", family: "curl_biceps", difficulty: "beginner", pattern: "pull", variation_group: "biceps_curl", unilateral_support: true },
  { slug: "hammer-curl", name: "Curl martillo", muscle: "braquial", secondary: ["bíceps"], equipment: "home_dumbbells", gear: "dumbbell", family: "curl_biceps", difficulty: "beginner", pattern: "pull", variation_group: "biceps_curl", unilateral_support: true },
  { slug: "machine-curl", name: "Curl en máquina", muscle: "bíceps", secondary: [], equipment: "gym", gear: "machine", family: "curl_biceps", difficulty: "beginner", pattern: "pull", variation_group: "biceps_curl" },

  // Pierna
  { slug: "barbell-back-squat", name: "Sentadilla trasera", muscle: "cuádriceps", secondary: ["glúteos", "isquiotibiales"], equipment: "gym", gear: "barbell", family: "sentadilla", difficulty: "intermediate", pattern: "legs", variation_group: "squat" },
  { slug: "front-squat", name: "Sentadilla frontal", muscle: "cuádriceps", secondary: ["glúteos", "erectores espinales"], equipment: "gym", gear: "barbell", family: "sentadilla", difficulty: "intermediate", pattern: "legs", variation_group: "squat" },
  { slug: "goblet-squat", name: "Sentadilla goblet", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "home_dumbbells", gear: "dumbbell", family: "sentadilla", difficulty: "beginner", pattern: "legs", variation_group: "squat" },
  { slug: "bodyweight-squat", name: "Sentadilla a peso corporal", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "home_minimal", gear: "bodyweight", family: "sentadilla", difficulty: "beginner", pattern: "legs", variation_group: "squat" },
  { slug: "leg-press", name: "Prensa de pierna", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "gym", gear: "machine", family: "sentadilla", difficulty: "beginner", pattern: "legs", variation_group: "squat" },
  { slug: "bulgarian-split-squat", name: "Sentadilla búlgara", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "home_dumbbells", gear: "dumbbell", family: "zancada", difficulty: "intermediate", pattern: "legs", variation_group: "lunge" },
  { slug: "dumbbell-lunge", name: "Zancadas con mancuernas", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "home_dumbbells", gear: "dumbbell", family: "zancada", difficulty: "beginner", pattern: "legs", variation_group: "lunge" },
  { slug: "walking-lunge", name: "Zancadas caminando", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "home_minimal", gear: "bodyweight", family: "zancada", difficulty: "beginner", pattern: "legs", variation_group: "lunge" },
  { slug: "step-up", name: "Subir a un escalón", muscle: "cuádriceps", secondary: ["glúteos"], equipment: "home_minimal", gear: "bodyweight", family: "zancada", difficulty: "beginner", pattern: "legs", variation_group: "lunge" },
  { slug: "hip-thrust", name: "Empuje de cadera con barra", muscle: "glúteos", secondary: ["isquiotibiales"], equipment: "gym", gear: "barbell", family: "empuje_cadera", difficulty: "beginner", pattern: "legs", variation_group: "glute_hinge" },
  { slug: "dumbbell-hip-thrust", name: "Empuje de cadera con mancuernas", muscle: "glúteos", secondary: ["isquiotibiales"], equipment: "home_dumbbells", gear: "dumbbell", family: "empuje_cadera", difficulty: "beginner", pattern: "legs", variation_group: "glute_hinge" },
  { slug: "glute-bridge", name: "Puente de glúteo", muscle: "glúteos", secondary: ["isquiotibiales", "core"], equipment: "home_minimal", gear: "bodyweight", family: "empuje_cadera", difficulty: "beginner", pattern: "legs", variation_group: "glute_hinge" },
  { slug: "cable-glute-kickback", name: "Patada de glúteo en polea", muscle: "glúteos", secondary: ["isquiotibiales"], equipment: "gym", gear: "cable", family: "gluteo_iso", difficulty: "beginner", pattern: "legs", variation_group: "glute_iso", unilateral_support: true },
  { slug: "hip-abduction-machine", name: "Apertura de cadera en máquina", muscle: "abductores", secondary: [], equipment: "gym", gear: "machine", family: "abductores", difficulty: "beginner", pattern: "legs", variation_group: "hip_abduction" },
  { slug: "leg-extension", name: "Extensión de cuádriceps", muscle: "cuádriceps", secondary: [], equipment: "gym", gear: "machine", family: "cuadriceps_iso", difficulty: "beginner", pattern: "legs", variation_group: "quad_iso" },
  { slug: "leg-curl", name: "Curl femoral", muscle: "isquiotibiales", secondary: [], equipment: "gym", gear: "machine", family: "isquio_iso", difficulty: "beginner", pattern: "legs", variation_group: "ham_iso" },
  { slug: "nordic-curl", name: "Curl nórdico", muscle: "isquiotibiales", secondary: [], equipment: "home_minimal", gear: "bodyweight", family: "isquio_iso", difficulty: "advanced", pattern: "legs", variation_group: "ham_iso" },
  { slug: "standing-calf-raise", name: "Elevación de gemelos de pie", muscle: "gemelos", secondary: [], equipment: "home_minimal", gear: "bodyweight", family: "gemelos", difficulty: "beginner", pattern: "legs", variation_group: "calf" },
  { slug: "seated-calf-raise", name: "Elevación de gemelos sentado", muscle: "gemelos", secondary: [], equipment: "gym", gear: "machine", family: "gemelos", difficulty: "beginner", pattern: "legs", variation_group: "calf" },

  // Core
  { slug: "plank", name: "Plancha", muscle: "abdomen", secondary: ["core"], equipment: "home_minimal", gear: "bodyweight", family: "plancha", difficulty: "beginner", pattern: "core", variation_group: "plank", cues: "Glúteos apretados, no dejes caer la cadera." },
  { slug: "side-plank", name: "Plancha lateral", muscle: "oblicuos", secondary: ["core"], equipment: "home_minimal", gear: "bodyweight", family: "plancha", difficulty: "beginner", pattern: "core", variation_group: "plank" },
  { slug: "hanging-leg-raise", name: "Elevación de piernas colgado", muscle: "abdomen", secondary: ["flexores de cadera"], equipment: "gym", gear: "bodyweight", family: "elevacion_piernas", difficulty: "intermediate", pattern: "core", variation_group: "leg_raise" },
  { slug: "lying-leg-raise", name: "Elevación de piernas acostado", muscle: "abdomen", secondary: [], equipment: "home_minimal", gear: "bodyweight", family: "elevacion_piernas", difficulty: "beginner", pattern: "core", variation_group: "leg_raise" },
  { slug: "cable-crunch", name: "Crunch en polea", muscle: "abdomen", secondary: [], equipment: "gym", gear: "cable", family: "crunch", difficulty: "beginner", pattern: "core", variation_group: "crunch" },
  { slug: "russian-twist", name: "Giros rusos", muscle: "oblicuos", secondary: ["abdomen"], equipment: "home_minimal", gear: "bodyweight", family: "crunch", difficulty: "beginner", pattern: "core", variation_group: "crunch" },
  { slug: "ab-wheel", name: "Rueda abdominal", muscle: "abdomen", secondary: ["core"], equipment: "home_minimal", gear: "bodyweight", family: "crunch", difficulty: "intermediate", pattern: "core", variation_group: "crunch" },
  { slug: "pallof-press", name: "Pallof press", muscle: "oblicuos", secondary: ["core"], equipment: "gym", gear: "cable", family: "pallof", difficulty: "beginner", pattern: "core", variation_group: "anti_rotation" },
  { slug: "dead-bug", name: "Insecto muerto", muscle: "abdomen", secondary: ["core"], equipment: "home_minimal", gear: "bodyweight", family: "anti_extension", difficulty: "beginner", pattern: "core", variation_group: "anti_extension" },

  // Potencia
  { slug: "box-jump", name: "Salto al cajón", muscle: "cuádriceps", secondary: ["glúteos", "gemelos"], equipment: "home_minimal", gear: "bodyweight", family: "potencia", difficulty: "beginner", pattern: "power", variation_group: "power_legs" },
  { slug: "medball-chest-throw", name: "Lanzamiento de balón medicinal", muscle: "pecho", secondary: ["hombros", "tríceps"], equipment: "home_minimal", gear: "bodyweight", family: "potencia", difficulty: "beginner", pattern: "power", variation_group: "power_push" },
  { slug: "sled-push", name: "Empuje de trineo", muscle: "cuádriceps", secondary: ["glúteos", "gemelos"], equipment: "gym", gear: "bodyweight", family: "potencia", difficulty: "beginner", pattern: "power", variation_group: "power_legs" },

  // Cargas
  { slug: "farmer-carry", name: "Carga del granjero con mancuernas", muscle: "agarre", secondary: ["trapecios", "core"], equipment: "gym", gear: "dumbbell", family: "carga", difficulty: "beginner", pattern: "carry", variation_group: "carry" },
  { slug: "dumbbell-farmer-carry", name: "Carga del granjero", muscle: "agarre", secondary: ["trapecios", "core"], equipment: "home_dumbbells", gear: "dumbbell", family: "carga", difficulty: "beginner", pattern: "carry", variation_group: "carry" },
  { slug: "suitcase-carry", name: "Carga maleta", muscle: "oblicuos", secondary: ["agarre"], equipment: "home_dumbbells", gear: "dumbbell", family: "carga", difficulty: "intermediate", pattern: "carry", variation_group: "carry" },
];

// ─── Helpers ──────────────────────────────────────────────────

export function equipmentTier(equipment: EquipmentTier | string): number {
  return EQUIPMENT_TIER[equipment as EquipmentTier] ?? 3;
}

export function maxDifficultyFor(experience: Experience): number {
  if (experience === "beginner") return DIFFICULTY_RANK.intermediate;
  return DIFFICULTY_RANK.advanced;
}

export function exerciseBySlug(slug: string): ExerciseTemplate | undefined {
  return EXERCISES.find((e) => e.slug === slug);
}

export function gearLabel(gear?: string): string {
  return GEAR_LABEL[gear as Gear] ?? "";
}

export function familyLabel(family: string): string {
  return FAMILY_LABEL[family] ?? family.replace(/_/g, " ");
}

export interface ExerciseFamily {
  family: string;
  variants: ExerciseTemplate[];
}

export function families(): ExerciseFamily[] {
  const map = new Map<string, ExerciseTemplate[]>();
  for (const e of EXERCISES) {
    const f = e.family ?? "otros";
    const list = map.get(f) ?? [];
    list.push(e);
    map.set(f, list);
  }
  return [...map.entries()].map(([family, variants]) => ({ family, variants }));
}

// Variantes de una familia que el usuario puede hacer (equipo + dificultad)
export function eligibleVariants(
  variants: ExerciseTemplate[],
  experience: Experience,
  userTier: EquipmentTier
): ExerciseTemplate[] {
  const maxDiff = maxDifficultyFor(experience);
  const tier = equipmentTier(userTier);
  return variants.filter(
    (e) => equipmentTier(e.equipment) <= tier && DIFFICULTY_RANK[e.difficulty] <= maxDiff
  );
}
