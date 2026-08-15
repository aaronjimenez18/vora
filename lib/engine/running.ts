import type { CardioSpec, UserProfile } from "@/app/types";

export interface RunningDayData {
  dayType: "running" | "cardio";
  name: string;
  spec: CardioSpec;
}

const RUNNING_LEVELS: Record<string, number> = {
  first_time: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export function runningLevelIndex(profile: UserProfile): number {
  return RUNNING_LEVELS[profile.running_level ?? "first_time"] ?? 0;
}

// Duración base (min) de rodaje fácil por nivel; la larga se escala con factor.
const EASY_MIN = [15, 20, 25, 30];
const LONG_FACTOR = [1.5, 1.7, 2, 2.2];

export function buildRunningDays(profile: UserProfile): RunningDayData[] {
  const level = runningLevelIndex(profile);
  const runningDays = Math.max(0, Math.min(7, Number(profile.running_days_per_week) || 0));
  const cardioMin = Math.max(0, Number(profile.cardio_minutes_per_week) || 0);

  const out: RunningDayData[] = [];

  if (runningDays > 0) {
    const easy = EASY_MIN[level];
    const long = Math.round(easy * LONG_FACTOR[level]);
    const blocks = 2 + level; // bloques de intervalos 2-5

    let pattern: RunningDayData["spec"]["mode"][] = ["easy"];
    if (runningDays === 2) pattern = ["easy", "interval"];
    if (runningDays === 3) pattern = ["easy", "interval", "long"];
    if (runningDays >= 4) pattern = ["easy", "interval", "tempo", "long"];
    if (runningDays >= 5) pattern = ["recovery", "easy", "interval", "tempo", "long"];
    if (runningDays >= 6) pattern = ["recovery", "easy", "interval", "tempo", "long", "easy"];
    if (runningDays >= 7) pattern = ["recovery", "easy", "interval", "tempo", "long", "easy", "interval"];

    pattern.slice(0, runningDays).forEach((mode, i) => {
      out.push({
        dayType: "running",
        name: `Carrera ${i + 1} · ${MODE_LABELS[mode]}`,
        spec: runningSpec(mode, level, easy, long, blocks),
      });
    });
  }

  if (cardioMin >= 20) {
    const hiit = cardioMin >= 60;
    out.push({
      dayType: "cardio",
      name: hiit ? "Cardio · HIIT" : "Cardio · Suave",
      spec: hiit
        ? {
            mode: "hiit",
            durationMin: 20,
            rpe: 8,
            notes: "Alterna 30 s intenso / 90 s suave. Bicicleta, remo o cuerda.",
          }
        : {
            mode: "steady",
            durationMin: Math.max(20, Math.min(45, Math.round(cardioMin / 2))),
            rpe: 5,
            notes: "Ritmo que te permita hablar con frases cortas. Bici, elíptica o caminata rápida.",
          },
    });
  }

  return out;
}

const MODE_LABELS: Record<CardioSpec["mode"], string> = {
  recovery: "trote de recuperación",
  easy: "fácil",
  long: "larga",
  tempo: "tempo",
  interval: "intervalos",
  steady: "cardio suave",
  hiit: "HIIT",
};

function runningSpec(
  mode: CardioSpec["mode"],
  level: number,
  easy: number,
  long: number,
  blocks: number
): CardioSpec {
  switch (mode) {
    case "recovery":
      return {
        mode,
        durationMin: Math.max(12, easy - 10),
        rpe: 3,
        notes: "Trote muy suave; puedes platicar. Prioridad: recuperación activa.",
      };
    case "easy":
      return { mode, durationMin: easy, rpe: 4, notes: "Ritmo conversacional, sin jadeo." };
    case "long":
      return {
        mode,
        durationMin: long,
        rpe: 4,
        notes: "Corre lento y constante; la última parte debe costar un poco.",
      };
    case "tempo":
      return {
        mode,
        durationMin: Math.max(15, Math.round(easy / 2)),
        rpe: 7,
        notes: "Ritmo rápido pero sostenible. Termina con 5 min de trote suave.",
      };
    case "interval":
      return {
        mode,
        durationMin: 20,
        rpe: 8,
        notes: `Calienta 5 min. Luego ${blocks} bloques de 2 min rápido + 2 min trote suave. Enfría 5 min.`,
      };
    case "steady":
      return { mode, durationMin: easy, rpe: 5, notes: "Ritmo constante y cómodo." };
    case "hiit":
      return { mode, durationMin: 20, rpe: 8, notes: "Ráfagas intensas con descansos cortos." };
  }
}
