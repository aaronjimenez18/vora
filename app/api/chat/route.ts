import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickBestPrice, type PriceRecord } from "@/lib/engine/nutrition";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

interface ToolArgs {
  query?: string;
  min_protein_g?: number;
  max_cost_mxn?: number;
  max_results?: number;
  days?: number;
  limit?: number;
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "search_foods",
        description:
          "Busca alimentos reales del catálogo mexicano (BAM 18.1.1) por nombre o por filtros de proteína y costo. Úsala cuando el usuario pida ideas de comida, comparar opciones o saber cuánto cuesta algo. Devuelve macros y precio por 100 g.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Nombre o parte del nombre del alimento (ej. 'pollo', 'frijoles', 'atun')" },
            min_protein_g: { type: "number", description: "Filtrar alimentos con al menos esta cantidad de proteína por 100 g" },
            max_cost_mxn: { type: "number", description: "Filtrar alimentos cuyo precio por 100 g no supere este monto en pesos" },
            max_results: { type: "number", description: "Máximo de resultados (por defecto 6, máximo 10)" },
          },
        },
      },
      {
        name: "get_progress_history",
        description:
          "Obtiene el historial de progreso corporal del usuario (peso, % de grasa, medidas). Úsala para hablar de tendencias, promedios o responder '¿cómo va mi progreso?'.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Número de registros más recientes (por defecto 10)" },
          },
        },
      },
      {
        name: "get_meal_logs",
        description:
          "Obtiene lo que el usuario ha registrado de comida (calorías, macros, costo) de los últimos N días. Úsala para analizar adherencia, ajustar macros o revisar hábitos.",
        parameters: {
          type: "object",
          properties: {
            days: { type: "number", description: "Días hacia atrás a revisar (por defecto 3, máximo 14)" },
          },
        },
      },
      {
        name: "get_active_plan",
        description:
          "Obtiene el plan activo del usuario: plan de dieta completo (comidas por día con calorías, macros y costo) y plan de entrenamiento (días y ejercicios). Úsala para explicar o ajustar el plan.",
        parameters: { type: "object", properties: {} },
      },
    ],
  },
];

