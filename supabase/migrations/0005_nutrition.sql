-- ─────────────────────────────────────────────────────────────
-- VORA — Nutrición (catálogo USDA + precio + onboarding)
-- Generado por scripts/import-nutrition.mjs — no editar a mano.
-- Fuente: foods-catalog.db (18 alimentos USDA por 100 g/100 ml).
-- Política de precios: no fijar precio nacional; el precio vive en
-- price_records (ciudad/tienda/presentación/fecha). Additivo e
-- idempotente: funciona con o sin 0001/0003 aplicadas.
-- ─────────────────────────────────────────────────────────────

-- Catálogo: columnas del foods-catalog.db
alter table public.foods add column if not exists food_id text;
alter table public.foods add column if not exists fiber_g numeric;
alter table public.foods add column if not exists micronutrients jsonb not null default '[]'::jsonb;
alter table public.foods add column if not exists allergens jsonb not null default '[]'::jsonb;
alter table public.foods add column if not exists common_units jsonb not null default '[]'::jsonb;
alter table public.foods add column if not exists nutrient_source text;
create unique index if not exists foods_food_id_key on public.foods (food_id) where food_id is not null;

-- Catálogo USDA (source = 'usda'), sin precio fijo (price_mxn null)
insert into public.foods (food_id, name, calories, protein_g, carbs_g, fat_g, fiber_g, micronutrients, allergens, common_units, category, nutrient_source, source) values
  ('egg_whole', 'Huevo entero', 149, 12.6, 0.7, 10.6, 0, '["choline","vitamin_b12","selenium","vitamin_a"]', '["egg"]', '["pieza","100 g"]', 'animal_protein', 'USDA FoodData Central', 'usda'),
  ('chicken_breast_raw', 'Pechuga de pollo', 113, 22.5, 0, 2.6, 0, '["vitamin_b6","niacin","selenium","phosphorus"]', '[]', '["100 g","kg"]', 'animal_protein', 'USDA FoodData Central', 'usda'),
  ('chicken_thigh', 'Muslo de pollo', 154, 18.6, 0, 8.8, 0, '["vitamin_b6","niacin","selenium","zinc"]', '[]', '["100 g","kg"]', 'animal_protein', 'USDA FoodData Central', 'usda'),
  ('tuna_canned_water', 'Atún en agua', 102, 23.6, 0, 0.8, 0, '["vitamin_b12","selenium","niacin"]', '["fish"]', '["lata drenada","100 g"]', 'animal_protein', 'USDA FoodData Central', 'usda'),
  ('milk_low_fat', 'Leche baja en grasa', 43, 3.4, 5, 1, 0, '["calcium","vitamin_b12","riboflavin","vitamin_d_if_fortified"]', '["milk"]', '["vaso","100 ml"]', 'dairy', 'USDA FoodData Central', 'usda'),
  ('yogurt_plain', 'Yogur natural sin azúcar', 63, 3.5, 4.7, 3.3, 0, '["calcium","riboflavin","vitamin_b12"]', '["milk"]', '["vaso","100 g"]', 'dairy', 'USDA FoodData Central', 'usda'),
  ('beans_cooked', 'Frijoles cocidos', 135, 8.9, 23.7, 0.5, 6.4, '["iron","magnesium","potassium","folate"]', '[]', '["taza","100 g"]', 'legume', 'USDA FoodData Central', 'usda'),
  ('lentils_cooked', 'Lentejas cocidas', 120, 9, 20.1, 0.4, 7.9, '["iron","folate","potassium","magnesium"]', '[]', '["taza","100 g"]', 'legume', 'USDA FoodData Central', 'usda'),
  ('textured_soy_dry', 'Soya texturizada seca', 348, 52.9, 33, 0.5, 17.5, '["iron","calcium","magnesium"]', '["soy"]', '["100 g seca","porción hidratada"]', 'plant_protein', 'USDA FoodData Central', 'usda'),
  ('oats_dry', 'Avena seca', 382, 13.2, 67.7, 6.5, 10.1, '["magnesium","iron","thiamin","zinc"]', '["gluten_possible"]', '["taza","40 g","100 g"]', 'grain', 'USDA FoodData Central', 'usda'),
  ('rice_white_dry', 'Arroz blanco seco', 355, 7.1, 80, 0.7, 1.3, '["manganese","selenium","thiamin"]', '[]', '["taza cocida","100 g seco"]', 'grain', 'USDA FoodData Central', 'usda'),
  ('corn_tortilla', 'Tortilla de maíz', 227, 5.7, 44.6, 2.9, 5, '["calcium","magnesium","niacin"]', '[]', '["pieza","100 g"]', 'grain', 'USDA FoodData Central', 'usda'),
  ('potato', 'Papa', 79, 2, 17.5, 0.1, 2.2, '["potassium","vitamin_c","vitamin_b6"]', '[]', '["pieza","100 g"]', 'starchy_vegetable', 'USDA FoodData Central', 'usda'),
  ('banana', 'Plátano', 98, 1.1, 22.8, 0.3, 2.6, '["potassium","vitamin_b6","vitamin_c"]', '[]', '["pieza","100 g"]', 'fruit', 'USDA FoodData Central', 'usda'),
  ('orange', 'Naranja', 52, 0.9, 11.8, 0.1, 2.4, '["vitamin_c","folate","potassium"]', '[]', '["pieza","100 g"]', 'fruit', 'USDA FoodData Central', 'usda'),
  ('seasonal_vegetables', 'Verduras de temporada', 39, 2, 7, 0.3, 3, '["vitamin_c","vitamin_a","vitamin_k","potassium"]', '[]', '["taza","100 g","kg"]', 'vegetable', 'USDA FoodData Central; exact value depends on vegetable', 'usda'),
  ('peanut', 'Cacahuate', 610, 25.8, 16.1, 49.2, 8.5, '["magnesium","vitamin_e","niacin"]', '["peanut"]', '["30 g","100 g"]', 'fat_and_protein', 'USDA FoodData Central', 'usda'),
  ('avocado', 'Aguacate', 174, 2, 8.5, 14.7, 6.7, '["potassium","vitamin_e","vitamin_k","folate"]', '[]', '["pieza","100 g"]', 'fat_and_produce', 'USDA FoodData Central', 'usda')
