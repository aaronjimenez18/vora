import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VisionFood } from "@/app/types";

export const dynamic = "force-dynamic";

const CANDIDATE_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_VISION_MODEL,
      process.env.GEMINI_MODEL,
      "gemini-3.1-flash-lite",
      "gemini-3.6-flash",
    ].filter((m): m is string => Boolean(m) && typeof m === "string")
  )
);

const PROMPT = [
  "Eres un nutricionista que estima macros de alimentos para una app de registro en español de México.",
  "El usuario escribe un término de búsqueda. Devuelve de 1 a 4 alimentos o ingredientes relacionados (más la preparación/variante si aplica) con sus macros APROXIMADOS POR 100 GRAMOS, o por una porción típica si la unidad no es gramos.",
  "Reglas:",
  "- Nombres en español de México.",
  "- Si el término es un ingrediente suelto (ej. 'arroz'), devuelve las variantes más usadas (arroz blanco, arroz integral, arroz rojo) e incluye el ingrediente base.",
  "- Si es una preparación con varios ingredientes, estima macros razonables por 100g del plato.",
  "- En 'grams' indica la porción de referencia: 100 para gramos, o la porción típica (ej. 60g huevo, 40g tortilla).",
  "- Macros consistentes: calorías ≈ 4*proteína + 4*carbos + 9*grasas.",
  "- Fibra y 2-4 micronutrientes más relevantes en español.",
  "Devuelve SOLO JSON con este esquema:",
  '{"foods": [{"name": "arroz blanco", "grams": 100, "calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3, "fiber_g": 0.4, "micros": ["Vitamina B1", "Manganeso"]}]}',
].join("\n");

function sanitizeNumber(v: unknown, round = false): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return round ? Math.round(n) : Math.round(n * 10) / 10;
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No hay clave de Gemini configurada (GEMINI_API_KEY)." },
      { status: 503 }
    );
  }

  let query: string;
  try {
    const body = await req.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Escribe un alimento para buscar." }, { status: 400 });
  }

  let rawText = "";
  let lastErrorDetail = "";

  for (const model of CANDIDATE_MODELS) {
    const startedAt = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${PROMPT}\n\nBúsqueda del usuario: "${query}"` }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);

      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[food-lookup] model ${model} -> HTTP ${res.status} in ${elapsed}s`);

      if (res.ok) {
        const j = await res.json();
        rawText = (j?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim();
        if (rawText) break;
      } else {
        const errText = await res.text();
        console.error(`Gemini food-lookup error [model: ${model}, status: ${res.status}]:`, errText.slice(0, 500));
        lastErrorDetail = `Modelo ${model} devolvió estado ${res.status}.`;
      }
    } catch (e) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.error(`Gemini food-lookup fetch failed [model: ${model}] after ${elapsed}s:`, e);
      lastErrorDetail = `Error de conexión o timeout con modelo ${model} (${elapsed}s).`;
    }
  }

  if (!rawText) {
    return NextResponse.json(
      { error: `Gemini no respondió. ${lastErrorDetail} Revisa GEMINI_API_KEY.` },
      { status: 502 }
    );
  }

  const parsed = extractJson(rawText) as { foods?: unknown[] } | null;
  const raw = Array.isArray(parsed?.foods) ? parsed!.foods : [];

  const foods = (
    raw
      .map((f) => {
        const o = (f ?? {}) as Record<string, unknown>;
        const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "";
        if (!name) return null;
        return {
          name,
          grams: sanitizeNumber(o.grams) || 100,
          calories: sanitizeNumber(o.calories, true),
          protein_g: sanitizeNumber(o.protein_g),
          carbs_g: sanitizeNumber(o.carbs_g),
          fat_g: sanitizeNumber(o.fat_g),
          fiber_g: sanitizeNumber(o.fiber_g),
          micros: Array.isArray(o.micros)
            ? (o.micros as unknown[]).filter((m): m is string => typeof m === "string").slice(0, 4)
            : undefined,
        } as VisionFood;
      })
      .filter((f) => f !== null) ?? []
  ) as VisionFood[];

  return NextResponse.json({ foods });
}
