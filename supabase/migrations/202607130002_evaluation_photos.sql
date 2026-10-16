begin;

alter table public.vehicle_evaluations
  add column if not exists photo_path text null;

alter table public.vehicle_evaluations
  drop constraint if exists vehicle_evaluations_photo_path_check;

alter table public.vehicle_evaluations
  add constraint vehicle_evaluations_photo_path_check
  check (photo_path is null or photo_path ~ '^evaluations/[0-9a-f-]{36}\.jpg$');

comment on column public.vehicle_evaluations.photo_path is
  'Caminho privado da foto da avaliação no bucket vehicle-photos.';

commit;