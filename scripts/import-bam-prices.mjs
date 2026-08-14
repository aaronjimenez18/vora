// Genera supabase/migrations/0006_bam_catalog.sql a partir de
// catalog-prices.db (Base de Alimentos de México, BAM 18.1.1, INSP/INCMNSZ).
//
// - Alimentos: 2045 filas en public.foods (source = 'bam') con nutrientes
//   completos por 100 g (nutrients jsonb + macros + tags de micronutrientes).
// - Precios: 2045 registros en public.price_records. Capa CDMX de referencia
//   al 2026-08-14 (rangos SNIIM/minoristas, price_type
//   'estimated_reference_range', confidence 'low_to_medium').
// - Política: el precio es un registro fechado por ciudad/tienda/presentación;
//   no es un precio nacional permanente (foods.price_mxn queda null).
// - Idempotente: on conflict (food_id) / (food_id, observed_at, price_type).
// Uso: node scripts/import-bam-prices.mjs
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "supabase", "migrations", "0006_bam_catalog.sql");

const db = JSON.parse(
  readFileSync(join(root, "supabase", "migrations", "catalog-prices.db"), "utf8")
);
const foods = db.foods ?? [];

const esc = (s) => (s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "''");
const sqlStr = (s) => `'${esc(s)}'`;
const jsonLiteral = (obj) => sqlStr(JSON.stringify(obj));
const num = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : "NULL";
};

const MICRO_TAGS = {
  calcium_mg: "calcium",
  iron_mg: "iron",
  magnesium_mg: "magnesium",
  zinc_mg: "zinc",
  potassium_mg: "potassium",
  sodium_mg: "sodium",
  phosphorus_mg: "phosphorus",
  copper_mg: "copper",
  manganese_mg: "manganese",
  iodine_ug: "iodine",
  selenium_ug: "selenium",
  vitamin_a_rae_ug: "vitamin_a",
  vitamin_c_mg: "vitamin_c",
  vitamin_d_iu: "vitamin_d",
  vitamin_e_mg: "vitamin_e",
  vitamin_k_ug: "vitamin_k",
  thiamin_mg: "thiamin",
  riboflavin_mg: "riboflavin",
  niacin_mg: "niacin",
  pantothenic_acid_mg: "pantothenic_acid",
  vitamin_b6_mg: "vitamin_b6",
  folic_acid_ug: "folate",
  food_folate_ug: "folate",
  folate_dfe_ug: "folate",
  vitamin_b12_ug: "vitamin_b12",
  choline_mg: "choline",
};

