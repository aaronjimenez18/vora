// Genera supabase/migrations/0003_exercise_catalog.sql a partir del catálogo TS.
// Uso: node scripts/gen-seed.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "supabase", "migrations", "0003_exercise_catalog.sql");

// Cargamos el catálogo de ejercicios (los import type de "@/app/types" se eliminan con strip-types)
const { EXERCISES } = await import("../lib/engine/exercises.ts");

const esc = (s) => (s ?? "").replace(/'/g, "''");

function exerciseRow(e) {
  const secondary = e.secondary.length ? `'{${e.secondary.map(esc).join(",")}}'` : "'{}'";
  const cues = e.cues ? `'${esc(e.cues)}'` : "null";
  const how_to = e.how_to ? `'${esc(e.how_to)}'` : "null";
  const tips = e.tips ? `'${esc(e.tips)}'` : "null";
  const unilateral = e.unilateral_support ? "true" : "false";
  return `('${e.slug}', '${esc(e.name)}', '${esc(e.muscle)}', ${secondary}, '${e.equipment}', '${e.gear}', '${e.family}', ${unilateral}, '${e.difficulty}', '${e.pattern}', '${e.variation_group}', ${cues}, ${how_to}, ${tips})`;
}

const lines = [];
lines.push("-- ─────────────────────────────────────────────────────────────");
lines.push("-- VORA — Catálogo de ejercicios v2 (editor de rutinas)");
lines.push("-- Generado por scripts/gen-seed.mjs — no editar a mano.");
lines.push("-- Reemplaza el catálogo seed con el modelo de familias/equipo.");
lines.push("-- ─────────────────────────────────────────────────────────────");
lines.push("");

// ── Schema: campos del editor ──
lines.push("-- Ejercicios: familia, equipo concreto, unilateral e info");
lines.push("alter table public.exercises add column if not exists family text;");
lines.push("alter table public.exercises add column if not exists gear text;");
lines.push("alter table public.exercises add column if not exists unilateral_support boolean not null default false;");
lines.push("alter table public.exercises add column if not exists how_to text;");
lines.push("alter table public.exercises add column if not exists tips text;");
lines.push("create unique index if not exists exercises_slug_key on public.exercises (slug) where slug is not null;");
lines.push("");

lines.push("-- Ejercicios planificados: atributo a un brazo / alternado");
lines.push("alter table public.planned_exercises add column if not exists unilateral boolean not null default false;");
lines.push("");

lines.push("-- Días: focus para recomendar ejercicios");
lines.push("alter table public.workout_days add column if not exists focus text;");
lines.push("update public.workout_days set focus = lower(case");
lines.push("  when name ilike '%empuje%' then 'push'");
lines.push("  when name ilike '%tir%' or name ilike '%jal%' then 'pull'");
lines.push("  when name ilike '%pierna%' or name ilike '%lower%' then 'legs'");
lines.push("  when name ilike '%cuerpo completo%' or name ilike '%full%' then 'full_body'");
lines.push("  when name ilike '%upper%' or name ilike '%torso%' then 'upper'");
lines.push("  else null");
lines.push("end) where focus is null;");
lines.push("");

// ── Catálogo de ejercicios (re-seed) ──
lines.push("-- Re-seed: borra el catálogo estático y lo reinserta");
lines.push("delete from public.exercises where created_by is null;");
lines.push("");
lines.push("insert into public.exercises (slug, name, primary_muscle, secondary_muscles, equipment, gear, family, unilateral_support, difficulty, movement_pattern, variation_group, cues, how_to, tips) values");
for (const e of EXERCISES) lines.push(`  ${exerciseRow(e)},`);
lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
lines.push("on conflict (slug) where slug is not null do nothing;");
lines.push("");

writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Escrito ${out} (${EXERCISES.length} ejercicios)`);
