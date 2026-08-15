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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const PROMPT = [
  "Eres un nutricionista que analiza fotos de comida para una app de registro de macros.",
  "Observa la foto y detecta CADA alimento o ingrediente distinto que sea visible.",
  "Para cada alimento estima una porción realista en gramos y sus macros aproximados PARA ESA porción.",
  "Incluye también la fibra y los 2-4 micronutrientes más relevantes (vitaminas/minerales) en español.",
  "Reglas:",
  "- Nombres en español de México (ej. 'arroz blanco', 'pollo a la plancha', 'frijoles refritos').",
  "- Si hay salsa, aderezo o bebida visible, cuéntalos como alimentos aparte.",
  "- NO inventes alimentos que no se ven en la foto.",
  "- Los macros deben ser consistentes: calorías ≈ 4*proteína + 4*carbos + 9*grasas.",
  "- Si la imagen no contiene comida, devuelve {\"foods\": []}.",
  "Devuelve SOLO JSON con este esquema:",
  '{"foods": [{"name": "arroz blanco", "grams": 150, "calories": 195, "protein_g": 4, "carbs_g": 43, "fat_g": 0.5, "fiber_g": 1, "micros": ["Vitamina B3", "Manganeso"]}]}',
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

  let image: string;
  try {
    const body = await req.json();
    image = typeof body?.image === "string" ? body.image : "";
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const match = image.match(/^data:([a-z0-9./+-]+);base64,(.+)$/i);
  if (!match) {
    return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
  }
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  if (!ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa JPG, PNG o WEBP." },
      { status: 400 }
    );
  }
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "La imagen es muy pesada (máx. 10 MB)." }, { status: 400 });
  }

  let rawText = "";
  let lastErrorDetail = "";

  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: PROMPT },
                  { inlineData: { mimeType, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(45000),
        }
      );

      if (res.ok) {
        const j = await res.json();
        rawText = (j?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim();
        if (rawText) {
          // Successfully obtained output from vision model
          break;
        }
      } else {
        const errText = await res.text();
        console.error(`Gemini vision error [model: ${model}, status: ${res.status}]:`, errText.slice(0, 500));
        lastErrorDetail = `Modelo ${model} devolvió estado ${res.status}.`;
      }
    } catch (e) {
      console.error(`Gemini vision fetch failed [model: ${model}]:`, e);
      lastErrorDetail = `Error de conexión o timeout con modelo ${model}.`;
    }
  }

  if (!rawText) {
    return NextResponse.json(
      { error: `El modelo de visión no respondió. ${lastErrorDetail} Revisa GEMINI_VISION_MODEL.` },
      { status: 502 }
    );
  }

  const parsed = extractJson(rawText) as { foods?: unknown[] } | null;
  const raw = Array.isArray(parsed?.foods) ? parsed!.foods : [];

  const foods = (
    raw
      .map((f) => {
        const o = (f ?? {}) as Record<string, unknown>;
        const name = typeof o.name === "string" ? o.name.trim() : "";
        if (!name) return null;
        const micros = Array.isArray(o.micros)
          ? o.micros.filter((m): m is string => typeof m === "string").slice(0, 4)
          : [];
        return {
          name,
          grams: sanitizeNumber(o.grams),
          calories: sanitizeNumber(o.calories, true),
          protein_g: sanitizeNumber(o.protein_g),
          carbs_g: sanitizeNumber(o.carbs_g),
          fat_g: sanitizeNumber(o.fat_g),
          fiber_g: sanitizeNumber(o.fiber_g),
          micros,
        } as VisionFood;
      })
      .filter((f) => f !== null) ?? []
  ) as VisionFood[];

  return NextResponse.json({ foods });
}

