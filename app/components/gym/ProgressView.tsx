"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { ProgressEntry } from "../../types";
import { addProgress, fetchProgress, fetchWeeklyVolume, fetchE1rmTrends } from "@/lib/supabase/gym";
import {
  addProgressPhoto,
  deleteProgressPhoto,
  fetchProgressPhotos,
  uploadProgressPhoto,
} from "@/lib/supabase/gym";
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

function VolumeChart({
  volume,
}: {
  volume: Awaited<ReturnType<typeof fetchWeeklyVolume>>;
}) {
  if (volume.length < 2) {
    return <p className="text-xs text-[#71717a]">Registra al menos 2 semanas de entrenos para ver volumen.</p>;
  }

  const W = 320;
  const H = 120;
  const pad = 10;
  const max = Math.max(...volume.map((v) => v.volume));
  const barW = (W - pad * 2) / volume.length;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.08)" />
        {volume.map((v, i) => {
          const h = max > 0 ? (v.volume / max) * (H - pad * 2) : 0;
          const x = pad + i * barW;
          return (
            <rect
              key={v.weekStart}
              x={x + barW * 0.22}
              y={H - pad - h}
              width={barW * 0.56}
              height={h}
              rx="3"
              fill="#a3e635"
              opacity="0.85"
            >
              <title>{`${v.label}: ${v.volume.toLocaleString("es-MX")} kg`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between mt-2">
        <span className="font-mono-num text-[10px] text-[#71717a]">{volume[0].label}</span>
        <span className="font-mono-num text-[10px] text-[#a3e635]">
          {volume[volume.length - 1].volume.toLocaleString("es-MX")} kg
        </span>
        <span className="font-mono-num text-[10px] text-[#71717a]">
          {volume[volume.length - 1].label}
        </span>
      </div>
    </div>
  );
}

function E1rmChart({ points }: { points: { date: string; e1rm: number }[] }) {
  if (points.length < 2) {
    return <p className="text-xs text-[#71717a]">Necesitas 2+ sesiones para ver la tendencia.</p>;
  }

  const W = 320;
  const H = 120;
  const pad = 10;
  const min = Math.min(...points.map((p) => p.e1rm)) - 1;
  const max = Math.max(...points.map((p) => p.e1rm)) + 1;
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (e: number) => H - pad - ((e - min) / range) * (H - pad * 2);

  const pts = points.map((p, i) => `${x(i)},${y(p.e1rm)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last.e1rm - first.e1rm;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.08)" />
        <polyline points={pts} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.e1rm)} r="2.5" fill="#a3e635">
            <title>{`${p.date}: ${p.e1rm} kg`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono-num text-[10px] text-[#71717a]">{first.date}</span>
        <span className={`font-mono-num text-xs ${diff >= 0 ? "text-[#a3e635]" : "text-[#f87171]"}`}>
          {diff > 0 ? "+" : ""}
          {diff} kg
        </span>
        <span className="font-mono-num text-[10px] text-[#71717a]">{last.date}</span>
      </div>
    </div>
  );
}

export default function ProgressView() {
  const { user } = useApp();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [volume, setVolume] = useState<Awaited<ReturnType<typeof fetchWeeklyVolume>>>([]);
  const [trends, setTrends] = useState<Awaited<ReturnType<typeof fetchE1rmTrends>>>([]);
  const [selectedEx, setSelectedEx] = useState<string>("");
  const [photos, setPhotos] = useState<Awaited<ReturnType<typeof fetchProgressPhotos>>>([]);
  const [uploading, setUploading] = useState(false);
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
    const [p, v, t, ph] = await Promise.all([
      fetchProgress(user.id),
      fetchWeeklyVolume(user.id),
      fetchE1rmTrends(user.id),
      fetchProgressPhotos(user.id),
    ]);
    setEntries(p);
    setVolume(v);
    setTrends(t);
    setPhotos(ph);
    setSelectedEx((cur) => (cur && t.some((x) => x.exerciseId === cur) ? cur : (t[0]?.exerciseId ?? "")));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const selectedTrend = useMemo(
    () => trends.find((t) => t.exerciseId === selectedEx) ?? null,
    [trends, selectedEx]
  );

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

  async function handlePhoto(file: File) {
    if (!user || uploading) return;
    setUploading(true);
    const path = await uploadProgressPhoto(file);
    if (path) {
      await addProgressPhoto(user.id, new Date().toISOString().split("T")[0], path);
      setPhotos(await fetchProgressPhotos(user.id));
    }
    setUploading(false);
  }

  async function handleDeletePhoto(id: string) {
    if (!user) return;
    await deleteProgressPhoto(id);
    setPhotos(await fetchProgressPhotos(user.id));
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-10 pb-24 animate-fade-in-up">
        <span className="label-caps">progreso</span>
        <div className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />
      {/* Fotos de progreso */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          kicker="fotos"
          title="fotos de progreso"
          action={
            <label className="btn-pill-secondary text-xs py-1.5 px-3 cursor-pointer disabled:opacity-50">
              {uploading ? "Subiendo…" : "+ Foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhoto(f);
                  e.target.value = "";
                }}
              />
            </label>
          }
        />
        {photos.length === 0 ? (
          <Empty icon="photo_camera" title="Sin fotos todavía." hint="Tómate una foto mensual en las mismas condiciones para ver tu cambio real." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="glass-floating relative overflow-hidden aspect-[3/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.signedUrl}
                  alt={`Progreso ${p.date}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5 flex items-center justify-between gap-1">
                  <span className="font-mono-num text-[9px] text-[#f4f4f0]">{p.date}</span>
                  <button
                    onClick={() => handleDeletePhoto(p.id)}
                    aria-label="Borrar foto"
                    className="text-[#f4f4f0]/70 hover:text-[#f87171] transition-colors p-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div className="flex flex-col gap-8 pb-24 animate-fade-in-up">
      <SectionHeader kicker="body" title="peso corporal" />

      <div className="glass-floating p-5">
        <WeightChart entries={entries} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader kicker="entreno" title="volumen semanal" />
        <div className="glass-floating p-5">
          <VolumeChart volume={volume} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader kicker="fuerza" title="tendencia e1RM" />
        {trends.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trends.map((t) => {
              const isSel = t.exerciseId === selectedEx;
              return (
                <button
                  key={t.exerciseId}
                  onClick={() => setSelectedEx(t.exerciseId)}
                  aria-pressed={isSel}
                  className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all ${
                    isSel
                      ? "bg-[#a3e635] text-[#09090b] font-semibold"
                      : "bg-white/[0.04] text-[#a1a1aa] hover:text-[#f4f4f0]"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
        <div className="glass-floating p-5">
          {selectedTrend ? (
            <E1rmChart points={selectedTrend.points} />
          ) : (
            <p className="text-xs text-[#71717a]">
              Registra sesiones para calcular tu 1RM estimado por ejercicio.
            </p>
          )}
        </div>
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
