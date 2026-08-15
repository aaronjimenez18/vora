import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPlan } from "@/lib/engine";
import { safetyScreen, type SafetyFlag, pickBestPrice, type PriceRecord } from "@/lib/engine/nutrition";
import { FOODS } from "@/lib/engine/foods";
import type { UserProfile } from "@/app/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 400 });
  }

  if (profile.mode === "manual") {
    return NextResponse.json({ error: "Modo manual: no se generan planes" }, { status: 409 });
  }

  // Progreso más reciente: peso y % grasa actualizados reemplazan al perfil
  const { data: latestProgress } = await supabase
    .from("progress")
    .select("weight_kg, body_fat")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectiveProfile: UserProfile = {
    ...profile,
    weight_kg: latestProgress?.weight_kg ?? profile.weight_kg,
    body_fat: latestProgress?.body_fat ?? profile.body_fat,
  };

  // Mapa slug → id del catálogo seed (si la migración 0002 se aplicó)
  const { data: exerciseRows } = await supabase
    .from("exercises")
    .select("id, slug")
    .not("slug", "is", null);

  const slugToId = new Map<string, string>(
    (exerciseRows ?? []).map((r: { id: string; slug: string }) => [r.slug, r.id])
  );

  // Precios CDMX (capa BAM 18.1.1) por local_price_key → precio por 100 g
  const bamKeys = FOODS.map((f) => f.bamPriceKey).filter((k) => k);
  const { data: priceRows } = await supabase
    .from("foods")
    .select("id, food_id, local_price_key, price_records(*)")
    .in("local_price_key", bamKeys);

  const priceByKey = new Map<string, number>();
  for (const row of priceRows ?? []) {
    if (!row.local_price_key || priceByKey.has(row.local_price_key)) continue;
    const records = (row.price_records ?? []) as PriceRecord[];
    const best = pickBestPrice(row.id, records, {
      asOf: new Date().toISOString().slice(0, 10),
    });
    if (best) priceByKey.set(row.local_price_key, best.pricePer100g);
  }

  const priceOverrides: Record<string, number> = {};
  for (const f of FOODS) {
    const per100g = priceByKey.get(f.bamPriceKey);
    if (per100g != null) priceOverrides[f.food_id] = per100g;
  }

  const plan = buildPlan(effectiveProfile, { priceOverrides });

  if (plan.workoutDays.length > 7) {
    return NextResponse.json(
      { error: "Demasiados días de actividad a la semana (máx. 7). Reduce días de fuerza o running." },
      { status: 400 }
    );
  }

  const screening = safetyScreen(
    (Array.isArray(profile.health_flags) ? profile.health_flags : []) as SafetyFlag[]
  );

  // Desactivar planes activos previos
  await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);
  await supabase
    .from("diet_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  // ── Workout plan ──
  const { data: wp, error: wpError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: user.id,
      name: "Plan de entrenamiento",
      split_type: plan.splitType,
      days_per_week: plan.workoutDays.length,
      source: "generated",
      is_active: true,
    })
    .select()
    .single();

  if (wpError || !wp) {
    return NextResponse.json({ error: wpError?.message ?? "No se pudo crear el plan" }, { status: 500 });
  }

  for (const day of plan.workoutDays) {
    const { data: wd, error: wdError } = await supabase
      .from("workout_days")
      .insert({
        plan_id: wp.id,
        name: day.name,
        focus: day.focus ?? null,
        day_type: day.dayType,
        cardio_spec: day.cardioSpec ?? null,
        day_of_week: day.dayOfWeek,
        position: day.position,
        source: "generated",
      })
      .select()
      .single();

    if (wdError || !wd) continue;

    const exercises = day.exercises.map((ex, i) => ({
      workout_day_id: wd.id,
      exercise_id: slugToId.get(ex.slug) ?? null,
      custom_name: ex.customName,
      sets: ex.sets,
      reps_low: ex.repsLow,
      reps_high: ex.repsHigh,
      rir: ex.rir,
      unilateral: false,
      position: i,
    }));

    if (exercises.length) {
      await supabase.from("planned_exercises").insert(exercises);
    }
  }

  // ── Diet plan (se omite si hay banderas de seguridad que requieren derivación) ──
  let dietCalories: number | null = null;
  if (!screening.refer) {
    const { data: dp, error: dpError } = await supabase
      .from("diet_plans")
      .insert({
        user_id: user.id,
        name: plan.diet.name,
        calories: plan.diet.calories,
        protein_g: plan.diet.protein,
        carbs_g: plan.diet.carbs,
        fat_g: plan.diet.fat,
        fiber_g: plan.diet.fiber,
        weekly_budget: plan.diet.weeklyBudget,
        screening: { refer: screening.refer, flags: screening.activeFlags },
        is_active: true,
      })
      .select()
      .single();

    if (dpError || !dp) {
      return NextResponse.json({ error: dpError?.message ?? "No se pudo crear la dieta" }, { status: 500 });
    }

    const meals = plan.diet.meals.map((m) => ({
      plan_id: dp.id,
      day_type: m.dayType,
      meal_type: m.mealType,
      name: m.name,
      recipe: m.recipe,
      calories: m.calories,
      protein_g: m.protein,
      carbs_g: m.carbs,
      fat_g: m.fat,
      fiber_g: m.fiber,
      cost_mxn: m.cost,
    }));

    await supabase.from("diet_meals").insert(meals);
    dietCalories = plan.diet.calories;
  }

  return NextResponse.json({
    ok: true,
    targets: plan.targets,
    splitType: plan.splitType,
    splitName: plan.splitName,
    workoutDays: plan.workoutDays.length,
    strengthDays: plan.workoutDays.filter((d) => d.dayType === "strength").length,
    runningDays: plan.workoutDays.filter((d) => d.dayType !== "strength").length,
    schedule: plan.schedule,
    runningSummary: plan.runningSummary,
    rationale: plan.rationale,
    dietCalories,
    weeklyBudget: plan.diet.weeklyBudget,
    screening,
    weightUsed: effectiveProfile.weight_kg,
    bodyFatUsed: effectiveProfile.body_fat ?? null,
  });
}
