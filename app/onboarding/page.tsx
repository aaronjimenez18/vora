"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppProvider, useApp } from "../context/AppContext";
import { safetyScreen, type SafetyFlag } from "@/lib/engine/nutrition";
import type { AppMode, Experience, Goal, Sex } from "../types";

interface FormState {
  age: string;
  sex: Sex | "";
  height_cm: string;
  weight_kg: string;
  body_fat: string;
  goal: Goal | "";
  experience: Experience | "";
  training_days: string;
  equipment: string;
  split_pref: string;
  running_level: string;
  occupation_activity: string;
  running_days_per_week: string;
  cardio_minutes_per_week: string;
  budget_amount_mxn: string;
  budget_period: string;
  diet_style: string;
  allergies: string[];
  foods_liked: string;
  foods_disliked: string;
  health_flags: SafetyFlag[];
  weekly_budget: string;
  dietary_prefs: string;
  activity_level: string;
  mode: AppMode;
}

const INITIAL: FormState = {
  age: "",
  sex: "",
  height_cm: "",
  weight_kg: "",
  body_fat: "",
  goal: "",
  experience: "",
  training_days: "",
  equipment: "",
  split_pref: "auto",
  running_level: "first_time",
  occupation_activity: "",
  running_days_per_week: "",
  cardio_minutes_per_week: "",
  budget_amount_mxn: "",
  budget_period: "",
  diet_style: "",
  allergies: [],
  foods_liked: "",
  foods_disliked: "",
  health_flags: [],
  weekly_budget: "",
  dietary_prefs: "ninguna",
  activity_level: "",
  mode: "guided",
};

const STEPS = [
  { label: "datos", title: "Cuéntame sobre ti", subtitle: "Edad, sexo y medidas corporales." },
  { label: "objetivo", title: "¿Cuál es tu objetivo?", subtitle: "Esto define tu estrategia de calorías y entreno." },
  { label: "experiencia", title: "¿Cuánto sabes entrenar?", subtitle: "Para ajustar el volumen y la complejidad." },
  { label: "entreno", title: "Tu entrenamiento", subtitle: "Días, equipamiento y carga semanal." },
  { label: "actividad", title: "Tu día a día", subtitle: "Qué tan activo eres fuera del gimnasio." },
  { label: "presupuesto", title: "Presupuesto de comida", subtitle: "Cuánto gastas." },
  { label: "preferencias", title: "Preferencias y restricciones", subtitle: "Las alergias bloquean alimentos de forma estricta." },
  { label: "salud", title: "Filtro de seguridad", subtitle: "Para saber cuándo debes consultar a un profesional." },
  { label: "modo", title: "¿Cómo quieres llevarlo?", subtitle: "Guía automática o registro libre." },
] as const;

const ALLERGY_OPTIONS: { v: string; l: string }[] = [
  { v: "egg", l: "Huevo" },
  { v: "milk", l: "Lácteos" },
  { v: "fish", l: "Pescado" },
  { v: "shellfish", l: "Mariscos" },
  { v: "soy", l: "Soya" },
  { v: "peanut", l: "Cacahuate" },
  { v: "tree_nuts", l: "Frutos secos" },
  { v: "gluten_possible", l: "Trigo / gluten" },
];

