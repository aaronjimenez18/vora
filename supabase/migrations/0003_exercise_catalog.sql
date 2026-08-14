-- ─────────────────────────────────────────────────────────────
-- VORA — Catálogo de ejercicios v2 (editor de rutinas)
-- Generado por scripts/gen-seed.mjs — no editar a mano.
-- Reemplaza el catálogo seed con el modelo de familias/equipo.
-- ─────────────────────────────────────────────────────────────

-- Ejercicios: familia, equipo concreto, unilateral e info
alter table public.exercises add column if not exists family text;
alter table public.exercises add column if not exists gear text;
alter table public.exercises add column if not exists unilateral_support boolean not null default false;
alter table public.exercises add column if not exists how_to text;
alter table public.exercises add column if not exists tips text;
create unique index if not exists exercises_slug_key on public.exercises (slug) where slug is not null;

-- Ejercicios planificados: atributo a un brazo / alternado
alter table public.planned_exercises add column if not exists unilateral boolean not null default false;

-- Días: focus para recomendar ejercicios
alter table public.workout_days add column if not exists focus text;
update public.workout_days set focus = lower(case
  when name ilike '%empuje%' then 'push'
  when name ilike '%tir%' or name ilike '%jal%' then 'pull'
  when name ilike '%pierna%' or name ilike '%lower%' then 'legs'
  when name ilike '%cuerpo completo%' or name ilike '%full%' then 'full_body'
  when name ilike '%upper%' or name ilike '%torso%' then 'upper'
  else null
end) where focus is null;

-- Re-seed: borra el catálogo estático y lo reinserta
delete from public.exercises where created_by is null;

