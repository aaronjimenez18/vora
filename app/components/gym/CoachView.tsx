"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { ChatMessage } from "../../types";
import {
  fetchActiveDiet,
  fetchActiveWorkout,
  fetchMealLogs,
  fetchProgress,
} from "@/lib/supabase/gym";
import { SectionHeader } from "./Shared";

const QUICK_ACTIONS = [
  { label: "¿Qué como hoy?", q: "¿Qué como hoy?" },
  { label: "¿Cómo llevo mis macros?", q: "¿Cómo llevo mis macros?" },
  { label: "¿Qué entreno hoy?", q: "¿Qué entreno hoy?" },
  { label: "Generar mi plan", q: "Genera mi plan" },
];

export default function CoachView() {
  const { user } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const reply = useCallback(
    async (question: string): Promise<string> => {
      if (!user) return "No tengo sesión activa.";
      const q = question.toLowerCase();

      if (q.includes("genera") || q.includes("regenera") || q.includes("mi plan")) {
        const res = await fetch("/api/plan/generate", { method: "POST" });
        if (res.ok) {
          const j = await res.json();
          return `Plan generado ✅\n• Rutina: ${j.workoutDays} días\n• Dieta: ${j.dietCalories} kcal/día\n• Presupuesto: $${j.weeklyBudget} MXN/semana`;
        }
        return "No pude generar el plan. Revisa que tu perfil esté completo.";
      }

      if (q.includes("qué como") || q.includes("que como") || q.includes("comida") || q.includes("cen") || q.includes("comer")) {
        const diet = await fetchActiveDiet(user.id);
        if (!diet) return "No tienes un plan de dieta todavía. Escribe “Genera mi plan”.";
        const logs = await fetchMealLogs(user.id, today);
        const unlogged = diet.meals
          .filter((m) => m.day_type === "training")
          .filter((m) => !logs.some((l) => l.custom_name === m.name));
        if (unlogged.length === 0) return "Ya registraste todas las comidas del plan hoy. 👏";
        const next = unlogged[0];
        return `Te toca: **${next.name}** (${next.calories} kcal · $${next.cost_mxn} MXN)\n${next.recipe ?? ""}`;
      }

      if (q.includes("macro") || q.includes("calor") || q.includes("proteína") || q.includes("llevo")) {
        const diet = await fetchActiveDiet(user.id);
        if (!diet) return "No tengo un plan de dieta para comparar. Escribe “Genera mi plan”.";
        const logs = await fetchMealLogs(user.id, today);
        const kcal = logs.reduce((s, m) => s + (m.calories ?? 0), 0);
        const p = logs.reduce((s, m) => s + (m.protein_g ?? 0), 0);
        const c = logs.reduce((s, m) => s + (m.carbs_g ?? 0), 0);
        const f = logs.reduce((s, m) => s + (m.fat_g ?? 0), 0);
        return (
          `Hoy llevas ${kcal}/${diet.plan.calories} kcal.\n` +
          `• Proteína: ${Math.round(p)}/${diet.plan.protein_g}g\n` +
          `• Carbos: ${Math.round(c)}/${diet.plan.carbs_g}g\n` +
          `• Grasas: ${Math.round(f)}/${diet.plan.fat_g}g`
        );
      }

      if (q.includes("entreno") || q.includes("rutina") || q.includes("hoy")) {
        const workout = await fetchActiveWorkout(user.id);
        if (!workout || workout.days.length === 0)
          return "No tienes un plan de entrenamiento. Escribe “Genera mi plan”.";
        const days = workout.days.map((d, i) => `${i + 1}. ${d.name} (${d.exercises?.length ?? 0} ejercicios)`).join("\n");
        return `Tu rutina:\n${days}\n\nAbre la pestaña Rutina para registrar tu sesión.`;
      }

      if (q.includes("peso") || q.includes("progreso") || q.includes("baj") || q.includes("subi")) {
        const entries = await fetchProgress(user.id);
        if (entries.length === 0)
          return "No tengo registros de peso. En la pestaña Progreso puedes agregar tu primer pesaje.";
        const first = entries[0];
        const last = entries[entries.length - 1];
        if (first.weight_kg != null && last.weight_kg != null) {
          const diff = last.weight_kg - first.weight_kg;
          return `Tu peso fue de ${first.weight_kg} kg a ${last.weight_kg} kg (${diff > 0 ? "+" : ""}${Math.round(diff * 100) / 100} kg). ${diff <= 0 ? "Vas bien 👍" : "Revisa tu déficit si buscas perder grasa."}`;
        }
        return "Tienes registros, pero sin peso corporal en ellos.";
      }

      return (
        "Soy tu coach de reglas. Puedo ayudarte con:\n" +
        "• ¿Qué como hoy?\n" +
        "• ¿Cómo llevo mis macros?\n" +
        "• ¿Qué entreno hoy?\n" +
        "• Genera mi plan\n" +
        "• ¿Cómo va mi peso?"
      );
    },
    [user, today]
  );

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || typing) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content, timestamp: new Date().toISOString() },
    ]);
    setTyping(true);
    const answer = await reply(content);
    setTyping(false);
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "assistant", content: answer, timestamp: new Date().toISOString() },
    ]);
  }

  return (
    <div className="flex flex-col gap-6 pb-40 animate-fade-in-up">
      <SectionHeader kicker="coach" title="tu coach" />

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
              m.role === "user"
                ? "self-end bg-[#a3e635] text-[#09090b]"
                : "self-start glass-floating text-[#f4f4f0]"
            }`}
          >
            {m.content}
          </div>
        ))}
        {typing && (
          <div className="self-start glass-floating px-4 py-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-col gap-2">
          <span className="label-caps mb-1">preguntas rápidas</span>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.q}
              onClick={() => send(a.q)}
              className="glass-floating p-4 text-left text-xs text-[#a1a1aa] hover:text-[#f4f4f0] hover:border-white/[0.15] transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className="fixed bottom-24 left-0 right-0 max-w-xl mx-auto px-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Pregúntale a tu coach…"
          className="input-pill flex-1"
        />
        <button onClick={() => send()} disabled={typing} className="btn-pill-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
        </button>
      </div>
    </div>
  );
}
