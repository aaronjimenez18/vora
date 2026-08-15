"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setNotice(
            "Cuenta creada. Revisa tu correo para confirmar y después inicia sesión."
          );
          setMode("login");
          return;
        }
        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      let message = "Algo salió mal. Inténtalo de nuevo.";
      if (err instanceof Error) {
        const raw = err.message.toLowerCase();
        if (raw.includes("rate limit")) {
          message = "Límite de correos superado (Supabase). Desactiva 'Confirm email' en el Dashboard de Supabase para pruebas o espera 1 hora.";
        } else if (raw.includes("already registered")) {
          message = "Este correo ya está registrado. Intenta iniciar sesión.";
        } else if (raw.includes("invalid login credentials")) {
          message = "Correo o contraseña incorrectos.";
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm flex flex-col gap-8 animate-fade-in-up">
        {/* Marca */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#a3e635]" />
          </div>
          <div>
            <h1 className="font-serif-title text-3xl text-[#f4f4f0] tracking-tight">
              Vora
            </h1>
            <p className="font-serif-title italic text-[#a3e635] text-base font-light">
              tu coach de gym
            </p>
          </div>
        </div>

        {/* Panel */}
        <form onSubmit={handleSubmit} className="glass-floating p-6 flex flex-col gap-4">
          {/* Modo */}
          <div className="glass-pill p-1 flex">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 py-2 rounded-full text-xs font-medium transition-all ${
                  mode === m
                    ? "bg-[#a3e635] text-[#09090b]"
                    : "text-[#a1a1aa] hover:text-[#f4f4f0]"
                }`}
              >
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <input
              className="input-pill"
              type="text"
              placeholder="Tu nombre"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}

          <input
            className="input-pill"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <input
            className="input-pill"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            required
          />

          {error && (
            <p className="text-xs text-[#f87171] text-center">{error}</p>
          )}
          {notice && (
            <p className="text-xs text-[#a3e635] text-center">{notice}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-pill-primary w-full disabled:opacity-60"
          >
            {loading
              ? "Un momento…"
              : mode === "login"
                ? "Entrar"
                : "Crear mi cuenta"}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#52525b] label-caps">
          entrenamiento · nutrición · progreso
        </p>
      </div>
    </main>
  );
}
