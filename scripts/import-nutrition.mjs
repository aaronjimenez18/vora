// Genera supabase/migrations/0005_nutrition.sql a partir de la
// investigación de nutrición:
//   - foods-catalog.db: 18 alimentos USDA (valores por 100 g/100 ml,
//     micronutrientes, alérgenos, unidades, sustituciones, price policy)
//   - nutrition-calcule.db / nutrition-rules.db: fórmulas, macros, budget
//   - nutrition-onboarding.db: columnas de onboarding en user_profile
// Uso: node scripts/import-nutrition.mjs
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "supabase", "migrations", "0005_nutrition.sql");

const catalog = JSON.parse(
  readFileSync(join(root, "supabase", "migrations", "foods-catalog.db"), "utf8")
);

const esc = (s) => (s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
const sqlStr = (s) => `'${esc(s)}'`;
const jsonLiteral = (obj) => sqlStr(JSON.stringify(obj));

const kcal = (f) =>
  Math.round(f.protein_g * 4 + f.carbohydrate_g * 4 + f.fat_g * 9);

function foodValues(f) {
  return [
    sqlStr(f.food_id),
    sqlStr(f.name_es),
    kcal(f),
    f.protein_g,
    f.carbohydrate_g,
    f.fat_g,
    f.fiber_g,
    jsonLiteral(f.micronutrients),
    jsonLiteral(f.allergens),
    jsonLiteral(f.common_units),
    sqlStr(f.category),
    sqlStr(f.nutrient_source),
  ].join(", ");
}

const L = [];
L.push("-- ─────────────────────────────────────────────────────────────");
L.push("-- VORA — Nutrición (catálogo USDA + precio + onboarding)");
L.push("-- Generado por scripts/import-nutrition.mjs — no editar a mano.");
L.push("-- Fuente: foods-catalog.db (18 alimentos USDA por 100 g/100 ml).");
L.push("-- Política de precios: no fijar precio nacional; el precio vive en");
L.push("-- price_records (ciudad/tienda/presentación/fecha). Additivo e");
L.push("-- idempotente: funciona con o sin 0001/0003 aplicadas.");
L.push("-- ─────────────────────────────────────────────────────────────");
L.push("");

// ── Schema: catálogo de alimentos (extiende public.foods) ──
L.push("-- Catálogo: columnas del foods-catalog.db");
L.push("alter table public.foods add column if not exists food_id text;");
L.push("alter table public.foods add column if not exists fiber_g numeric;");
L.push("alter table public.foods add column if not exists micronutrients jsonb not null default '[]'::jsonb;");
L.push("alter table public.foods add column if not exists allergens jsonb not null default '[]'::jsonb;");
L.push("alter table public.foods add column if not exists common_units jsonb not null default '[]'::jsonb;");
L.push("alter table public.foods add column if not exists nutrient_source text;");
L.push("create unique index if not exists foods_food_id_key on public.foods (food_id) where food_id is not null;");
L.push("");

// ── Seed: 18 alimentos USDA ──
L.push("-- Catálogo USDA (source = 'usda'), sin precio fijo (price_mxn null)");
L.push("insert into public.foods (food_id, name, calories, protein_g, carbs_g, fat_g, fiber_g, micronutrients, allergens, common_units, category, nutrient_source, source) values");
for (const f of catalog.foods) {
  L.push(`  (${foodValues(f)}, 'usda'),`);
}
L[L.length - 1] = L[L.length - 1].replace(/,$/, "");
L.push("on conflict (food_id) where food_id is not null do nothing;");
L.push("");

// ── Tabla de precios (registro fechado por ciudad/tienda/presentación) ──
L.push("-- price_records: precio no constante, fechado y por ubicación");
L.push("create table if not exists public.price_records (");
L.push("  id uuid primary key default gen_random_uuid(),");
L.push("  food_id uuid not null references public.foods(id) on delete cascade,");
L.push("  price_mxn numeric not null check (price_mxn >= 0),");
L.push("  unit text not null,");
L.push("  package_size numeric,");
L.push("  store_or_market text,");
L.push("  city_or_region text,");
L.push("  observed_at date not null default current_date,");
L.push("  source text,");
L.push("  price_type text not null default 'retail' check (price_type in ('retail', 'wholesale', 'promotional', 'user_entered', 'estimated')),");
L.push("  confidence text not null default 'low' check (confidence in ('high', 'medium', 'low')),");
L.push("  notes text,");
L.push("  created_by uuid references auth.users(id) on delete set null,");
L.push("  created_at timestamptz not null default now()");
L.push(");");
L.push("alter table public.price_records enable row level security;");
L.push("drop policy if exists \"read price_records\" on public.price_records;");
L.push("create policy \"read price_records\" on public.price_records");
L.push("  for select using (auth.role() = 'authenticated');");
L.push("drop policy if exists \"write own price_records\" on public.price_records;");
L.push("create policy \"write own price_records\" on public.price_records");
L.push("  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);");
L.push("");

// ── Schema: onboarding de nutrición en user_profile ──
L.push("-- Onboarding de nutrición (nutrition-onboarding.db)");
L.push("alter table public.user_profile add column if not exists sex_for_equation text check (sex_for_equation in ('male', 'female'));");
L.push("alter table public.user_profile add column if not exists occupation_activity text;");
L.push("alter table public.user_profile add column if not exists steps_per_day int check (steps_per_day >= 0);");
L.push("alter table public.user_profile add column if not exists strength_days_per_week int check (strength_days_per_week between 0 and 7);");
L.push("alter table public.user_profile add column if not exists running_days_per_week int check (running_days_per_week between 0 and 7);");
L.push("alter table public.user_profile add column if not exists average_session_minutes int check (average_session_minutes between 0 and 600);");
L.push("alter table public.user_profile add column if not exists training_intensity text check (training_intensity in ('low', 'moderate', 'high'));");
L.push("alter table public.user_profile add column if not exists cardio_minutes_per_week int check (cardio_minutes_per_week >= 0);");
L.push("alter table public.user_profile add column if not exists budget_amount_mxn numeric check (budget_amount_mxn >= 0);");
L.push("alter table public.user_profile add column if not exists budget_period text check (budget_period in ('per_day', 'per_week', 'per_month'));");
L.push("alter table public.user_profile add column if not exists budget_includes_supplements boolean;");
L.push("alter table public.user_profile add column if not exists budget_includes_eating_out boolean;");
L.push("alter table public.user_profile add column if not exists household_size int check (household_size between 1 and 20);");
L.push("alter table public.user_profile add column if not exists shared_foods boolean;");
L.push("alter table public.user_profile add column if not exists shopping_frequency text check (shopping_frequency in ('daily', 'weekly', 'biweekly', 'monthly'));");
L.push("alter table public.user_profile add column if not exists store_preferences text;");
L.push("alter table public.user_profile add column if not exists diet_style text check (diet_style in ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other'));");
L.push("alter table public.user_profile add column if not exists allergies jsonb not null default '[]'::jsonb;");
L.push("alter table public.user_profile add column if not exists intolerances jsonb not null default '[]'::jsonb;");
L.push("alter table public.user_profile add column if not exists religious_restrictions text;");
L.push("alter table public.user_profile add column if not exists foods_liked jsonb not null default '[]'::jsonb;");
L.push("alter table public.user_profile add column if not exists foods_disliked jsonb not null default '[]'::jsonb;");
L.push("alter table public.user_profile add column if not exists cooking_time_minutes int check (cooking_time_minutes between 0 and 600);");
L.push("alter table public.user_profile add column if not exists kitchen_equipment jsonb not null default '[]'::jsonb;");
L.push("alter table public.user_profile add column if not exists meals_per_day int check (meals_per_day between 1 and 8);");
L.push("alter table public.user_profile add column if not exists snacks_per_day int check (snacks_per_day between 0 and 6);");
L.push("alter table public.user_profile add column if not exists health_flags jsonb not null default '[]'::jsonb;");
L.push("alter table public.user_profile add column if not exists output_preferences jsonb not null default '[]'::jsonb;");
L.push("");

// ── Schema: fibra en planes, comidas y logs ──
L.push("-- Fibra dietética (DRI: fibra incluida en el seguimiento)");
L.push("alter table public.diet_plans add column if not exists fiber_g numeric;");
L.push("alter table public.diet_meals add column if not exists fiber_g numeric;");
L.push("alter table public.meal_logs add column if not exists fiber_g numeric;");
L.push("alter table public.diet_plans add column if not exists screening jsonb;");
L.push("");

writeFileSync(out, L.join("\n"), "utf8");
console.log(`Escrito ${out}`);
console.log(`  alimentos USDA: ${catalog.foods.length}`);
