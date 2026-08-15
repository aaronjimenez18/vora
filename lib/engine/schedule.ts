import type { CardioSpec } from "@/app/types";
import type { RunningDayData } from "./running";
import type { DayTemplate } from "./workout";

export type ScheduleDayType = "strength" | "running" | "cardio" | "rest";

export interface ScheduledStrength {
  focus: DayTemplate["focus"];
  name: string;
}

export interface ScheduledDay {
  dayOfWeek: number; // 0 = lunes ... 6 = domingo
  dayType: ScheduleDayType;
  name: string;
  strength?: ScheduledStrength;
  cardio?: CardioSpec;
}

export const WEEKDAYS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Patrones de slots para días de fuerza: reparten la semana para dejar descansos.
const STRENGTH_SLOTS: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [0, 1, 3, 4],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 5],
};

function hasLegs(focus?: DayTemplate["focus"]): boolean {
  return focus === "legs" || focus === "lower" || focus === "full_body";
}

function isHardRun(spec: CardioSpec): boolean {
  return spec.mode === "interval" || spec.mode === "tempo";
}

// Intercala fuerza + running/cardio en los 7 días.
// Reglas: la pierna no se pega a carrera dura; las sesiones duras prefieren
// descanso al lado; nunca más de 7 días activos.
export function buildSchedule(
  strength: { focus: DayTemplate["focus"]; name: string }[],
  running: RunningDayData[]
): ScheduledDay[] {
  const S = Math.min(strength.length, 7);
  const keep = Math.max(0, Math.min(running.length, 7 - S));
  const runningDays = running.slice(0, keep);

  const assigned: (ScheduledDay | null)[] = Array(7).fill(null);

  const slots = S > 0 ? (STRENGTH_SLOTS[Math.min(S, 6)] ?? [0, 1, 2, 3, 4, 5, 6].slice(0, S)).slice(0, S) : [];
  strength.slice(0, S).forEach((sd, i) => {
    const w = slots[i];
    assigned[w] = {
      dayOfWeek: w,
      dayType: "strength",
      name: sd.name,
      strength: { focus: sd.focus, name: sd.name },
    };
  });

  const free = [0, 1, 2, 3, 4, 5, 6].filter((w) => !assigned[w]);

  const legsAdjacent = (w: number) => {
    const prev = w === 0 ? null : assigned[w - 1];
    const next = w === 6 ? null : assigned[w + 1];
    return (
      (prev !== null && prev.dayType === "strength" && hasLegs(prev.strength?.focus)) ||
      (next !== null && next.dayType === "strength" && hasLegs(next.strength?.focus))
    );
  };

  const safeForHard = free.filter((w) => !legsAdjacent(w));
  const softFirst = free.filter((w) => legsAdjacent(w));

  // Duros primero en slots lejos de pierna; los suaves rellenan lo demás.
  const ordered = [...runningDays.filter((r) => isHardRun(r.spec)), ...runningDays.filter((r) => !isHardRun(r.spec))];
  for (const r of ordered) {
    const candidates = isHardRun(r.spec) ? safeForHard : [...softFirst, ...safeForHard];
    let w = candidates.find((c) => !assigned[c]);
    if (w === undefined) w = free.find((f) => !assigned[f]);
    if (w === undefined) break;
    assigned[w] = { dayOfWeek: w, dayType: r.dayType, name: r.name, cardio: r.spec };
  }

  for (let w = 0; w < 7; w++) {
    if (!assigned[w]) assigned[w] = { dayOfWeek: w, dayType: "rest", name: "Descanso" };
  }

  return assigned as ScheduledDay[];
}
