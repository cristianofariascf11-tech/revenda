begin;

alter table public.vehicles
  add column if not exists chassis text null;

alter table public.vehicles
  add column if not exists engine_number text null;

alter table public.vehicles
  drop constraint if exists vehicles_chassis_length_check;

alter table public.vehicles
  add constraint vehicles_chassis_length_check
  check (chassis is null or char_length(chassis) <= 80);

alter table public.vehicles
  drop constraint if exists vehicles_engine_number_length_check;

alter table public.vehicles
  add constraint vehicles_engine_number_length_check
  check (engine_number is null or char_length(engine_number) <= 80);

comment on column public.vehicles.chassis is
  'Chassi consultado na avaliacao ou confirmado no cadastro. Pode estar mascarado.';

comment on column public.vehicles.engine_number is
  'Numero do motor consultado na avaliacao ou confirmado no cadastro. Pode estar mascarado.';

create or replace view public.v_vehicle_financials
with (security_invoker = true) as
select
  v.id, v.code, v.brand, v.model, v.model_year, v.plate, v.status, v.entry_date,
  v.purchase_price, v.asking_price, v.sold_at, v.deleted_at, v.created_at, v.updated_at,
  coalesce(c.total_costs, 0)::numeric(14,2) as total_costs,
  (v.purchase_price + coalesce(c.total_costs, 0))::numeric(14,2) as total_invested,
  s.id as sale_id, s.sale_date, s.sale_price, coalesce(s.sale_fees,0)::numeric(14,2) as sale_fees,
  case when s.id is null then null else
    (s.sale_price - s.sale_fees - v.purchase_price - coalesce(c.total_costs,0))::numeric(14,2)
  end as profit,
  greatest(0, (coalesce(s.sale_date, current_date) - v.entry_date))::integer as days_in_stock,
  p.cover_path,
  v.chassis,
  v.engine_number
from public.vehicles v
left join lateral (
  select sum(amount) total_costs from public.vehicle_costs where vehicle_id = v.id
) c on true
left join public.vehicle_sales s on s.vehicle_id = v.id
left join lateral (
  select path cover_path from public.vehicle_photos where vehicle_id = v.id order by ord limit 1
) p on true;

grant select on public.v_vehicle_financials to authenticated;

commit;