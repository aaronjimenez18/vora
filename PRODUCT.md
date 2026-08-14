# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the owner (Aaron). Vora is a personal nutrition and training tracker, and the owner's own habits, goals, and meal-prep workflow are the reference user. Operating context is Spanish-speaking (Mexico); all copy is Mexican Spanish.

## Product Purpose

Vora unifies daily calorie and macro logging, hydration, weight and weekly analytics, meal-prep pantry management, and food budget control with an AI nutrition coach and AI photo-based food recognition. Success means the owner can log intake quickly and accurately and get coaching that moves them toward their nutrition and weight targets.

## Positioning

The distinctive mechanism is the combination: an AI nutrition coach, AI camera food recognition, and meal-prep pantry/budget management in one Spanish-language, mobile-first interface. The AI features are simulated today with preset responses and scan results, but are planned to become real; the architecture must stay ready for that.

## Operating Context

- Mobile-first single-page app with five tabs: General (performance overview), Diario (food log), Progreso (analytics), Despensa (budget + pantry), and Asistente IA (coach chat).
- Spanish (es-MX) interface language end to end, including the AI coach's voice.
- All data is persisted client-side in `localStorage` under the key `vora-state`.
- Food logging happens two ways: a searchable food-database modal and the AI camera scan modal.
- Meal categories: breakfast, lunch, dinner, snack. Metrics tracked: calories, protein/carbs/fat in grams, water in 250ml glasses, body weight in kg, money in $.

## Capabilities and Constraints

Confirmed capabilities: calorie and macro goals; daily food log grouped by meal category; hydration tracker (default goal 8 glasses); weekly calorie/macro analytics with a bar chart; weight history; pantry inventory with expiry dates and costs; monthly food budget with progress; AI coach chat with quick prompts; AI camera scan with confidence score and auto-log.

Confirmed constraints:

- AI coach and camera recognition are simulated (hardcoded keyword responses and three preset scan dishes). No real model or API is wired up yet.
- No backend, auth, or sync; everything lives in browser storage.
- No real food database — a preset Spanish 9-item list; food images in seed data are remote Google-hosted URLs, not committed assets.
- Default goals in seed data: 2400 kcal, 160 g protein, 300 g carbs, 70 g fat; weight history 78.5 → 77.5 kg; budget goal $200.
- Dark-only theme, mobile-first layout with a max-width ~xl column.

## Brand Commitments

- Product name: Vora (tagline "Nutrición Arquitectónica").
- Interface and voice stay Mexican Spanish.
- Keep the meal-prep angle: despensa (pantry), presupuesto (food budget), and weekly prep workflow are core to the product's identity.
- The Vora name is fixed.

## Evidence on Hand

- Seed data in `app/context/AppContext.tsx`: three sample meals (Oatmeal & Berries, Grilled Chicken Salad, Greek Yogurt Parfait), weight history, six pantry items, three budget entries, and an opening AI coach message.
- Sample food imagery referenced from remote Google-hosted URLs (not in-repo assets).
- No testimonials, customers, benchmarks, licensing, or marketing claims exist; future work must not fabricate them.

## Product Principles

- Precision: every figure shown — calories, macros, weight, spend — must be accurate and consistent across views.
- Spanish-first: copy stays natural Mexican Spanish; no mixed-language UI.
- Meal-prep centric: pantry and budget exist to support the weekly prep workflow, not generic shopping.
- Personal by default: the tool serves one owner's goals; goals and state must stay easy to adjust.
- AI as a coach, not a gimmick: coach and scan suggestions must reflect the owner's actual logged data.
