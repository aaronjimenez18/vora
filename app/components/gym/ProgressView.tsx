"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { ProgressEntry } from "../../types";
import { addProgress, fetchProgress } from "@/lib/supabase/gym";
import { SectionHeader, Empty } from "./Shared";

function WeightChart({ entries }: { entries: ProgressEntry[] }) {
  const weights = entries
    .map((e) => ({ date: e.date, weight: Number(e.weight_kg) }))
    .filter((e) => Number.isFinite(e.weight) && e.weight > 0);

  if (weights.length < 2) {
    return (
      <p className="text-xs text-[#71717a]">
        Registra al menos 2 pesajes para ver la tendencia.
      </p>
    );
  }

  const W = 320;
  const H = 120;
  const pad = 10;
  const min = Math.min(...weights.map((w) => w.weight)) - 1;
  const max = Math.max(...weights.map((w) => w.weight)) + 1;
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (weights.length - 1)) * (W - pad * 2);
  const y = (w: number) => H - pad - ((w - min) / range) * (H - pad * 2);

  const points = weights.map((w, i) => `${x(i)},${y(w.weight)}`).join(" ");
  const first = weights[0];
  const last = weights[weights.length - 1];
  const diff = last.weight - first.weight;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.08)" />
        <polyline
          points={points}
          fill="none"
          stroke="#a3e635"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {weights.map((w, i) => (
          <circle key={i} cx={x(i)} cy={y(w.weight)} r="2.5" fill="#a3e635" />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono-num text-[10px] text-[#71717a]">{first.weight} kg</span>
        <span
          className={`font-mono-num text-xs ${diff <= 0 ? "text-[#a3e635]" : "text-[#f87171]"}`}
        >
          {diff > 0 ? "+" : ""}
          {Math.round(diff * 100) / 100} kg
        </span>
        <span className="font-mono-num text-[10px] text-[#71717a]">{last.weight} kg</span>
      </div>
    </div>
  );
}

export default function ProgressView() {
  const { user } = useApp();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    weight_kg: "",
    body_fat: "",
    waist_cm: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setEntries(await fetchProgress(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.weight_kg) return;
    setSaving(true);
    await addProgress(user.id, {
      date: form.date,
      weight_kg: Number(form.weight_kg),
      body_fat: form.body_fat ? Number(form.body_fat) : undefined,
      waist_cm: form.waist_cm ? Number(form.waist_cm) : undefined,
    });
    setForm((f) => ({ ...f, weight_kg: "", body_fat: "", waist_cm: "" }));
    setSaving(false);
    load();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">progreso</span>
        <div className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 animate-fade-in-up">
      <SectionHeader kicker="body" title="peso corporal" />

      <div className="glass-floating p-5">
        <WeightChart entries={entries} />
      </div>

      {/* Nuevo registro */}
      <form onSubmit={handleAdd} className="glass-floating p-5 flex flex-col gap-4">
        <span className="label-caps">nuevo registro</span>
        <input
          type="date"
          className="input-pill w-full text-xs"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="kg"
            className="input-pill text-xs"
            value={form.weight_kg}
            onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="% grasa"
            className="input-pill text-xs"
            value={form.body_fat}
            onChange={(e) => setForm((f) => ({ ...f, body_fat: e.target.value }))}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder="cintura cm"
            className="input-pill text-xs"
            value={form.waist_cm}
            onChange={(e) => setForm((f) => ({ ...f, waist_cm: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={!form.weight_kg || saving} className="btn-pill-primary w-full py-2.5 disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar registro"}
        </button>
      </form>

      {/* Historial */}
      {entries.length === 0 ? (
        <Empty icon="monitor_weight" title="Sin registros todavía." hint="Pésate 2 veces por semana, en ayunas y después de ir al baño." />
      ) : (
        <div className="flex flex-col gap-3">
          <SectionHeader kicker="historial" title="registros" />
          <div className="glass-floating divide-y divide-white/[0.06]">
            {entries
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 px-5">
                  <span className="text-xs text-[#a1a1aa]">{e.date}</span>
                  <div className="flex items-center gap-4">
                    {e.weight_kg != null && (
                      <span className="font-mono-num text-xs text-[#f4f4f0]">
                        {e.weight_kg} kg
                      </span>
                    )}
                    {e.body_fat != null && (
                      <span className="font-mono-num text-[10px] text-[#71717a]">
                        {e.body_fat}%
                      </span>
                    )}
                    {e.waist_cm != null && (
                      <span className="font-mono-num text-[10px] text-[#71717a]">
                        {e.waist_cm} cm
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