async function executeTool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  args: ToolArgs
): Promise<unknown> {
  const clamp = (n: unknown, min: number, max: number, def: number) => {
    const v = typeof n === "number" ? n : Number(n);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
  };

  switch (name) {
    case "search_foods": {
      const query = (args.query ?? "").trim();
      const maxResults = clamp(args.max_results, 1, 10, 6);
      let q = supabase
        .from("foods")
        .select("id, name, calories, protein_g, carbs_g, fat_g, serving_g, category, local_price_key, price_mxn, price_records(*)")
        .limit(maxResults);
      if (query) q = q.ilike("name", `%${query}%`);
      if (typeof args.min_protein_g === "number") q = q.gte("protein_g", args.min_protein_g);
      const { data: rows } = await q;
      if (!rows || rows.length === 0) {
        return { error: "Sin resultados con esos filtros. Prueba otro nombre o quita filtros." };
      }
      const asOf = new Date().toISOString().slice(0, 10);
      return {
        resultados: rows.map((r) => {
          const best = pickBestPrice(r.id, (r.price_records ?? []) as PriceRecord[], { asOf });
          return {
            nombre: r.name,
            kcal_por_100g: r.calories,
            protein_g: r.protein_g,
            carbs_g: r.carbs_g,
            fat_g: r.fat_g,
            costo_por_100g_mxn: best?.pricePer100g ?? r.price_mxn ?? null,
            categoria: r.category ?? null,
          };
        }),
      };
    }

    case "get_progress_history": {
      const limit = clamp(args.limit, 1, 30, 10);
      const { data } = await supabase
        .from("progress")
        .select("date, weight_kg, body_fat, waist_cm, chest_cm, arm_cm, notes")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .limit(limit);
      return { historial: data ?? [] };
    }

    case "get_meal_logs": {
      const days = Math.round(clamp(args.days, 1, 14, 3));
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const { data } = await supabase
        .from("meal_logs")
        .select("date, meal_type, custom_name, calories, protein_g, carbs_g, fat_g, cost_mxn")
        .eq("user_id", userId)
        .gte("date", from.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      return { dias: days, registros: data ?? [] };
    }

    case "get_active_plan": {
      const { data: diet } = await supabase
        .from("diet_plans")
        .select("id, calories, protein_g, carbs_g, fat_g, fiber_g, weekly_budget, diet_meals(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      const { data: workout } = await supabase
        .from("workout_plans")
        .select(
          "id, name, split_type, workout_days(day_type, day_of_week, name, position, cardio_spec, planned_exercises(custom_name, sets, reps_low, reps_high, rir))"
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return { dieta: diet ?? null, entrenamiento: workout ?? null };
    }

    default:
      return { error: "Herramienta desconocida" };
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
    return NextResponse.json({ fallback: true });
  }

  let body: { messages?: ChatMessage[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter(
    (m): m is ChatMessage =>
      (m.role === "user" || m.role === "model" || m.role === "assistant") &&
      typeof m.content === "string"
  );
  if (messages.length === 0) {
    return NextResponse.json({ error: "Sin mensajes" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await supabase
    .from("user_profile")
    .select("weight_kg, height_cm, age, sex, body_fat, goal, activity_level, weekly_budget, diet_style, dietary_prefs")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: diet } = await supabase
    .from("diet_plans")
    .select("calories, protein_g, carbs_g, fat_g, fiber_g, weekly_budget, diet_meals(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const { data: logs } = await supabase
    .from("meal_logs")
    .select("custom_name, meal_type, calories, protein_g, carbs_g, fat_g, cost_mxn")
    .eq("user_id", user.id)
    .eq("date", today);

  const context = {
    perfil: profile
      ? {
          peso_kg: profile.weight_kg,
          altura_cm: profile.height_cm,
          edad: profile.age,
          sexo: profile.sex,
          grasa_corporal_pct: profile.body_fat ?? null,
          objetivo: profile.goal,
          nivel_actividad: profile.activity_level,
          presupuesto_semanal_mxn: profile.weekly_budget,
          restricciones: profile.diet_style ?? profile.dietary_prefs ?? "ninguna",
        }
      : null,
    plan_dieta_activo: diet
      ? {
          calorias: diet.calories,
          protein_g: diet.protein_g,
          carbs_g: diet.carbs_g,
          fat_g: diet.fat_g,
          fiber_g: diet.fiber_g,
          presupuesto_semanal: diet.weekly_budget,
          comidas: (diet.diet_meals ?? []).map((m) => ({
            tipo: m.meal_type,
            nombre: m.name,
            calorias: m.calories,
            costo_mxn: m.cost_mxn,
          })),
        }
      : null,
    comida_registrada_hoy: (logs ?? []).map((l) => ({
      nombre: l.custom_name,
      tipo: l.meal_type,
      kcal: l.calories,
      protein_g: l.protein_g,
      carbs_g: l.carbs_g,
      fat_g: l.fat_g,
      costo_mxn: l.cost_mxn,
    })),
  };

  const systemPrompt = [
    "Eres VORA, un coach de gimnasio y nutrición mexicano con 15 años entrenando gente real, de principiantes a avanzados. No eres un bot de ayuda: eres el coach que te dice las cosas como son, con cariño y sin rodeos.",
    "Personalidad: cercano, directo, con humor seco, cero postureo. Hablas en español de México (compás, morro/a, chamaco/a) pero sin pasarte de confianza: siempre profesional. Usas frases cortas y fuertes, no párrafos académicos.",
    "Cómo trabajar:",
    "- Antes de responder sobre comida, entrenamiento, macros o progreso, CONSULTA los datos con las herramientas disponibles (search_foods, get_meal_logs, get_progress_history, get_active_plan). No inventes: si no consultaste, no afirmes.",
    "- search_foods devuelve macros y precio por 100 g: calcula porciones reales y costos aproximados para armar sugerencias al presupuesto del usuario.",
    "- Para macros/calorías: compara con el contexto y lo registrado, y da un ajuste puntual y accionable.",
    "- Para progreso: interpreta la tendencia con calma (fluctuación de 1-2 kg por agua/glicógeno) y usa el % de grasa cuando exista.",
    "- Para entrenamiento: habla de progresión de carga (más peso o más reps semana a semana), RIR, series efectivas y descanso. Nada de rutinas mágicas.",
    "Reglas duras:",
    "- Máximo 3-6 oraciones, salvo que el usuario pida detalle. Sin markdown pesado (solo negritas ocasionales).",
    "- Si una herramienta devuelve error o sin resultados, dilo y sugiere alternativas.",
    "- Si algo suena a condición médica (dolor, lesión, diabetes, embarazo, TCA): recomienda consultar a un profesional y no des diagnóstico.",
    "- Si no hay plan generado, sugiere escribir 'Genera mi plan'.",
    `Contexto actual (JSON):\n${JSON.stringify(context, null, 2)}`,
  ].join("\n");

  const contents: Array<{ role: string; parts: unknown[] }> = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    })),
  ];

  const MAX_ROUNDS = 5;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, tools: TOOLS }),
          signal: AbortSignal.timeout(30000),
        }
      );
    } catch (e) {
      console.error("Gemini fetch failed", e);
      return NextResponse.json({ fallback: true });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini error", res.status, errText.slice(0, 500));
      return NextResponse.json({ fallback: true });
    }

    const j = await res.json();
    const parts: Array<{ text?: string; functionCall?: { name: string; args: ToolArgs } }> =
      j?.candidates?.[0]?.content?.parts ?? [];

    const calls = parts.filter((p) => p.functionCall);
    if (calls.length === 0) {
      const text = parts.map((p) => p.text ?? "").join("").trim();
      if (!text) return NextResponse.json({ fallback: true });
      return NextResponse.json({ reply: text });
    }

    contents.push({ role: "model", parts });
    const results: Array<{ functionResponse: { name: string; response: unknown } }> = [];
    for (const call of calls) {
      const name = call.functionCall!.name;
      const result = await executeTool(supabase, user.id, name, call.functionCall!.args ?? {});
      results.push({ functionResponse: { name, response: { resultado: result } } });
    }
    contents.push({ role: "user", parts: results });
  }

  return NextResponse.json({ fallback: true });
}