// Catálogo de alimentos reales (Base de Alimentos de México, BAM 18.1.1)
// curado por palabras clave y transformado a pools que el generador de dieta
// puede usar en lugar de las plantillas fijas de foods.ts.
//
// El catálogo BAM es ruidoso (categorías oficiales incluyen refrescos, crepas,
// comida de bebé, etc.), así que aquí se selecciona por lista de inclusión por
// rol y una lista negra de basura/preparados, y se limpian los nombres.

import type { FoodCategory, FoodTemplate } from "./foods";

export interface CatalogFood {
  food_id: string;
  name: string;
  bamCategory: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  allergens: string[];
  pricePer100g: number | null;
}

const JUNK =
  /ALIMENTO PARA BEBE|GERBER|PREPARACION ESTANDARIZADA|COCTEL|CON AZUCAR|ENDULZADA|EN ALMIBAR|EN VINAGRE|MERMELADA|JUGO|NECTAR|REFRESCO|CERVEZA|GASEOSA|AGUA DE |TE ,|CAFE|ADEREZO|SALSA|CALDO|SOPA|MOLE|CONDENSADA|MATERNIZADA|INFANTIL|PAY |BOCADILLO|ATOLE|LICUADO|FRAPE|DULCE|MAGDALENA|PANQUE|CHURRO|TAMAL|QUESADILLA|GORDA|TAQUITO|TORTA|HOT CAKE|DONA|GELATINA|HELADO|PALETA|CREMA |CHOCOLATE|COCOA|GRANOLA|FRITURAS|STICKS|HOJUELAS|EN ACEITE|AHUMAD[OA]S?|EMPANIZADO|AL CARBON|ROSTIZADO|FRITA|FRITO|MILANESA|CECINA|CANAL|CON HUESO|SEMIGRASOSA|GRASOSA|SALCHICHA|JAMON|CARNERO|CABEZA|PATAS|EMBOTELLADA|CON PROBIOTICOS|BEBER|ACTIVIA|ACTIMEL|BIO4|SVELTY|CHAMBURSY|TODOS LOS SABORES|VITALINEA|KELLOGG|QUAKER|NESTLE|WINGS|ALITAS|TIPO ADES|NURSOY|ADES|LICHE|SABORIZADA|AHUMADAS|TIPO |PROMEDIO|CONSERVA|RESERVA|EXTRA |SELECTA|CENTENO|1\/3/;

const MEAT_WORDS =
  /\b(POLLO|RES|CERDO|CARNERO|BORREGO|TERNERA|VACUNO|PAVO|CORDERO|BISTEC|AGUAYON|AGUJAS|PULPA|LOMO|CHULETA|CARNE|CHORIZO|LONGANIZA|MONDONGO|TRIPA|PANCITA|HIGADO|SESOS|MACHITO|MACHETE|PUERCO|SALCHICHONES|COSTILLA|CODILLO|ESPALDILLA|SIRLOIN|ARACHE|DIEZMILO)\b/;

const FISH_WORDS =
  /\b(ATUN|SARDINAS?|PESCADO|CAMARONES?|SALMON|TILAPIA|MOJARRA|JUREL|CHARALES|GUACHINANGO|SIERRA|BARBON|OSTIONES?|ALMEJA|MEJILLON|PULPO|CALAMAR|LOBINA|HUACHINANGO)\b/;

const EGG_WORDS = /\b(HUEVO|CLARA DE HUEVO)\b/;

const DAIRY_WORDS =
  /\b(LECHE|YOGUR|YOGURT|QUESO|REQUESON|MANTEQUILLA|CREMA|ALPURA|LALA|KEFIR)\b/;

const PROTEIN_KEEP = [
  /^POLLO, (PECHUGA|PIERNA|MUSLO)/,
  /^RES, (CARNE MAGRA|AGUAYON|AGUJAS|BISTEC|CARNE COCIDA|BILL|PULPA)/,
  /^CERDO, (CARNE MAGRA|CARNE MOLIDA|CARNE COCIDA|LOMO|PIERNA|CHULETA|AGUAYON)/,
  /^HUEVO DE GALLINA$/,
  /^CLARA DE HUEVO/,
  /^ATUN/,
  /^SARDINAS?/,
  /^PESCADO, /,
  /^FRIJOL( |$)/,
  /^LENTEJAS/,
  /^GARBANZO( |$)/,
  /^HABA/,
  /^ALUBIA/,
  /SOYA TEXTURIZADA|CARNE DE SOYA|PROTEINA DE SOYA/,
  /^YOGUR/,
  /^REQUESON/,
  /^QUESO (PANELA|FRESCO|OAXACA|CHIHUAHUA|MANCHEGO|COTIJA|TIPO PANELA)/,
  /^LECHE (DESCREMADA|SEMIDESCREMADA|ENTER|LIGHT)/,
];

