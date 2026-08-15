# Vora — Home Surface Design

> Durable design truth for the **home / Today tab** (`app/components/gym/TodayView.tsx` + `Shared.tsx` panels). Last reviewed: Aug 2026.

## Direction Contract
- **World:** editorial-luxury. Preserve: `#09090b` ground, `#f4f4f0` ink, Newsreader serif + italic, lime `#a3e635` on-track accent, glass-floating panels, hairlines.
- **Job:** check-in status ("¿cómo va mi día?").
- **Single instant signal:** *calories on track*. Everything else is subordinate to it.

## Surface Structure (top → bottom)
1. **Day context** — `label-caps` date (`TodayView`).
2. **Objetivos / macros panel** (`glass-floating`, `divide-white/[0.06]`):
   - **Ring** (hero): consumed kcal vs plan goal; dominant verdict line = remaining kcal; 1.5px lime progress bar.
   - **MacroBar** (protein, carbs, fats): `FALTAN X G` / `CUMPLIDA`, value + `/ goal`, 1px bar.
   - **Composición** row (weight / % grasa del perfil) cuando existe.
3. **Rutina de hoy** — tarjeta del día del plan (strength → nº ejercicios; running/cardio → min · RPE) o estado de descanso (`bedtime`).
4. **Comidas de hoy** — log del día con `+` del plan (selección por tipo de día) y registro manual.

## Tokens
- Surfaces: `glass-floating` (rgba(255,255,255,0.03) / 0.08 hairline, blur 32px, radius 24).
- Verdict ink: `#a3e635` on-track, `#f87171` over-goal (both ≥13:1 on ground).
- Body ink: `#f4f4f0` (18:1).
- Captions/labels ≤ 12px: `#a1a1aa` (7.8:1) — **do not drop below `#a1a1aa`**.
- Global `label-caps` (10px `#71717a`, 4.1:1) kept as incumbent token.
- Numerals: `font-mono-num` (tnum) for data; serif for verdicts.

## Mobile Density & Glass
- **`.glass-pill`** (bottom nav): `rgba(255,255,255,0.04)` → `0.1`, border `0.08` → `0.12`, blur `20px` → `28px`. Lightning CSS emits only `-webkit-backdrop-filter`; headless screenshots cannot render blur — judge on-device.
- Bottom nav: tabs `px-2.5 sm:px-4`, `gap-1 sm:gap-1.5` (fits 390px); inactive `#a1a1aa`, active `#f4f4f0` + lime icon (`auto_awesome` verified).
- Verify: no overflow at 390px; page scrolls.

## QA Record
- Verified: `npx tsc --noEmit` clean, `npm run lint` 0 errors, `npm run build` clean, smoke-engine + smoke-catalog OK.

## Out-of-Scope / Pending
- **`label-caps`** global (10px, 4.1:1) — a token change requires user approval (durable system change). Same for `.input-pill::placeholder` (`#52525b`, 2.6:1).
