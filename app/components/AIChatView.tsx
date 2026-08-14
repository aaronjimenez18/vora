"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import type { ChatMessage } from "../types";

const AI_RESPONSES: Record<string, string> = {
  default: "He analizado tu consumo diario. ¿En qué puedo ayudarte a optimizar tus metas o recetas hoy?",
  protein: "Para cubrir tus 80g restantes de proteína: Te sugiero 200g de pechuga de pollo a la plancha + 3 claras de huevo en la cena (~55g de proteína magra).",
  dinner: "Cena recomendada: 150g de salmón al horno + espárragos al vapor + 1/2 taza de quinoa (~420 kcal, 38g proteína).",
  macro: "Estado de hoy: Proteína al 50% (80g/160g), Carbohidratos al 50% (150g/300g), Grasas al 51% (36g/70g). Prioriza fuentes proteicas en tu siguiente plato.",
};

function getResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("proteín") || lower.includes("protein")) return AI_RESPONSES.protein;
  if (lower.includes("cena") || lower.includes("dinner")) return AI_RESPONSES.dinner;
  if (lower.includes("macro")) return AI_RESPONSES.macro;
  return AI_RESPONSES.default;
}

const QUICK_PROMPTS = [
  "Sugerencia de cena alta en proteína",
  "Análisis de brecha de macros",
  "Snack recomendado post-entrenamiento",
];

export default function AIChatView() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatMessages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${crypto.randomUUID()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CHAT_MESSAGE", message: userMsg });
    setInput("");
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1000));
    setIsTyping(false);

    const aiMsg: ChatMessage = {
      id: `msg-${crypto.randomUUID()}-ai`,
      role: "assistant",
      content: getResponse(text),
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CHAT_MESSAGE", message: aiMsg });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] pb-32 animate-fade-in-up">
      {/* Title */}
      <div className="flex flex-col gap-2 mb-6">
        <span className="label-caps">Asistente Virtual</span>
        <h2 className="font-serif-title text-4xl text-[#f4f4f0] font-normal">
          Inteligencia <span className="italic text-[#a3e635] font-light">Nutricional</span>
        </h2>
      </div>

      {/* Stream */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
        {state.chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#a3e635] text-[#09090b] font-medium shadow-lg"
                  : "glass-floating text-[#f4f4f0]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="glass-floating p-4 rounded-3xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#a3e635] animate-ping" />
              <span className="font-serif-title italic text-sm text-[#a3e635]">Pensando recomendación...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 overflow-x-auto py-3 flex-shrink-0">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="btn-pill-secondary text-xs font-normal whitespace-nowrap flex-shrink-0 py-2 px-4"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 flex-shrink-0 pt-2">
        <input
          type="text"
          placeholder="Escribe tu consulta nutricional..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="input-pill flex-1"
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="btn-pill-primary">
          Enviar
        </button>
      </div>
    </div>
  );
}
