// Genera supabase/migrations/0004_progression.sql a partir de la
// investigación: supabase/migrations/ejercicios.db (50 ejercicios con
// reglas individuales) + catálogo TS (lib/engine/exercises.ts).
// Uso: node scripts/import-exercises.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "supabase", "migrations", "0004_progression.sql");

const { EXERCISES } = await import("../lib/engine/exercises.ts");
const db = JSON.parse(
  (await import("node:fs")).readFileSync(
    join(root, "supabase", "migrations", "ejercicios.db"),
    "utf8"
  )
);

// ── Utilidades SQL ──
const esc = (s) => (s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
const sqlStr = (s) => `'${esc(s)}'`;
const jsonLiteral = (obj) => sqlStr(JSON.stringify(obj));
const arrLiteral = (arr) =>
  `'{${(arr ?? []).map((x) => esc(String(x))).join(",")}}'`;

// ── Mapeo id de investigación → slug del catálogo ──
const slugify = (id) => id.replace(/^ex_/, "").replace(/_/g, "-");
const ALIAS = {
  ex_dip_assisted: "dips",
  ex_lat_pulldown_neutral: "lat-pulldown",
  ex_overhead_press: "dumbbell-shoulder-press",
  ex_overhead_triceps_extension: "dumbbell-overhead-extension",
  ex_calf_raise: "standing-calf-raise",
  ex_barbell_hip_thrust: "hip-thrust",
  ex_seated_cable_row: "cable-seated-row",
  ex_chest_supported_row: "machine-row",
  ex_lying_leg_curl: "leg-curl",
  ex_one_arm_dumbbell_row: "one-arm-dumbbell-row",
  ex_cable_biceps_curl: "cable-curl",
  ex_cable_triceps_pressdown: "triceps-pushdown",
};
// Ejercicios del research que se añaden al catálogo
const NEW_SLUGS = new Set([
  "front-squat",
  "cable-glute-kickback",
  "hip-abduction-machine",
  "kettlebell-swing",
  "incline-dumbbell-curl",
  "cable-overhead-triceps-unilateral",
  "dead-bug",
  "box-jump",
  "medball-chest-throw",
  "sled-push",
]);

const catalogSlugs = new Set(EXERCISES.map((e) => e.slug));
const bySlug = Object.fromEntries(EXERCISES.map((e) => [e.slug, e]));

function resolveSlug(id) {
  return ALIAS[id] ?? slugify(id);
}

function tipsText(e) {
  const lines = [];
  for (const cue of e.key_cues ?? []) lines.push(cue);
  for (const err of e.common_errors ?? []) lines.push("Evita: " + err);
  if (e.contraindications_or_cautions)
    lines.push("Precaución: " + e.contraindications_or_cautions);
  if (e.rest_seconds) lines.push("Descanso: " + e.rest_seconds + " s");
  return lines.join("\n");
}

function catalogRow(slug) {
  const t = bySlug[slug];
  return [
    `'${esc(slug)}'`,
    `'${esc(t.name)}'`,
    `'${esc(t.muscle)}'`,
    arrLiteral(t.secondary),
    `'${esc(t.equipment)}'`,
    `'${esc(t.gear)}'`,
    `'${esc(t.family)}'`,
    t.unilateral_support ? "true" : "false",
    `'${esc(t.difficulty)}'`,
    `'${esc(t.pattern)}'`,
    `'${esc(t.variation_group)}'`,
  ].join(",\n    ");
}

// ── Clasificar ──
const matched = []; // existen en catálogo (enriquecer)
const toAdd = [];   // nuevos (insertar + enriquecer)
const skipped = []; // sin equivalente de fuerza-hipertrofia

for (const e of db) {
  const slug = resolveSlug(e.id);
  if (!catalogSlugs.has(slug)) {
    skipped.push(`${e.id} -> ${slug}`);
    continue;
  }
  if (NEW_SLUGS.has(slug)) toAdd.push({ e, slug });
  else matched.push({ e, slug });
}

// ── Generar SQL ──
const L = [];
L.push("-- ─────────────────────────────────────────────────────────────");
L.push("-- VORA — Motor de RIR y Progresión");
L.push("-- Generado por scripts/import-exercises.mjs — no editar a mano.");
L.push("-- Fuentes: ejercicios.db (50 ejercicios) + progresion-rules.db");
L.push("-- Aditivo e idempotente: funciona con o sin 0003 aplicada.");
L.push("-- ─────────────────────────────────────────────────────────────");
L.push("");

// ── Schema ──
L.push("-- Variables del motor RIR por serie");
L.push("alter table public.exercise_logs add column if not exists pain text;");
L.push("alter table public.exercise_logs add column if not exists velocity text;");
L.push("alter table public.exercise_logs add column if not exists technique boolean;");
L.push("alter table public.exercise_logs add column if not exists technical_failure boolean;");
L.push("");
L.push("-- Peso objetivo sugerido para la próxima sesión");
L.push("alter table public.planned_exercises add column if not exists target_weight numeric;");
L.push("");
L.push("-- Investigación por ejercicio (RIR por nivel, reglas, fallo, regresión…)");
L.push("alter table public.exercises add column if not exists meta jsonb;");
L.push("");

L.push("-- 1RM estimado (Epley) por ejercicio");
L.push("create table if not exists public.estimated_1rm (");
L.push("  id uuid primary key default gen_random_uuid(),");
L.push("  user_id uuid not null references auth.users(id) on delete cascade,");
L.push("  exercise_id uuid references public.exercises(id) on delete cascade,");
L.push("  e1rm numeric not null check (e1rm > 0),");
L.push("  method text not null default 'epley',");
L.push("  session_id uuid references public.workout_sessions(id) on delete set null,");
L.push("  date date not null default current_date,");
L.push("  created_at timestamptz not null default now()");
L.push(");");
L.push("alter table public.estimated_1rm enable row level security;");
L.push("drop policy if exists \"own estimated_1rm\" on public.estimated_1rm;");
L.push("create policy \"own estimated_1rm\" on public.estimated_1rm");
L.push("  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);");
L.push("");

L.push("-- Decisiones de progresión (recomendar + aplicar)");
L.push("create table if not exists public.progression_decisions (");
L.push("  id uuid primary key default gen_random_uuid(),");
L.push("  user_id uuid not null references auth.users(id) on delete cascade,");
L.push("  exercise_id uuid references public.exercises(id) on delete set null,");
L.push("  workout_day_id uuid references public.workout_days(id) on delete set null,");
L.push("  session_id uuid references public.workout_sessions(id) on delete set null,");
L.push("  date date not null default current_date,");
L.push("  action text not null,");
L.push("  pct numeric,");
L.push("  from_weight numeric,");
L.push("  to_weight numeric,");
L.push("  to_reps int,");
L.push("  remove_set boolean not null default false,");
L.push("  rationale jsonb not null default '[]'::jsonb,");
L.push("  applied boolean not null default false,");
L.push("  created_at timestamptz not null default now()");
L.push(");");
L.push("alter table public.progression_decisions enable row level security;");
L.push("drop policy if exists \"own progression_decisions\" on public.progression_decisions;");
L.push("create policy \"own progression_decisions\" on public.progression_decisions");
L.push("  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);");
L.push("");

// ── Insertar ejercicios nuevos ──
if (toAdd.length) {
  L.push("-- Ejercicios del research que no estaban en el catálogo");
  for (const { slug } of toAdd) {
    L.push(`insert into public.exercises (slug, name, primary_muscle, secondary_muscles, equipment, gear, family, unilateral_support, difficulty, movement_pattern, variation_group)`);
    L.push("values (");
    L.push(`  ${catalogRow(slug)}`);
    L.push(")");
    L.push(`on conflict (slug) where slug is not null do nothing;`);
    L.push("");
  }
}

// ── Enriquecer con investigación ──
L.push("-- Investigación por ejercicio (meta + info del coach)");
for (const { e, slug } of [...toAdd, ...matched]) {
  L.push(`update public.exercises`);
  L.push(`set meta = ${jsonLiteral(e)}::jsonb,`);
  L.push(`    how_to = ${sqlStr(e.setup_and_execution)},`);
  L.push(`    tips = ${sqlStr(tipsText(e))}`);
  L.push(`where slug = ${sqlStr(slug)};`);
  L.push("");
}

writeFileSync(out, L.join("\n"), "utf8");
console.log(`Escrito ${out}`);
console.log(`  enriquecidos (matched): ${matched.length}`);
console.log(`  nuevos en catálogo: ${toAdd.length}`);
console.log(`  omitidos: ${skipped.length}`);
for (const s of skipped) console.log(`    - ${s}`);
