-- ─────────────────────────────────────────────────────────────
-- VORA — Coach de gym · Esquema inicial (Fase 1)
-- Auth: Supabase (email + contraseña, auth.users)
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── Profiles (espejo de auth.users) ──────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ── Perfil de usuario (datos del onboarding) ────────────────
create table public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age int check (age between 14 and 100),
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric check (height_cm between 100 and 250),
  weight_kg numeric check (weight_kg between 30 and 300),
  goal text check (goal in ('lose_fat', 'gain_muscle', 'recomp', 'maintain')),
  experience text check (experience in ('beginner', 'intermediate', 'advanced')),
  training_days int check (training_days between 1 and 7),
  training_minutes int check (training_minutes between 15 and 180),
  equipment text,
  injuries text,
  split_pref text,
  weekly_budget numeric check (weekly_budget >= 0),
  dietary_prefs text,
  activity_level text,
  mode text not null default 'guided' check (mode in ('guided', 'manual')),
  updated_at timestamptz not null default now()
);

-- ── Catálogo de ejercicios (lectura pública, escritura dueño) ─
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_muscle text,
  secondary_muscles text[] default '{}',
  equipment text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  movement_pattern text,
  variation_group text,
  cues text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Planes de entrenamiento ──────────────────────────────────
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  split_type text,
  days_per_week int,
  source text not null default 'custom' check (source in ('generated', 'custom')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  name text,
  day_of_week int check (day_of_week between 0 and 6),
  position int,
  source text not null default 'custom' check (source in ('generated', 'custom'))
);

create table public.planned_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  custom_name text,
  sets int,
  reps_low int,
  reps_high int,
  rir int default 2,
  notes text,
  position int
);

-- ── Registro de entrenamiento ────────────────────────────────
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid references public.workout_days(id) on delete set null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  custom_name text,
  set_index int,
  reps int,
  weight_kg numeric,
  rir int,
  notes text,
  created_at timestamptz not null default now()
);

-- ── Plan de dieta ────────────────────────────────────────────
create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  weekly_budget numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans(id) on delete cascade,
  day_type text check (day_type in ('training', 'rest')),
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text,
  recipe text,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  cost_mxn numeric
);

-- ── Catálogo de alimentos ────────────────────────────────────
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  serving_g numeric,
  serving_unit text,
  price_mxn numeric,
  category text,
  source text not null default 'seed' check (source in ('seed', 'usda', 'user')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Registro de comidas (logging diario) ────────────────────
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references public.foods(id) on delete set null,
  custom_name text,
  quantity numeric not null default 1,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  cost_mxn numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- ── Progreso corporal ────────────────────────────────────────
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric,
  body_fat numeric,
  chest_cm numeric,
  waist_cm numeric,
  arm_cm numeric,
  notes text
);

-- ── RLS: activar en todas las tablas ─────────────────────────
alter table public.profiles enable row level security;
alter table public.user_profile enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.planned_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.diet_plans enable row level security;
alter table public.diet_meals enable row level security;
alter table public.foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.progress enable row level security;

-- ── Políticas ────────────────────────────────────────────────

-- profiles: cada quien su fila
create policy "select own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- user_profile: cada quien su fila
create policy "select own user_profile" on public.user_profile
  for select using (auth.uid() = user_id);
create policy "insert own user_profile" on public.user_profile
  for insert with check (auth.uid() = user_id);
create policy "update own user_profile" on public.user_profile
  for update using (auth.uid() = user_id);

-- ejercicios: catálogo legible por todos los autenticados
create policy "read exercises" on public.exercises
  for select using (auth.role() = 'authenticated');
create policy "write own exercises" on public.exercises
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- planes y días: solo dueño
create policy "own workout_plans" on public.workout_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workout_days" on public.workout_days
  for all using (auth.uid() = (select user_id from public.workout_plans wp where wp.id = plan_id))
  with check (auth.uid() = (select user_id from public.workout_plans wp where wp.id = plan_id));
create policy "own planned_exercises" on public.planned_exercises
  for all using (auth.uid() = (select wp.user_id
    from public.workout_days wd join public.workout_plans wp on wp.id = wd.plan_id
    where wd.id = workout_day_id))
  with check (auth.uid() = (select wp.user_id
    from public.workout_days wd join public.workout_plans wp on wp.id = wd.plan_id
    where wd.id = workout_day_id));

-- sesiones y logs de ejercicio: solo dueño
create policy "own workout_sessions" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercise_logs" on public.exercise_logs
  for all using (auth.uid() = (select s.user_id from public.workout_sessions s where s.id = session_id))
  with check (auth.uid() = (select s.user_id from public.workout_sessions s where s.id = session_id));

-- dieta: solo dueño
create policy "own diet_plans" on public.diet_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own diet_meals" on public.diet_meals
  for all using (auth.uid() = (select dp.user_id from public.diet_plans dp where dp.id = plan_id))
  with check (auth.uid() = (select dp.user_id from public.diet_plans dp where dp.id = plan_id));

-- alimentos: catálogo legible, escritura solo del creador
create policy "read foods" on public.foods
  for select using (auth.role() = 'authenticated');
create policy "write own foods" on public.foods
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- meal_logs: solo dueño
create policy "own meal_logs" on public.meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- progress: solo dueño
create policy "own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Trigger: crear profile al registrarse ────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
