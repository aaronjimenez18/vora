-- 0010: micronutrientes en el registro de comida (para la foto IA)
alter table public.meal_logs
  add column if not exists micros jsonb;