const HEALTH_OPTIONS: { v: SafetyFlag; l: string; d: string }[] = [
  { v: "pregnancy_or_breastfeeding", l: "Embarazo o lactancia", d: "Requiere supervisión clínica." },
  { v: "eating_disorder_history", l: "Antecedente de trastorno alimentario", d: "Derivar a valoración profesional." },
  { v: "diabetes_medication", l: "Diabetes con medicación", d: "Requiere supervisión clínica." },
  { v: "kidney_disease", l: "Enfermedad renal", d: "La dieta debe ser valorada por un profesional." },
  { v: "liver_disease", l: "Enfermedad hepática", d: "La dieta debe ser valorada por un profesional." },
  { v: "gastrointestinal_disease", l: "Enfermedad gastrointestinal", d: "La dieta debe ser valorada por un profesional." },
  { v: "clinician_prescribed_diet", l: "Me dieron una dieta clínica", d: "No sustituir la indicación médica." },
  { v: "severe_food_allergy", l: "Alergia alimentaria severa", d: "Bloquear todos los alérgenos." },
  { v: "unintentional_weight_loss", l: "Pérdida de peso sin buscarla", d: "Derivar a valoración profesional." },
  { v: "rapid_weight_change", l: "Cambio de peso muy rápido", d: "Derivar a valoración profesional." },
  { v: "under_18", l: "Soy menor de 18 años", d: "Requerimientos en etapa de crecimiento." },
];

