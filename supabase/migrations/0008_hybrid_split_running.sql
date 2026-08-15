-- 0008: días híbridos (fuerza + running/cardio) y nivel de running
alter table public.workout_days
  add column if not exists day_type text not null default 'strength'
    check (day_type in ('strength', 'running', 'cardio'));

alter table public.workout_days
  add column if not exists cardio_spec jsonb;

alter table public.user_profile
  add column if not exists running_level text
    check (running_level in ('first_time', 'beginner', 'intermediate', 'advanced'));
