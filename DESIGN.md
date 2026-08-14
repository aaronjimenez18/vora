# Vora — Home Surface Design

> Durable design truth for the **home / General tab** (`app/page.tsx` PerformanceView + its panel components). Last reviewed: Aug 2026, seed `b6f71891` (structure candidate 5/7, ritual-checklist stack).

## Direction Contract
- **World:** editorial-luxury (incumbent). Preserve: `#09090b` ground, `#f4f4f0` ink, Newsreader serif + italic, lime `#a3e635` on-track accent, glass-floating panels, hairlines.
- **Job:** check-in status ("¿cómo va mi día?").
- **Single instant signal:** *calories on track*. Everything else is subordinate to it.
- **Fix that won the brief:** hierarchy — equal-weight panels → one dominant verdict.

## Surface Structure (top → bottom)
1. **Day context** — `label-caps` date + `RITUAL DIARIO` mono tag.
2. **Ritual checklist panel** (`glass-floating`, `divide-white/[0.06]`), three rows:
   - **CalorieRing** (hero): header row = `calorías restantes` label + state pill (`EN CAMINO` / `SOBRE META`); dominant verdict line = remaining kcal (text-6xl→7xl) + `kcal` unit, baseline-aligned, nowrap; 1.5px lime progress bar; caption `X de Y consumidas` + mono `%`.
   - **MacroBar** (protein, `isPrimary` lime): `FALTAN X G` / `CUMPLIDA`, serif value + `/ goal`, 1px bar, secondary line for carbs/fat.
   - **HydrationTracker**: `FALTAN N VASOS` / `CUMPLIDA`, serif liters + `/ target L`, 8 tap-to-fill glass buttons (`aria-pressed`).
3. **Comidas de hoy** — log section; empty state with CTA `Registrar primera comida`.

## Tokens
- Surfaces: `glass-floating` (rgba(255,255,255,0.03) / 0.08 hairline, blur 32px, radius 24).
- Verdict ink: `#a3e635` on-track, `#f87171` over-goal (both ≥13:1 on ground).
- Body ink: `#f4f4f0` (18:1).
- Captions/labels ≤ 12px: `#a1a1aa` (7.8:1) — **do not drop below `#a1a1aa`**; `#71717a` failed 4.5:1.
- Global `label-caps` (10px `#71717a`, 4.1:1) kept as incumbent token.
- Numerals: `font-mono-num` (tnum) for data; serif for verdicts.

## Mobile Density & Glass (feedback round)
- **`.glass-pill`** (header + bottom nav): `rgba(255,255,255,0.04)` → `0.1`, border `0.08` → `0.12`, blur `20px` → `28px` → opaque frosted glass over `#09090b`. Note: Lightning CSS emits only the `-webkit-backdrop-filter` prefix (supported by all modern browsers); headless screenshots cannot render the blur (compositor limitation), so judge blur on-device.
- **De-squish on mobile**: water glasses `w-9`/gap-2 → `w-8 sm:w-9`/`gap-1.5 sm:gap-2` (8 fit one line; was wrapping to 2); carbs/fat line `hidden sm:block`; `RITUAL DIARIO` tag `hidden sm:inline`; page section gap `gap-8` → `gap-10`; panel rows `gap-3` → `gap-4`.
- Verify: no overflow at 390px; water row = 1 line; panel 516px; page scrolls (less crammed per screen).

## Food Log Density (feedback round)
- Mobile collapsed card de-cramped: thumbnail `w-12 h-12 sm:w-14 sm:h-14`; P·C·F line `hidden sm:block` (still in expanded drawer + desktop); right column `gap-3`; list `gap-3`. Card ≈ 101px tall, 12px gap, no overflow. Macros remain one tap away.

## QA Record
- Verified via CDP layout audit at 390×844 (no page overflow; verdict single-line; contrast ≥7.8 on surface captions), `npx tsc --noEmit` clean, `npm run build` clean, file `detect.mjs` → `[]`.
- Screenshots: `C:\Users\aaron\AppData\Local\Temp\opencode\shots\home-mobile.png` / `home-desktop.png`.

## Incumbent Repair Batch (approved)
- **BottomNav**: `sparkles` glyph fell back to a 144px fallback (unknown codepoint) → `auto_awesome` (verified 24px). Tightened tabs to `px-2.5 sm:px-4`, `gap-1 sm:gap-1.5` so the pill fits 390px (was 527, clipped both sides). Inactive tabs `#71717a` → `#a1a1aa` (4.1:1 → 7.8:1); active stays `#f4f4f0`.
- **MealCard**: bullet `#3f3f46` → `#71717a`; time / kcal / P·C·F captions → `#a1a1aa`; delete icon `#52525b` → `#a1a1aa` (2.6:1 → 7.8:1).

## Out-of-Scope / Pending
- **`label-caps`** global (10px, 4.1:1) — a token change requires user approval (durable system change). Same for `.input-pill::placeholder` (`#52525b`, 2.6:1) and any unmeasured modals (FoodSearch/AICamera only mount on demand).