function OptionCard({
  active,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  label: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full px-5 py-4 rounded-2xl border transition-all ${
        active
          ? "border-[#a3e635] bg-[#a3e635]/10"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
      }`}
    >
      <span className={`block text-sm font-medium ${active ? "text-[#a3e635]" : "text-[#f4f4f0]"}`}>
        {label}
      </span>
      {desc && <span className="block text-xs text-[#a1a1aa] mt-0.5">{desc}</span>}
    </button>
  );
}

function NumberField({
  value,
  onChange,
  placeholder,
  suffix,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className="input-pill flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      />
      {suffix && <span className="text-xs text-[#a1a1aa] whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-xs font-medium transition-all ${
        active
          ? "border-[#a3e635] bg-[#a3e635]/10 text-[#a3e635]"
          : "border-white/[0.08] bg-white/[0.02] text-[#a1a1aa] hover:border-white/[0.18]"
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({
  checked,
  label,
  desc,
  onChange,
}: {
  checked: boolean;
  label: string;
  desc?: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`text-left w-full px-4 py-3 rounded-xl border transition-all ${
        checked
          ? "border-[#a3e635]/60 bg-[#a3e635]/10"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
      }`}
    >
      <span className={`block text-xs font-medium ${checked ? "text-[#a3e635]" : "text-[#f4f4f0]"}`}>
        {label}
      </span>
      {desc && <span className="block text-[10px] text-[#a1a1aa] mt-0.5">{desc}</span>}
    </button>
  );
}

function StepLabel({ text }: { text: string }) {
  return <span className="label-caps block mb-2">{text}</span>;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function Page() {
  return (
    <AppProvider>
      <OnboardingPage />
    </AppProvider>
  );
}

function OnboardingPage() {
  const router = useRouter();
  const { refreshProfile } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return;
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "allergies" | "health_flags", v: string) =>
    setForm((f) => {
      const cur = f[key] as string[];
      return {
        ...f,
        [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
      };
    });

  const screening = safetyScreen(form.health_flags);

  function validateStep(i: number): boolean {
    if (i === 0) {
      const age = Number(form.age);
      const h = Number(form.height_cm);
      const w = Number(form.weight_kg);
      if (!form.sex || !(age >= 14 && age <= 100)) return false;
      if (!(h >= 100 && h <= 250) || !(w >= 30 && w <= 300)) return false;
    }
    if (i === 1 && !form.goal) return false;
    if (i === 2 && !form.experience) return false;
    if (i === 3) {
      const days = Number(form.training_days);
      if (!(days >= 1 && days <= 7)) return false;
      if (!form.equipment) return false;
    }
    if (i === 4 && !form.occupation_activity) return false;
    if (i === 5) {
      const amount = Number(form.budget_amount_mxn);
      if (!(amount >= 0) || !form.budget_period) return false;
    }
    if (i === 6 && !form.diet_style) return false;
    return true;
  }

  function next() {
    if (!validateStep(step)) {
      setError("Revisa los campos de este paso.");
      return;
    }
    setError(null);
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function back() {
    setError(null);
    if (step > 0) setStep(step - 1);
    else router.push("/");
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión");

      const activity = form.occupation_activity;
      const rawRunningDays = form.running_days_per_week ? Number(form.running_days_per_week) : 0;
      const runningDays = isNaN(rawRunningDays) ? 0 : Math.min(7, Math.max(0, Math.floor(rawRunningDays)));

      const rawStrengthDays = form.training_days ? Number(form.training_days) : 0;
      const strengthDays = isNaN(rawStrengthDays) ? 0 : Math.min(7, Math.max(0, Math.floor(rawStrengthDays)));

      const payload = {
        user_id: user.id,
        age: Number(form.age),
        sex: form.sex as Sex,
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        body_fat: form.body_fat ? Math.max(3, Math.min(60, Number(form.body_fat))) : null,
        goal: form.goal as Goal,
        experience: form.experience as Experience,
        training_days: Math.min(7, Math.max(1, Math.floor(Number(form.training_days) || 1))),
        equipment: form.equipment,
        split_pref: form.split_pref,
        running_level: (["first_time", "beginner", "intermediate", "advanced"].includes(form.running_level) ? form.running_level : "first_time") as "first_time" | "beginner" | "intermediate" | "advanced",
        occupation_activity: activity,
        strength_days_per_week: strengthDays,
        running_days_per_week: runningDays,
        cardio_minutes_per_week: form.cardio_minutes_per_week ? Math.max(0, Math.floor(Number(form.cardio_minutes_per_week))) : 0,
        budget_amount_mxn: Math.max(0, Number(form.budget_amount_mxn) || 0),
        budget_period: form.budget_period || null,
        diet_style: form.diet_style || null,
        allergies: form.allergies,
        foods_liked: parseList(form.foods_liked),
        foods_disliked: parseList(form.foods_disliked),
        health_flags: form.health_flags,
        weekly_budget: Math.max(0, Number(form.budget_amount_mxn) || 0),
        dietary_prefs: form.diet_style || null,
        activity_level: activity,
        mode: form.mode,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("user_profile").upsert(payload);
      if (error) throw error;

      await refreshProfile();

      if (form.mode === "guided" && !screening.refer) {
        try {
          await fetch("/api/plan/generate", { method: "POST" });
        } catch {
          // si la generación falla, el usuario puede regenerarla después
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      const raw = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      setError(raw || "No se pudo guardar tu perfil. Revisa que la base de datos esté inicializada.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse" />
      </div>
    );
  }

  const progress = Math.round((step / (STEPS.length - 1)) * 100);
  const goalLabel = form.goal || "—";
  const eqSex =
    form.sex === "female" ? "femenino" : form.sex === "male" ? "masculino" : form.sex || "—";

  return (
    <main className="min-h-screen bg-[#09090b] flex flex-col">
      <div className="max-w-xl mx-auto w-full px-4 pt-10 pb-4">
        <div className="flex items-center justify-between mb-6">
          <span className="label-caps">
            paso {step + 1} de {STEPS.length}
          </span>
          <span className="font-mono-num text-[10px] text-[#a1a1aa]">{progress}%</span>
        </div>
        <div className="h-px bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a3e635] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl text-[#f4f4f0] tracking-tight mt-6">
          {STEPS[step].title}
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">{STEPS[step].subtitle}</p>
      </div>

      <div className="max-w-xl mx-auto w-full flex-1 px-4 pb-40 animate-fade-in-up">
        {step === 0 && (
          <div className="glass-floating p-6 flex flex-col gap-5">
            <div>
              <StepLabel text="edad" />
              <NumberField value={form.age} onChange={(v) => set("age", v)} placeholder="Años" />
            </div>
            <div>
              <StepLabel text="sexo biológico" />
              <div className="flex flex-col gap-2">
                {(
                  [
                    { v: "male", l: "Masculino" },
                    { v: "female", l: "Femenino" },
                    { v: "other", l: "Otro" },
                  ] as const
                ).map((o) => (
                  <OptionCard
                    key={o.v}
                    active={form.sex === o.v}
                    label={o.l}
                    onClick={() => set("sex", o.v)}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#71717a] mt-2">
                Se usa como entrada biológica para la fórmula de calorías.
              </p>
            </div>
            <div>
              <StepLabel text="medidas" />
              <div className="flex flex-col gap-3">
                <NumberField value={form.height_cm} onChange={(v) => set("height_cm", v)} placeholder="Altura" suffix="cm" />
                <NumberField value={form.weight_kg} onChange={(v) => set("weight_kg", v)} placeholder="Peso actual" suffix="kg" />
              </div>
            </div>
            <div>
              <StepLabel text="medidas opcionales" />
              <NumberField value={form.body_fat} onChange={(v) => set("body_fat", v)} placeholder="% grasa corporal" suffix="%" />
              <p className="text-[10px] text-[#71717a] mt-2">
                Opcional: solo mejora la precisión del cálculo de calorías.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-2">
            {(
              [
                { v: "lose_fat", l: "Perder grasa", d: "Déficit de −10% a −20% respecto al mantenimiento." },
                { v: "gain_muscle", l: "Ganar músculo", d: "Superávit de +5% a +15%, gradual." },
                { v: "recomp", l: "Recomposición", d: "Mantener calorías, entrenar fuerte y comer mucha proteína." },
                { v: "maintain", l: "Mantener", d: "Ajustar a la media de peso y rendimiento." },
              ] as const
            ).map((o) => (
              <OptionCard
                key={o.v}
                active={form.goal === o.v}
                label={o.l}
                desc={o.d}
                onClick={() => set("goal", o.v)}
              />
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {(
              [
                { v: "beginner", l: "Principiante", d: "Menos de 1 año entrenando." },
                { v: "intermediate", l: "Intermedio", d: "1–3 años con constancia." },
                { v: "advanced", l: "Avanzado", d: "Más de 3 años y técnica dominada." },
              ] as const
            ).map((o) => (
              <OptionCard
                key={o.v}
                active={form.experience === o.v}
                label={o.l}
                desc={o.d}
                onClick={() => set("experience", o.v)}
              />
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="glass-floating p-6 flex flex-col gap-5">
            <div>
              <StepLabel text="días por semana" />
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("training_days", String(d))}
                    className={`flex-1 py-2.5 rounded-full text-xs font-medium transition-all ${
                      form.training_days === String(d)
                        ? "bg-[#a3e635] text-[#09090b]"
                        : "bg-white/[0.04] text-[#a1a1aa] hover:text-[#f4f4f0]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <StepLabel text="running / cardio (opcional)" />
              <div className="flex flex-col gap-3">
                <NumberField value={form.running_days_per_week} onChange={(v) => set("running_days_per_week", v)} placeholder="Días de running por semana (0-7)" min={0} max={7} />
                <NumberField value={form.cardio_minutes_per_week} onChange={(v) => set("cardio_minutes_per_week", v)} placeholder="Cardio total a la semana" suffix="min" />
              </div>
              <div className="mt-3">
                <span className="label-caps mb-2 block">¿cómo estás corriendo hoy?</span>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      { v: "first_time", l: "Primera vez", d: "Casi no corro, empiezo de cero." },
                      { v: "beginner", l: "1-2 veces", d: "Corro sin ritmo definido, pocos km." },
                      { v: "intermediate", l: "5-8 km", d: "Corro seguido y aguanto un rato." },
                      { v: "advanced", l: "+10 km / con ritmo", d: "Entreno con ritmo y distancias largas." },
                    ] as const
                  ).map((o) => (
                    <OptionCard
                      key={o.v}
                      active={form.running_level === o.v}
                      label={o.l}
                      desc={o.d}
                      onClick={() => set("running_level", o.v)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <StepLabel text="equipamiento disponible" />
              <div className="flex flex-col gap-2">
                {(
                  [
                    { v: "gym", l: "Gimnasio completo", d: "Máquinas, barras y mancuernas." },
                    { v: "home_dumbbells", l: "Casa con mancuernas", d: "Mancuernas y banda elástica." },
                    { v: "home_minimal", l: "Casa básico", d: "Cuerpo libre o poco material." },
                  ] as const
                ).map((o) => (
                  <OptionCard
                    key={o.v}
                    active={form.equipment === o.v}
                    label={o.l}
                    desc={o.d}
                    onClick={() => set("equipment", o.v)}
                  />
                ))}
              </div>
            </div>
            <div>
              <StepLabel text="preferencia de rutina" />
              <div className="flex flex-col gap-2">
                {(
                  [
                    { v: "auto", l: "Que decida el coach", d: "Recomiendo según tus días y nivel." },
                    { v: "upper_lower", l: "Torso / Pierna" },
                    { v: "ppl", l: "Push / Pull / Pierna" },
                    { v: "hybrid", l: "Híbrido: Torso/Pierna + PPL", d: "Un día torso, otro pierna, otro push, otro pull… combinado." },
                    { v: "full_body", l: "Cuerpo completo" },
                  ] as readonly { v: string; l: string; d?: string }[]
                ).map((o) => (
                  <OptionCard
                    key={o.v}
                    active={form.split_pref === o.v}
                    label={o.l}
                    desc={o.d}
                    onClick={() => set("split_pref", o.v)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="glass-floating p-6 flex flex-col gap-5">
            <div>
              <StepLabel text="ocupación" />
              <div className="flex flex-col gap-2">
                {(
                  [
                    { v: "sedentary", l: "Sedentario", d: "Oficina, poco movimiento." },
                    { v: "light", l: "Ligero", d: "Caminas 1–3 veces por semana." },
                    { v: "moderate", l: "Moderado", d: "Activo 3–5 veces por semana." },
                    { v: "high", l: "Activo", d: "Entrenas 6–7 veces por semana." },
                    { v: "very_high", l: "Muy activo", d: "Trabajo físico + entreno diario." },
                  ] as const
                ).map((o) => (
                  <OptionCard
                    key={o.v}
                    active={form.occupation_activity === o.v}
                    label={o.l}
                    desc={o.d}
                    onClick={() => set("occupation_activity", o.v)}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#71717a] mt-2">
                Es una estimación inicial: se ajusta con peso, hambre y rendimiento observados.
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="glass-floating p-6 flex flex-col gap-5">
            <div>
              <StepLabel text="monto" />
              <NumberField value={form.budget_amount_mxn} onChange={(v) => set("budget_amount_mxn", v)} placeholder="Ej. 1500" suffix="MXN" />
            </div>
            <div>
              <StepLabel text="periodo" />
              <div className="flex gap-2">
                {(
                  [
                    { v: "per_day", l: "Por día" },
                    { v: "per_week", l: "Por semana" },
                    { v: "per_month", l: "Por mes" },
                  ] as const
                ).map((o) => (
                  <Chip
                    key={o.v}
                    active={form.budget_period === o.v}
                    label={o.l}
                    onClick={() => set("budget_period", o.v)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="glass-floating p-6 flex flex-col gap-5">
            <div>
              <StepLabel text="estilo de alimentación" />
              <div className="flex flex-col gap-2">
                {(
                  [
                    { v: "omnivore", l: "Omnívoro", d: "Sin restricciones." },
                    { v: "vegetarian", l: "Vegetariano", d: "Sin carne ni pescado." },
                    { v: "vegan", l: "Vegano", d: "Sin productos animales." },
                    { v: "pescatarian", l: "Pescatariano", d: "Sin carne, con pescado y mariscos." },
                    { v: "other", l: "Otro", d: "Otra preferencia." },
                  ] as const
                ).map((o) => (
                  <OptionCard
                    key={o.v}
                    active={form.diet_style === o.v}
                    label={o.l}
                    desc={o.d}
                    onClick={() => set("diet_style", o.v)}
                  />
                ))}
              </div>
            </div>
            <div>
              <StepLabel text="alergias (bloquean alimentos)" />
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((o) => (
                  <Chip
                    key={o.v}
                    active={form.allergies.includes(o.v)}
                    label={o.l}
                    onClick={() => toggle("allergies", o.v)}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#71717a] mt-2">
                Las alergias bloquean los alimentos y sus sustituciones de forma estricta.
              </p>
            </div>
            <div>
              <StepLabel text="alimentos favoritos y que evitas (opcional)" />
              <input className="input-pill w-full mb-2" placeholder="Favoritos, separados por coma" value={form.foods_liked} onChange={(e) => set("foods_liked", e.target.value)} />
              <input className="input-pill w-full" placeholder="Evito…, separados por coma" value={form.foods_disliked} onChange={(e) => set("foods_disliked", e.target.value)} />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-5">
            <div className="glass-floating p-6 flex flex-col gap-2">
              {HEALTH_OPTIONS.map((o) => (
                <Toggle
                  key={o.v}
                  checked={form.health_flags.includes(o.v)}
                  label={o.l}
                  desc={o.d}
                  onChange={() => toggle("health_flags", o.v)}
                />
              ))}
            </div>
            {screening.refer && (
              <div className="rounded-2xl border border-[#f87171]/30 bg-[#f87171]/10 p-5">
                <span className="label-caps text-[#f87171] mb-2 block">derivación recomendada</span>
                <p className="text-sm text-[#f4f4f0]">{screening.message}</p>
                <p className="text-[10px] text-[#a1a1aa] mt-2">
                  Podrás guardar tu perfil, pero no se generará una dieta automática hasta valorarlo con un profesional.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 8 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <OptionCard
                active={form.mode === "guided"}
                label="Modo guiado — mi coach arma todo"
                desc="Vora calcula tu rutina y tu plan de comidas según tu perfil, presupuesto y objetivos."
                onClick={() => set("mode", "guided")}
              />
              <OptionCard
                active={form.mode === "manual"}
                label="Modo libre — yo llevo el control"
                desc="Sin planes generados. Armas tus propios entrenos y registras tus comidas."
                onClick={() => set("mode", "manual")}
              />
            </div>

            <div className="glass-floating p-6 flex flex-col gap-3">
              <StepLabel text="resumen" />
              {[
                ["Edad / sexo", `${form.age} años · ${eqSex}`],
                ["Medidas", `${form.height_cm} cm · ${form.weight_kg} kg`],
                ["Objetivo", goalLabel],
                ["Nivel", form.experience],
                ["Entreno", `${form.training_days} días`],
                ["Actividad", form.occupation_activity],
                ["Presupuesto", `${form.budget_amount_mxn || 0} MXN/${form.budget_period || "—"}`],
                ["Estilo", form.diet_style],
                ["Modo", form.mode],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#a1a1aa] capitalize">{k}</span>
                  <span className="text-xs text-[#f4f4f0] capitalize text-right">{v}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-[#f87171] text-center">{error}</p>}

            <button
              onClick={submit}
              disabled={loading}
              className="btn-pill-primary w-full py-3 disabled:opacity-60"
            >
              {loading
                ? "Guardando…"
                : screening.refer
                  ? "Guardar perfil (sin dieta automática)"
                  : form.mode === "guided"
                    ? "Generar mi plan"
                    : "Empezar a registrar"}
            </button>
          </div>
        )}

        {step < STEPS.length - 1 && (
          <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 max-w-xl mx-auto">
            {error && <p className="text-xs text-[#f87171] text-center mb-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={back} className="btn-pill-secondary flex-1">
                Atrás
              </button>
              <button onClick={next} className="btn-pill-primary flex-1">
                Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default Page;
