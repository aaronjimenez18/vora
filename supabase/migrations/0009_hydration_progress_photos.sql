-- ─────────────────────────────────────────────────────────────
-- VORA — Hidratación + fotos de progreso (requiere 0001)
-- Tablas propias del usuario + bucket de storage privado.
-- Idempotente y aditivo.
-- ─────────────────────────────────────────────────────────────

-- Hidratación: un registro por usuario y día (vasos de 250 ml)
create table if not exists public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  glasses int not null default 0 check (glasses >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.hydration_logs enable row level security;
drop policy if exists "own hydration_logs" on public.hydration_logs;
create policy "own hydration_logs" on public.hydration_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fotos de progreso (la imagen vive en storage, aquí la metadata)
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  url text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.progress_photos enable row level security;
drop policy if exists "own progress_photos" on public.progress_photos;
create policy "own progress_photos" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bucket privado para las fotos
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- owner_id puede ser text o uuid según la versión de Supabase:
-- comparamos ambos lados como text para que sea portable.
drop policy if exists "own photos insert" on storage.objects;
create policy "own photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and auth.uid()::text = owner_id::text);

drop policy if exists "own photos select" on storage.objects;
create policy "own photos select" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and auth.uid()::text = owner_id::text);

drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'progress-photos' and auth.uid()::text = owner_id::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and auth.uid()::text = owner_id::text);