const STAPLE_KEEP = [
  /^ARROZ/,
  /^AVENA/,
  /^TORTILLA/,
  /^PAN /,
  /^PAPA/,
  /^CAMOTE/,
  /^ELOTE/,
  /^PASTA/,
];

const PRODUCE_KEEP = [
  /^PLATANO/,
  /^MANZANA/,
  /^NARANJA/,
  /^PAPAYA/,
  /^MELON/,
  /^SANDIA/,
  /^GUAYABA/,
  /^MANGO/,
  /^FRESA/,
  /^JITOMATE/,
  /^CEBOLLA/,
  /^ZANAHORIA/,
  /^BROCOLI/,
  /^CHAYOTE/,
  /^NOPAL/,
  /^CALABAZA/,
  /^LECHUGA/,
  /^ESPINACA/,
  /^PEPINO/,
  /^HONGOS/,
  /^CHAMPIÑONES/,
  /^PIMIENTO MORRON/,
  /^CHILE (JALAPENO|POBLANO|VERDE)/,
  /^COLIFLOR/,
  /^AGUACATE/,
];

const FAT_KEEP = [
  /^CACAHUATE/,
  /^NUEZ/,
  /^ALMENDRAS/,
  /^ACEITE, DE OLIVA/,
  /^ACEITE, DE SOYA/,
  /^ACEITE, DE CANOLA/,
  /^ACEITE, DE GIRASOL/,
  /^SEMILLA DE CALABAZA/,
  /^SEMILLA DE GIRASOL|^PIPAS/,
  /^AGUACATE/,
];

const POOL_ROLE: Record<"protein" | "staple" | "produce" | "fat", RegExp[]> = {
  protein: PROTEIN_KEEP,
  staple: STAPLE_KEEP,
  produce: PRODUCE_KEEP,
  fat: FAT_KEEP,
};

const TITLE_CONNECTORS = new Set([
  "de", "del", "la", "las", "los", "el", "en", "y", "o", "e", "u", "con",
  "sin", "para", "por", "a", "al", "se", "su", "que", "como", "o",
]);

function norm(s: string): string {
  return (s ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function titleCase(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && TITLE_CONNECTORS.has(w)) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/\s+/g, " ");
}

const NAME_FIXES: Array<[RegExp, string]> = [
  [/Yogur de vaso bajo en grasa o light/i, "Yogur natural bajo en grasa"],
  [/Yogur de vaso bajo en grasa o natural o con fruta/i, "Yogur natural bajo en grasa"],
  [/Yogur para beber bajo en grasa o light/i, "Yogur para beber bajo en grasa"],
  [/Yogur para beber bajo en grasa o natural o con fruta/i, "Yogur para beber bajo en grasa"],
  [/Yogur de vaso entero/i, "Yogur entero"],
  [/^Papas/i, "Papa"],
  [/^Camote/i, "Camote"],
];

// Bases de una sola palabra cuyo "X, Y" se reescribe a "Y de X".
const SWAP_BASES = new Set([
  "POLLO", "RES", "CERDO", "CARNERO", "ATUN", "SARDINA", "SARDINAS",
  "PESCADO", "FRIJOL", "FRIJOLES", "LENTEJAS", "GARBANZO", "HABA",
  "ALUBIA", "YOGUR", "QUESO", "LECHE", "REQUESON", "PAPA", "CAMOTE",
  "ELOTE", "CHILE", "HONGOS", "CHAMPIÑONES", "MANGO", "GUAYABA",
]);

