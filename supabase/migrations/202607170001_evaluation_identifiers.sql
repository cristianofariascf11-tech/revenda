begin;

alter table public.vehicle_evaluations
  add column if not exists chassis text null;

alter table public.vehicle_evaluations
  add column if not exists engine_number text null;

alter table public.vehicle_evaluations
  drop constraint if exists vehicle_evaluations_chassis_length_check;

alter table public.vehicle_evaluations
  add constraint vehicle_evaluations_chassis_length_check
  check (chassis is null or char_length(chassis) <= 80);

alter table public.vehicle_evaluations
  drop constraint if exists vehicle_evaluations_engine_number_length_check;

alter table public.vehicle_evaluations
  add constraint vehicle_evaluations_engine_number_length_check
  check (engine_number is null or char_length(engine_number) <= 80);

comment on column public.vehicle_evaluations.chassis is
  'Chassi informado pela API de placa ou confirmado manualmente. Pode estar mascarado.';

comment on column public.vehicle_evaluations.engine_number is
  'Numero do motor informado pela API de placa ou confirmado manualmente. Pode estar mascarado.';

commit;