function micronutrientTags(nutrients) {
  const tags = [];
  for (const [key, value] of Object.entries(nutrients ?? {})) {
    const tag = MICRO_TAGS[key];
    if (tag && Number(value) > 0 && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

const CONNECTORS = new Set([
  "de", "del", "la", "las", "los", "el", "en", "y", "o", "e", "u", "con",
  "sin", "para", "por", "a", "al", "se", "su", "que", "como", "promedio",
]);

function titleCase(s) {
  return (s ?? "")
    .toLowerCase()
    .split(/ +/)
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && CONNECTORS.has(w)) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function foodValues(f) {
  const n = f.nutrients ?? {};
  return [
    sqlStr(f.food_id),
    sqlStr(titleCase(f.name_es)),
    num(n.energy_kcal),
    num(n.protein_g),
    num(n.carbohydrates_g),
    num(n.fat_g),
    num(n.fiber_g),
    jsonLiteral(micronutrientTags(n)),
    jsonLiteral(f.allergens ?? []),
    jsonLiteral((f.portion_options ?? [{ amount_g: 100, label: "100 g" }]).map((p) => p.label)),
    sqlStr(f.category),
    sqlStr(f.nutrient_data_quality ?? "Base de Alimentos de México (BAM) 18.1.1, INSP/INCMNSZ, 2019"),
    sqlStr("bam"),
    sqlStr(f.bam_code ?? ""),
    sqlStr(f.local_price_key ?? ""),
    sqlStr(f.preparation_state ?? "as_reported_by_bam"),
    f.price_update_required === true ? "true" : "false",
    jsonLiteral(n),
  ].join(", ");
}

function priceValues(f) {
  const r = (f.price_records ?? [])[0];
  if (!r) return null;
  const ref =
    r.price_mxn_reference != null
      ? num(r.price_mxn_reference)
      : r.price_mxn_low != null
        ? num(r.price_mxn_low)
        : "NULL";
  return [
    sqlStr(f.food_id),
    sqlStr(r.price_record_id ?? `cdmx_est_${f.food_id}`),
    ref,
    num(r.price_mxn_low),
    num(r.price_mxn_high),
    sqlStr(r.unit ?? "kg"),
    num(r.package_size),
    sqlStr(r.store_or_market ?? "rango general; SNIIM y minoristas"),
    sqlStr(r.city_or_region ?? "Ciudad de México y área metropolitana"),
    sqlStr(r.observed_at ?? "2026-08-14"),
    sqlStr(r.source ?? "SNIIM/Profeco/supermercado CDMX: rango orientativo de referencia; confirmar por tienda y fecha"),
    sqlStr(r.price_type ?? "estimated_reference_range"),
    sqlStr(r.confidence ?? "low_to_medium"),
    r.is_observed_item_price === true ? "true" : "false",
    r.needs_local_confirmation === false ? "false" : "true",
    sqlStr(r.notes ?? "Rango orientativo para presupuesto; sustituir por precio de tienda/mercado cuando esté disponible."),
  ].join(", ");
}

const priced = foods.filter((f) => (f.price_records ?? []).length > 0);

const L = [];
L.push("-- ─────────────────────────────────────────────────────────────");
L.push("-- VORA — Catálogo BAM 18.1.1 + precios CDMX (catálogo completo)");
L.push("-- Generado por scripts/import-bam-prices.mjs — no editar a mano.");
L.push("-- Fuente: catalog-prices.db — Base de Alimentos de México (BAM)");
L.push("-- 18.1.1, INSP/INCMNSZ 2019. Capa de precios: rangos de referencia");
L.push("-- estimados CDMX al 2026-08-14 (SNIIM/Profeco/minoristas).");
L.push("-- Política de precios: el precio vive en price_records (fechado por");
L.push("-- ciudad/tienda/presentación); foods.price_mxn queda null. Additivo,");
L.push("-- idempotente y compatible con 0001/0005 (funciona con o sin ellos).");
L.push("-- ─────────────────────────────────────────────────────────────");
L.push("");

// ── Schema: columnas BAM en foods ──
L.push("-- Alimentos BAM: columnas del catálogo");
L.push("alter table public.foods add column if not exists bam_code text;");
L.push("alter table public.foods add column if not exists local_price_key text;");
L.push("alter table public.foods add column if not exists preparation_state text;");
L.push("alter table public.foods add column if not exists price_update_required boolean not null default false;");
L.push("alter table public.foods add column if not exists nutrients jsonb;");
L.push("alter table public.foods drop constraint if exists foods_source_check;");
L.push("alter table public.foods add constraint foods_source_check check (source in ('seed', 'usda', 'user', 'bam'));");
L.push("");

// ── Schema: price_records con rangos y tipo de capa de referencia ──
L.push("-- price_records: rangos de referencia (low/high/reference) y capa CDMX");
L.push("alter table public.price_records add column if not exists price_mxn_low numeric check (price_mxn_low >= 0);");
L.push("alter table public.price_records add column if not exists price_mxn_high numeric check (price_mxn_high >= 0);");
L.push("alter table public.price_records add column if not exists price_mxn_reference numeric check (price_mxn_reference >= 0);");
L.push("alter table public.price_records add column if not exists price_record_id text;");
L.push("alter table public.price_records add column if not exists is_observed_item_price boolean not null default false;");
L.push("alter table public.price_records add column if not exists needs_local_confirmation boolean not null default true;");
L.push("alter table public.price_records drop constraint if exists price_records_price_type_check;");
L.push("alter table public.price_records add constraint price_records_price_type_check");
L.push("  check (price_type in ('retail', 'wholesale', 'promotional', 'user_entered', 'estimated', 'estimated_reference_range'));");
L.push("alter table public.price_records drop constraint if exists price_records_confidence_check;");
L.push("alter table public.price_records add constraint price_records_confidence_check");
L.push("  check (confidence in ('high', 'medium', 'low', 'low_to_medium'));");
L.push("create unique index if not exists price_records_food_observed_type_key");
L.push("  on public.price_records (food_id, observed_at, price_type);");
L.push("");

// ── Data: 2045 alimentos BAM ──
L.push(`-- Alimentos BAM (source = 'bam'), ${foods.length} filas.`);
L.push("insert into public.foods (food_id, name, calories, protein_g, carbs_g, fat_g, fiber_g, micronutrients, allergens, common_units, category, nutrient_source, source, bam_code, local_price_key, preparation_state, price_update_required, nutrients) values");
for (const f of foods) {
  L.push(`  (${foodValues(f)}),`);
}
L[L.length - 1] = L[L.length - 1].replace(/,$/, "");
L.push("on conflict (food_id) where food_id is not null do nothing;");
L.push("");

// ── Data: 2045 precios CDMX ──
L.push(`-- Precios CDMX de referencia (rangos), ${priced.length} registros.`);
L.push("insert into public.price_records (food_id, price_record_id, price_mxn, price_mxn_low, price_mxn_high, unit, package_size, store_or_market, city_or_region, observed_at, source, price_type, confidence, is_observed_item_price, needs_local_confirmation, notes, created_by)");
L.push("select f.id, v.price_record_id, v.price_mxn, v.price_mxn_low, v.price_mxn_high, v.unit, v.package_size, v.store_or_market, v.city_or_region, v.observed_at, v.source, v.price_type, v.confidence, v.is_observed_item_price, v.needs_local_confirmation, v.notes, null");
L.push("from (values");
for (const f of priced) {
  const pv = priceValues(f);
  if (!pv) continue;
  L.push(`  (${pv}),`);
}
L[L.length - 1] = L[L.length - 1].replace(/,$/, "");
L.push(") as v(food_id, price_record_id, price_mxn, price_mxn_low, price_mxn_high, unit, package_size, store_or_market, city_or_region, observed_at, source, price_type, confidence, is_observed_item_price, needs_local_confirmation, notes)");
L.push("join public.foods f on f.food_id = v.food_id");
L.push("on conflict (food_id, observed_at, price_type) do nothing;");
L.push("");

writeFileSync(out, L.join("\n"), "utf8");
console.log(`Escrito ${out}`);
console.log(`  alimentos BAM: ${foods.length}`);
console.log(`  precios: ${priced.length}`);