insert into public.exercises (slug, name, primary_muscle, secondary_muscles, equipment, gear, family, unilateral_support, difficulty, movement_pattern, variation_group, cues, how_to, tips) values
  ('barbell-bench-press', 'Press de banca con barra', 'pecho', '{hombros,tríceps}', 'gym', 'barbell', 'press_banca', false, 'beginner', 'push', 'horizontal_push', null, null, null),
  ('dumbbell-bench-press', 'Press de banca con mancuernas', 'pecho', '{hombros,tríceps}', 'home_dumbbells', 'dumbbell', 'press_banca', false, 'beginner', 'push', 'horizontal_push', null, null, null),
  ('machine-chest-press', 'Press de pecho en máquina', 'pecho', '{tríceps}', 'gym', 'machine', 'press_banca', false, 'beginner', 'push', 'horizontal_push', null, null, null),
  ('push-up', 'Lagartijas', 'pecho', '{hombros,tríceps,core}', 'home_minimal', 'bodyweight', 'lagartijas', false, 'beginner', 'push', 'horizontal_push', 'Cuerpo en línea recta, baja hasta que el pecho toque el piso.', null, null),
  ('incline-barbell-press', 'Press inclinado con barra', 'pecho superior', '{hombros}', 'gym', 'barbell', 'press_inclinado', false, 'intermediate', 'push', 'incline_push', null, null, null),
  ('incline-dumbbell-press', 'Press inclinado con mancuernas', 'pecho superior', '{hombros,tríceps}', 'home_dumbbells', 'dumbbell', 'press_inclinado', false, 'beginner', 'push', 'incline_push', null, null, null),
  ('incline-machine-press', 'Press inclinado en máquina', 'pecho superior', '{hombros,tríceps}', 'gym', 'machine', 'press_inclinado', false, 'beginner', 'push', 'incline_push', null, null, null),
  ('dips', 'Fondos en paralelas', 'pecho inferior', '{tríceps,hombros}', 'gym', 'bodyweight', 'fondos', false, 'intermediate', 'push', 'dips', null, null, null),
  ('bench-dips', 'Fondos en banca', 'tríceps', '{pecho}', 'home_minimal', 'bodyweight', 'fondos', false, 'beginner', 'push', 'dips', null, null, null),
  ('barbell-overhead-press', 'Press militar con barra', 'hombros', '{tríceps}', 'gym', 'barbell', 'press_hombros', false, 'beginner', 'push', 'vertical_push', null, null, null),
  ('dumbbell-shoulder-press', 'Press de hombros con mancuernas', 'hombros', '{tríceps}', 'home_dumbbells', 'dumbbell', 'press_hombros', false, 'beginner', 'push', 'vertical_push', null, null, null),
  ('machine-shoulder-press', 'Press de hombros en máquina', 'hombros', '{tríceps}', 'gym', 'machine', 'press_hombros', false, 'beginner', 'push', 'vertical_push', null, null, null),
  ('pike-push-up', 'Lagartijas en pico', 'hombros', '{tríceps}', 'home_minimal', 'bodyweight', 'lagartijas', false, 'intermediate', 'push', 'vertical_push', null, null, null),
  ('lateral-raise', 'Elevaciones laterales', 'hombro lateral', '{}', 'home_dumbbells', 'dumbbell', 'elevacion_lateral', true, 'beginner', 'push', 'lateral_raise', null, null, null),
  ('cable-lateral-raise', 'Elevaciones laterales en polea', 'hombro lateral', '{}', 'gym', 'cable', 'elevacion_lateral', true, 'intermediate', 'push', 'lateral_raise', null, null, null),
  ('machine-lateral-raise', 'Elevaciones laterales en máquina', 'hombro lateral', '{}', 'gym', 'machine', 'elevacion_lateral', false, 'beginner', 'push', 'lateral_raise', null, null, null),
  ('front-raise', 'Elevaciones frontales', 'hombro frontal', '{}', 'home_dumbbells', 'dumbbell', 'elevacion_frontal', true, 'beginner', 'push', 'front_raise', null, null, null),
  ('cable-front-raise', 'Elevaciones frontales en polea', 'hombro frontal', '{}', 'gym', 'cable', 'elevacion_frontal', false, 'beginner', 'push', 'front_raise', null, null, null),
  ('rear-delt-fly', 'Vuelos posteriores', 'hombro posterior', '{espalda alta}', 'home_dumbbells', 'dumbbell', 'vuelo_posterior', false, 'beginner', 'pull', 'rear_delt', null, null, null),
  ('face-pull', 'Face pull en polea', 'hombro posterior', '{espalda alta}', 'gym', 'cable', 'vuelo_posterior', false, 'intermediate', 'pull', 'rear_delt', null, null, null),
  ('machine-rear-delt', 'Vuelos posteriores en máquina', 'hombro posterior', '{}', 'gym', 'machine', 'vuelo_posterior', false, 'beginner', 'pull', 'rear_delt', null, null, null),
  ('cable-fly', 'Aperturas en polea', 'pecho', '{}', 'gym', 'cable', 'aperturas_pecho', false, 'intermediate', 'push', 'fly', null, null, null),
  ('pec-deck', 'Pecho en máquina (peck deck)', 'pecho', '{}', 'gym', 'machine', 'aperturas_pecho', false, 'beginner', 'push', 'fly', null, null, null),
  ('dumbbell-fly', 'Aperturas con mancuernas', 'pecho', '{}', 'home_dumbbells', 'dumbbell', 'aperturas_pecho', true, 'intermediate', 'push', 'fly', null, null, null),
  ('dumbbell-pullover', 'Pullover con mancuerna', 'pecho', '{dorsales}', 'home_dumbbells', 'dumbbell', 'pullover', false, 'intermediate', 'push', 'pullover', null, null, null),
  ('cable-pullover', 'Pullover en polea', 'pecho', '{dorsales}', 'gym', 'cable', 'pullover', false, 'intermediate', 'push', 'pullover', null, null, null),
  ('triceps-pushdown', 'Extensiones de tríceps en polea', 'tríceps', '{}', 'gym', 'cable', 'triceps_extension', true, 'beginner', 'push', 'triceps_pressdown', null, null, null),
  ('cable-overhead-triceps-unilateral', 'Extensión de tríceps en polea (a un brazo)', 'tríceps', '{}', 'gym', 'cable', 'triceps_extension', true, 'intermediate', 'push', 'triceps_pressdown', null, null, null),
  ('dumbbell-overhead-extension', 'Extensión de tríceps sobre la cabeza', 'tríceps', '{}', 'home_dumbbells', 'dumbbell', 'triceps_extension', true, 'intermediate', 'push', 'triceps_pressdown', null, null, null),
  ('skull-crusher', 'Rompe cráneos (acostado)', 'tríceps', '{}', 'gym', 'barbell', 'triceps_extension', true, 'intermediate', 'push', 'triceps_pressdown', null, null, null),
  ('machine-triceps-extension', 'Extensión de tríceps en máquina', 'tríceps', '{}', 'gym', 'machine', 'triceps_extension', false, 'beginner', 'push', 'triceps_pressdown', null, null, null),
  ('pull-up', 'Dominadas', 'dorsales', '{bíceps,espalda media}', 'gym', 'bodyweight', 'dominadas', false, 'intermediate', 'pull', 'vertical_pull', null, null, null),
  ('chin-up', 'Dominadas supinas', 'dorsales', '{bíceps}', 'gym', 'bodyweight', 'dominadas', false, 'intermediate', 'pull', 'vertical_pull', null, null, null),
  ('lat-pulldown', 'Jalón al pecho', 'dorsales', '{bíceps}', 'gym', 'machine', 'dominadas', false, 'beginner', 'pull', 'vertical_pull', null, null, null),
  ('assisted-pull-up', 'Dominadas asistidas', 'dorsales', '{bíceps}', 'gym', 'machine', 'dominadas', false, 'beginner', 'pull', 'vertical_pull', null, null, null),
  ('inverted-row', 'Remo invertido', 'espalda media', '{dorsales,bíceps}', 'home_minimal', 'bodyweight', 'remo', false, 'beginner', 'pull', 'row', null, null, null),
  ('barbell-row', 'Remo con barra', 'espalda media', '{dorsales,bíceps}', 'gym', 'barbell', 'remo', false, 'intermediate', 'pull', 'row', null, null, null),
  ('dumbbell-row', 'Remo con mancuerna', 'espalda media', '{dorsales,bíceps}', 'home_dumbbells', 'dumbbell', 'remo', true, 'beginner', 'pull', 'row', null, null, null),
  ('cable-seated-row', 'Remo sentado en polea', 'espalda media', '{dorsales,bíceps}', 'gym', 'cable', 'remo', false, 'beginner', 'pull', 'row', null, null, null),
  ('machine-row', 'Remo en máquina', 'espalda media', '{dorsales}', 'gym', 'machine', 'remo', false, 'beginner', 'pull', 'row', null, null, null),
  ('one-arm-dumbbell-row', 'Remo a un brazo', 'dorsales', '{espalda media}', 'home_dumbbells', 'dumbbell', 'remo', false, 'beginner', 'pull', 'row', null, null, null),
  ('barbell-deadlift', 'Peso muerto con barra', 'isquiotibiales', '{glúteos,espalda,core}', 'gym', 'barbell', 'peso_muerto', false, 'intermediate', 'pull', 'deadlift', 'Espalda neutral, la barra pega a las piernas.', null, null),
  ('romanian-deadlift', 'Peso muerto rumano', 'isquiotibiales', '{glúteos}', 'gym', 'barbell', 'peso_muerto', false, 'intermediate', 'pull', 'deadlift', null, null, null),
  ('dumbbell-rdl', 'Peso muerto rumano con mancuernas', 'isquiotibiales', '{glúteos}', 'home_dumbbells', 'dumbbell', 'peso_muerto', false, 'beginner', 'pull', 'deadlift', null, null, null),
  ('kettlebell-swing', 'Balanceo con kettlebell', 'glúteos', '{isquiotibiales,erectores espinales,core}', 'home_dumbbells', 'dumbbell', 'peso_muerto', false, 'intermediate', 'power', 'deadlift', null, null, null),
  ('barbell-curl', 'Curl con barra', 'bíceps', '{}', 'gym', 'barbell', 'curl_biceps', true, 'beginner', 'pull', 'biceps_curl', null, null, null),
  ('dumbbell-curl', 'Curl con mancuernas', 'bíceps', '{}', 'home_dumbbells', 'dumbbell', 'curl_biceps', true, 'beginner', 'pull', 'biceps_curl', null, null, null),
  ('incline-dumbbell-curl', 'Curl con mancuernas en banco inclinado', 'bíceps', '{}', 'home_dumbbells', 'dumbbell', 'curl_biceps', true, 'intermediate', 'pull', 'biceps_curl', null, null, null),
  ('cable-curl', 'Curl en polea', 'bíceps', '{}', 'gym', 'cable', 'curl_biceps', true, 'beginner', 'pull', 'biceps_curl', null, null, null),
  ('hammer-curl', 'Curl martillo', 'braquial', '{bíceps}', 'home_dumbbells', 'dumbbell', 'curl_biceps', true, 'beginner', 'pull', 'biceps_curl', null, null, null),
  ('machine-curl', 'Curl en máquina', 'bíceps', '{}', 'gym', 'machine', 'curl_biceps', false, 'beginner', 'pull', 'biceps_curl', null, null, null),
  ('barbell-back-squat', 'Sentadilla trasera', 'cuádriceps', '{glúteos,isquiotibiales}', 'gym', 'barbell', 'sentadilla', false, 'intermediate', 'legs', 'squat', null, null, null),
  ('front-squat', 'Sentadilla frontal', 'cuádriceps', '{glúteos,erectores espinales}', 'gym', 'barbell', 'sentadilla', false, 'intermediate', 'legs', 'squat', null, null, null),
  ('goblet-squat', 'Sentadilla goblet', 'cuádriceps', '{glúteos}', 'home_dumbbells', 'dumbbell', 'sentadilla', false, 'beginner', 'legs', 'squat', null, null, null),
  ('bodyweight-squat', 'Sentadilla a peso corporal', 'cuádriceps', '{glúteos}', 'home_minimal', 'bodyweight', 'sentadilla', false, 'beginner', 'legs', 'squat', null, null, null),
  ('leg-press', 'Prensa de pierna', 'cuádriceps', '{glúteos}', 'gym', 'machine', 'sentadilla', false, 'beginner', 'legs', 'squat', null, null, null),
  ('bulgarian-split-squat', 'Sentadilla búlgara', 'cuádriceps', '{glúteos}', 'home_dumbbells', 'dumbbell', 'zancada', false, 'intermediate', 'legs', 'lunge', null, null, null),
  ('dumbbell-lunge', 'Zancadas con mancuernas', 'cuádriceps', '{glúteos}', 'home_dumbbells', 'dumbbell', 'zancada', false, 'beginner', 'legs', 'lunge', null, null, null),
  ('walking-lunge', 'Zancadas caminando', 'cuádriceps', '{glúteos}', 'home_minimal', 'bodyweight', 'zancada', false, 'beginner', 'legs', 'lunge', null, null, null),
  ('step-up', 'Subir a un escalón', 'cuádriceps', '{glúteos}', 'home_minimal', 'bodyweight', 'zancada', false, 'beginner', 'legs', 'lunge', null, null, null),
  ('hip-thrust', 'Empuje de cadera con barra', 'glúteos', '{isquiotibiales}', 'gym', 'barbell', 'empuje_cadera', false, 'beginner', 'legs', 'glute_hinge', null, null, null),
  ('dumbbell-hip-thrust', 'Empuje de cadera con mancuernas', 'glúteos', '{isquiotibiales}', 'home_dumbbells', 'dumbbell', 'empuje_cadera', false, 'beginner', 'legs', 'glute_hinge', null, null, null),
  ('glute-bridge', 'Puente de glúteo', 'glúteos', '{isquiotibiales,core}', 'home_minimal', 'bodyweight', 'empuje_cadera', false, 'beginner', 'legs', 'glute_hinge', null, null, null),
  ('cable-glute-kickback', 'Patada de glúteo en polea', 'glúteos', '{isquiotibiales}', 'gym', 'cable', 'gluteo_iso', true, 'beginner', 'legs', 'glute_iso', null, null, null),
  ('hip-abduction-machine', 'Apertura de cadera en máquina', 'abductores', '{}', 'gym', 'machine', 'abductores', false, 'beginner', 'legs', 'hip_abduction', null, null, null),
  ('leg-extension', 'Extensión de cuádriceps', 'cuádriceps', '{}', 'gym', 'machine', 'cuadriceps_iso', false, 'beginner', 'legs', 'quad_iso', null, null, null),
  ('leg-curl', 'Curl femoral', 'isquiotibiales', '{}', 'gym', 'machine', 'isquio_iso', false, 'beginner', 'legs', 'ham_iso', null, null, null),
  ('nordic-curl', 'Curl nórdico', 'isquiotibiales', '{}', 'home_minimal', 'bodyweight', 'isquio_iso', false, 'advanced', 'legs', 'ham_iso', null, null, null),
  ('standing-calf-raise', 'Elevación de gemelos de pie', 'gemelos', '{}', 'home_minimal', 'bodyweight', 'gemelos', false, 'beginner', 'legs', 'calf', null, null, null),
  ('seated-calf-raise', 'Elevación de gemelos sentado', 'gemelos', '{}', 'gym', 'machine', 'gemelos', false, 'beginner', 'legs', 'calf', null, null, null),
  ('plank', 'Plancha', 'abdomen', '{core}', 'home_minimal', 'bodyweight', 'plancha', false, 'beginner', 'core', 'plank', 'Glúteos apretados, no dejes caer la cadera.', null, null),
  ('side-plank', 'Plancha lateral', 'oblicuos', '{core}', 'home_minimal', 'bodyweight', 'plancha', false, 'beginner', 'core', 'plank', null, null, null),
  ('hanging-leg-raise', 'Elevación de piernas colgado', 'abdomen', '{flexores de cadera}', 'gym', 'bodyweight', 'elevacion_piernas', false, 'intermediate', 'core', 'leg_raise', null, null, null),
  ('lying-leg-raise', 'Elevación de piernas acostado', 'abdomen', '{}', 'home_minimal', 'bodyweight', 'elevacion_piernas', false, 'beginner', 'core', 'leg_raise', null, null, null),
  ('cable-crunch', 'Crunch en polea', 'abdomen', '{}', 'gym', 'cable', 'crunch', false, 'beginner', 'core', 'crunch', null, null, null),
  ('russian-twist', 'Giros rusos', 'oblicuos', '{abdomen}', 'home_minimal', 'bodyweight', 'crunch', false, 'beginner', 'core', 'crunch', null, null, null),
  ('ab-wheel', 'Rueda abdominal', 'abdomen', '{core}', 'home_minimal', 'bodyweight', 'crunch', false, 'intermediate', 'core', 'crunch', null, null, null),
  ('pallof-press', 'Pallof press', 'oblicuos', '{core}', 'gym', 'cable', 'pallof', false, 'beginner', 'core', 'anti_rotation', null, null, null),
  ('dead-bug', 'Insecto muerto', 'abdomen', '{core}', 'home_minimal', 'bodyweight', 'anti_extension', false, 'beginner', 'core', 'anti_extension', null, null, null),
  ('box-jump', 'Salto al cajón', 'cuádriceps', '{glúteos,gemelos}', 'home_minimal', 'bodyweight', 'potencia', false, 'beginner', 'power', 'power_legs', null, null, null),
  ('medball-chest-throw', 'Lanzamiento de balón medicinal', 'pecho', '{hombros,tríceps}', 'home_minimal', 'bodyweight', 'potencia', false, 'beginner', 'power', 'power_push', null, null, null),
  ('sled-push', 'Empuje de trineo', 'cuádriceps', '{glúteos,gemelos}', 'gym', 'bodyweight', 'potencia', false, 'beginner', 'power', 'power_legs', null, null, null),
  ('farmer-carry', 'Carga del granjero con mancuernas', 'agarre', '{trapecios,core}', 'gym', 'dumbbell', 'carga', false, 'beginner', 'carry', 'carry', null, null, null),
  ('dumbbell-farmer-carry', 'Carga del granjero', 'agarre', '{trapecios,core}', 'home_dumbbells', 'dumbbell', 'carga', false, 'beginner', 'carry', 'carry', null, null, null),
  ('suitcase-carry', 'Carga maleta', 'oblicuos', '{agarre}', 'home_dumbbells', 'dumbbell', 'carga', false, 'intermediate', 'carry', 'carry', null, null, null)
on conflict (slug) where slug is not null do nothing;