function cleanName(name: string): string {
  const upper = norm(name);
  const commaIdx = upper.indexOf(",");
  const left = commaIdx >= 0 ? upper.slice(0, commaIdx).trim() : upper;
  const right = commaIdx >= 0 ? upper.slice(commaIdx + 1).trim() : "";

  let out = left;
  if (right) {
    const swap =
      SWAP_BASES.has(left) &&
      !/^DE /i.test(right) &&
      !/^EN /i.test(right) &&
      right.split(/\s+/).length <= 6;
    out = swap ? `${right} de ${left}` : left;
  }

  // Corta sufijos de marca/peso que quedaron pegados al nombre.
  out = out
    .replace(/\b(0?%|LIGHT|ALPURA|LALA|O%)\b/gi, " ")
    .replace(/\s+[0-9]+\s*(G|ML|KG|L|PZA|OZ)?\b/gi, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let result = titleCase(out).trim();
  result = result
    .replace(/\s*Industrializados?\s*$/i, "")
    .replace(/\s*No preparada?\s*$/i, "")
    .replace(/\s+sin grasa ni hueso$/i, "");
  for (const [re, repl] of NAME_FIXES) {
    result = result.replace(re, repl);
  }
  return result.trim() || titleCase(name);
}

function isDisliked(name: string, disliked: string[]): boolean {
  if (!disliked.length) return false;
  const n = norm(name);
  return disliked.some((d) => {
    const t = norm(d);
    if (!t || t.length < 2) return false;
    return n.includes(t) || name.toLowerCase().includes(d.toLowerCase());
  });
}

function isLiked(name: string, liked: string[]): boolean {
  if (!liked.length) return false;
  const n = norm(name);
  return liked.some((d) => {
    const t = norm(d);
    return t.length >= 2 && n.includes(t);
  });
}

function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function buildCatalogPools(
  catalog: CatalogFood[],
  profile: {
    diet_style?: string | null;
    dietary_prefs?: string | null;
    allergies?: string[];
    foods_liked?: string[];
    foods_disliked?: string[];
    user_id?: string;
    sex?: string | null;
    age?: number | null;
    goal?: string | null;
  }
): { protein: FoodTemplate[]; staple: FoodTemplate[]; produce: FoodTemplate[]; fat: FoodTemplate[] } {
  const style = profile.diet_style ?? profile.dietary_prefs ?? "";
  const styleLower = style.toLowerCase();
  const allergies = profile.allergies ?? [];
  const disliked = profile.foods_disliked ?? [];
  const liked = profile.foods_liked ?? [];

  const categoryForRole: Record<string, FoodCategory> = {
    protein: "animal_protein",
    staple: "grain",
    produce: "vegetable",
    fat: "fat_and_protein",
  };

  const pools: Record<"protein" | "staple" | "produce" | "fat", FoodTemplate[]> = {
    protein: [],
    staple: [],
    produce: [],
    fat: [],
  };

  for (const food of catalog) {
    if (!food.calories || food.calories <= 0) continue;
    const n = norm(food.name);

    // Las categorías BAM son poco fiables (p. ej. "CARNE MAGRA" sale como
    // oils_fats); las flags vegan/vegetariano se derivan del nombre.
    const isMeat = MEAT_WORDS.test(n);
    const isFish = FISH_WORDS.test(n);
    const isEgg = EGG_WORDS.test(n);
    const isDairy = DAIRY_WORDS.test(n);
    const vegan = !isMeat && !isFish && !isEgg && !isDairy;
    const vegetarian = !isMeat && !isFish;

    if (styleLower.startsWith("vegan") && !vegan) continue;
    if (styleLower.startsWith("vegetarian") && !vegetarian) continue;
    if (styleLower.startsWith("pescatarian") && isMeat) continue;
    if (allergies.some((a) => (food.allergens ?? []).includes(a))) continue;
    if (isDisliked(food.name, disliked)) continue;
    if (JUNK.test(n)) continue;

    for (const role of Object.keys(POOL_ROLE) as Array<keyof typeof POOL_ROLE>) {
      const keeps = POOL_ROLE[role];
      if (!keeps.some((re) => re.test(n))) continue;

      const clean = cleanName(food.name);
      if (!clean) continue;
      if (pools[role].some((t) => t.slug === food.food_id)) break;

      pools[role].push({
        slug: food.food_id,
        food_id: food.food_id,
        name: clean,
        category: categoryForRole[role],
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        micronutrients: [],
        allergens: food.allergens ?? [],
        commonUnits: ["100 g"],
        substitutions: [],
        tags: [],
        nutrientSource: "BAM 18.1.1, INSP/INCMNSZ",
        servingG: 100,
        vegan,
        vegetarian,
        priceMXN: food.pricePer100g,
        bamPriceKey: food.food_id,
      });
      break;
    }
  }

  // Ordena por calidad y luego prioriza los favoritos del usuario.
  const rank = (t: FoodTemplate, role: keyof typeof POOL_ROLE): number => {
    const score =
      role === "protein"
        ? t.protein / Math.max(t.calories, 1) * 1000
        : role === "fat"
          ? (t.protein / Math.max(t.calories, 1)) * 1000 + (t.fiber > 0 ? 30 : 0)
          : t.fiber;
    return isLiked(t.name, liked) ? score + 1000 : score;
  };

  const CAPS: Record<keyof typeof POOL_ROLE, number> = {
    protein: 14,
    staple: 10,
    produce: 14,
    fat: 8,
  };

  for (const role of Object.keys(pools) as Array<keyof typeof pools>) {
    pools[role].sort((a, b) => rank(b, role) - rank(a, role));
    pools[role] = pools[role].slice(0, CAPS[role]);
  }

  return pools;
}

export function catalogSeed(profile: { user_id?: string; sex?: string | null; age?: number | null; goal?: string | null }): number {
  return hashSeed(`${profile.user_id ?? ""}|${profile.sex ?? ""}|${profile.age ?? ""}|${profile.goal ?? ""}`);
}