on conflict (food_id) where food_id is not null do nothing;

-- price_records: precio no constante, fechado y por ubicación
create table if not exists public.price_records (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  price_mxn numeric not null check (price_mxn >= 0),
  unit text not null,
  package_size numeric,
  store_or_market text,
  city_or_region text,
  observed_at date not null default current_date,
  source text,
  price_type text not null default 'retail' check (price_type in ('retail', 'wholesale', 'promotional', 'user_entered', 'estimated')),
  confidence text not null default 'low' check (confidence in ('high', 'medium', 'low')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.price_records enable row level security;
drop policy if exists "read price_records" on public.price_records;
create policy "read price_records" on public.price_records
  for select using (auth.role() = 'authenticated');
drop policy if exists "write own price_records" on public.price_records;
create policy "write own price_records" on public.price_records
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Onboarding de nutrición (nutrition-onboarding.db)
alter table public.user_profile add column if not exists sex_for_equation text check (sex_for_equation in ('male', 'female'));
alter table public.user_profile add column if not exists occupation_activity text;
alter table public.user_profile add column if not exists steps_per_day int check (steps_per_day >= 0);
alter table public.user_profile add column if not exists strength_days_per_week int check (strength_days_per_week between 0 and 7);
alter table public.user_profile add column if not exists running_days_per_week int check (running_days_per_week between 0 and 7);
alter table public.user_profile add column if not exists average_session_minutes int check (average_session_minutes between 0 and 600);
alter table public.user_profile add column if not exists training_intensity text check (training_intensity in ('low', 'moderate', 'high'));
alter table public.user_profile add column if not exists cardio_minutes_per_week int check (cardio_minutes_per_week >= 0);
alter table public.user_profile add column if not exists budget_amount_mxn numeric check (budget_amount_mxn >= 0);
alter table public.user_profile add column if not exists budget_period text check (budget_period in ('per_day', 'per_week', 'per_month'));
alter table public.user_profile add column if not exists budget_includes_supplements boolean;
alter table public.user_profile add column if not exists budget_includes_eating_out boolean;
alter table public.user_profile add column if not exists household_size int check (household_size between 1 and 20);
alter table public.user_profile add column if not exists shared_foods boolean;
alter table public.user_profile add column if not exists shopping_frequency text check (shopping_frequency in ('daily', 'weekly', 'biweekly', 'monthly'));
alter table public.user_profile add column if not exists store_preferences text;
alter table public.user_profile add column if not exists diet_style text check (diet_style in ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'other'));
alter table public.user_profile add column if not exists allergies jsonb not null default '[]'::jsonb;
alter table public.user_profile add column if not exists intolerances jsonb not null default '[]'::jsonb;
alter table public.user_profile add column if not exists religious_restrictions text;
alter table public.user_profile add column if not exists foods_liked jsonb not null default '[]'::jsonb;
alter table public.user_profile add column if not exists foods_disliked jsonb not null default '[]'::jsonb;
alter table public.user_profile add column if not exists cooking_time_minutes int check (cooking_time_minutes between 0 and 600);
alter table public.user_profile add column if not exists kitchen_equipment jsonb not null default '[]'::jsonb;
alter table public.user_profile add column if not exists meals_per_day int check (meals_per_day between 1 and 8);
alter table public.user_profile add column if not exists snacks_per_day int check (snacks_per_day between 0 and 6);
alter table public.user_profile add column if not exists health_flags jsonb not null default '[]'::jsonb;
alter table public.user_profile add column if not exists output_preferences jsonb not null default '[]'::jsonb;

-- Fibra dietética (DRI: fibra incluida en el seguimiento)
alter table public.diet_plans add column if not exists fiber_g numeric;
alter table public.diet_meals add column if not exists fiber_g numeric;
alter table public.meal_logs add column if not exists fiber_g numeric;
alter table public.diet_plans add column if not exists screening jsonb;
