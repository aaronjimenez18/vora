// Divide 0006_bam_catalog.sql en partes pequeñas para pegar en el SQL
// Editor de Supabase (el script completo es demasiado grande para copiar).
//
// Genera (todas idempotentes, pueden repetirse sin duplicar datos):
//   part1: schema + alimentos 1/4
//   part2..4: alimentos 2/4..4/4
//   part5..7: precios 1/3..3/3
//
// Uso: node scripts/split-migration.mjs
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "supabase", "migrations", "0006_bam_catalog.sql");
const outDir = join(root, "supabase", "migrations");

const sql = readFileSync(src, "utf8");

const foodsStart = "insert into public.foods (food_id, name, calories";
const foodsOnConflict = "on conflict (food_id) where food_id is not null do nothing;";
const pricesStart = "insert into public.price_records (food_id, price_record_id";
const pricesFromValues = "from (values";
const pricesTail = ") as v(food_id, price_record_id, price_mxn, price_mxn_low, price_mxn_high, unit, package_size, store_or_market, city_or_region, observed_at, source, price_type, confidence, is_observed_item_price, needs_local_confirmation, notes)\njoin public.foods f on f.food_id = v.food_id\non conflict (food_id, observed_at, price_type) do nothing;";

const schemaAndHeader = sql.slice(0, sql.indexOf(foodsStart));
const foodsInsert = sql.slice(sql.indexOf(foodsStart), sql.indexOf(foodsOnConflict) + foodsOnConflict.length);
const pricesInsert = sql.slice(sql.indexOf(pricesStart), sql.indexOf(pricesTail) + pricesTail.length);

// Normaliza tuplas: quita la coma final (todas terminan en ")").
// Al unirlas con ",\n" se reconstruye exactamente el texto original.
function extractTuples(statement, fromMarker, toMarker) {
  const start = fromMarker ? statement.indexOf(fromMarker) + fromMarker.length : statement.indexOf("\n") + 1;
  const end = toMarker ? statement.lastIndexOf(toMarker) : statement.lastIndexOf("\n");
  const middle = statement.slice(start, end);
  return middle.split("\n").filter((l) => /^\s*\(/.test(l)).map((l) => l.trimEnd().replace(/,$/, ""));
}

function makeChunks(insertHead, tuples, tailLine, parts) {
  const per = Math.ceil(tuples.length / parts);
  const chunks = [];
  for (let i = 0; i < parts; i++) {
    const slice = tuples.slice(i * per, (i + 1) * per);
    if (slice.length === 0) continue;
    chunks.push(`${insertHead}\n${slice.join(",\n")}\n${tailLine}`);
  }
  return chunks;
}

// ── Foods ──
const foodsHead = foodsInsert.slice(0, foodsInsert.indexOf("\n"));
const foodsTailLine = foodsInsert.slice(foodsInsert.lastIndexOf("\n") + 1);
const foodTuples = extractTuples(foodsInsert, null, null);
const foodChunks = makeChunks(foodsHead, foodTuples, foodsTailLine, 4);

// ── Prices ──
const pricesHead = pricesInsert.slice(0, pricesInsert.indexOf(pricesFromValues) + pricesFromValues.length);
const pricesTailLine = pricesInsert.slice(pricesInsert.indexOf("\n) as v(food_id") + 1);
const priceTuples = extractTuples(pricesInsert, pricesFromValues + "\n", null);
const priceChunks = makeChunks(pricesHead, priceTuples, pricesTailLine, 3);

// ── Verificación ──
if (foodTuples.length !== 2045) throw new Error(`foods: ${foodTuples.length} tuplas, esperado 2045`);
if (priceTuples.length !== 2045) throw new Error(`prices: ${priceTuples.length} tuplas, esperado 2045`);
if (foodChunks.reduce((a, c) => a + 1, 0) !== 4) throw new Error("foods: no se generaron 4 partes");
if (priceChunks.reduce((a, c) => a + 1, 0) !== 3) throw new Error("prices: no se generaron 3 partes");

const foodsReassembled = `${foodsHead}\n${foodTuples.join(",\n")}\n${foodsTailLine}`;
if (foodsReassembled !== foodsInsert) throw new Error("Reensamblado de foods no coincide con el original");
const pricesReassembled = `${pricesHead}\n${priceTuples.join(",\n")}\n${pricesTailLine}`;
if (pricesReassembled !== pricesInsert) throw new Error("Reensamblado de precios no coincide con el original");
console.log("OK: 2045 foods + 2045 precios, sentencias reensambladas idénticas al original");

// ── Escribir partes ──
function writePart(name, n, total, body) {
  const file = join(outDir, name);
  writeFileSync(
    file,
    `-- ${name} — parte ${n} de ${total} del catálogo BAM 18.1.1.\n-- Idempotente: puede repetirse sin duplicar datos.\n-- Generado por scripts/split-migration.mjs — no editar a mano.\n${body}`,
    "utf8"
  );
  const kb = Math.round((readFileSync(file, "utf8").length / 1024) * 10) / 10;
  console.log(`${name}  ${kb} KB`);
}

let n = 1;
const total = foodChunks.length + priceChunks.length;
writePart("0006_bam_part1.sql", n++, total, `${schemaAndHeader}${foodChunks[0]}`);
for (let i = 1; i < foodChunks.length; i++) {
  writePart(`0006_bam_part${n}.sql`, n, total, foodChunks[i]);
  n++;
}
for (const c of priceChunks) {
  writePart(`0006_bam_part${n}.sql`, n, total, c);
  n++;
}
console.log(`Total partes: ${total}`);