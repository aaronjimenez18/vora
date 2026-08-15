-- ─────────────────────────────────────────────────────────────
-- VORA — Grasa corporal en el perfil (requiere 0001+0005)
-- Añade % de grasa corporal al perfil para BMR por masa magra
-- (Katch-McArdle) y seguimiento en el plan.
-- ─────────────────────────────────────────────────────────────

alter table public.user_profile add column if not exists body_fat numeric check (body_fat between 3 and 60);