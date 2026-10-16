begin;

create extension if not exists pgcrypto;

create type public.vehicle_status as enum (
  'em_preparacao', 'a_venda', 'reservada', 'vendida', 'arquivada'
);

create type public.vehicle_cost_category as enum (
  'pecas', 'oficina', 'lavagem_polimento', 'despachante_cartorio',
  'ipva_licenciamento_multas', 'transporte_guincho', 'anuncios_marketing', 'outros'
);

create sequence public.vehicle_code_seq start 1;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('GV-' || lpad(nextval('public.vehicle_code_seq')::text, 6, '0')),
  brand text not null check (char_length(trim(brand)) between 1 and 80),
  model text not null check (char_length(trim(model)) between 1 and 120),
  model_year integer not null check (model_year between 1950 and extract(year from now())::integer + 2),
  plate text null check (plate is null or plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  entry_date date not null default current_date,
  purchase_price numeric(14,2) not null check (purchase_price >= 0),
  asking_price numeric(14,2) null check (asking_price is null or asking_price >= 0),
  status public.vehicle_status not null default 'em_preparacao',
  sold_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vehicles_plate_active_unique on public.vehicles (plate)
  where plate is not null and deleted_at is null;
create index vehicles_status_idx on public.vehicles (status) where deleted_at is null;
create index vehicles_entry_date_idx on public.vehicles (entry_date desc) where deleted_at is null;

create table public.vehicle_costs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  cost_date date not null default current_date,
  category public.vehicle_cost_category not null,
  amount numeric(14,2) not null check (amount > 0),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create index vehicle_costs_vehicle_idx on public.vehicle_costs (vehicle_id, cost_date desc);

create table public.vehicle_sales (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  sale_date date not null,
  sale_price numeric(14,2) not null check (sale_price > 0),
  sale_fees numeric(14,2) not null default 0 check (sale_fees >= 0),
  created_at timestamptz not null default now(),
  unique(vehicle_id)
);

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  path text not null unique,
  ord smallint not null check (ord between 0 and 11),
  created_at timestamptz not null default now(),
  constraint vehicle_photos_vehicle_id_ord_key unique(vehicle_id, ord) deferrable initially deferred
);
create index vehicle_photos_vehicle_idx on public.vehicle_photos (vehicle_id, ord);

create table public.vehicle_evaluations (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  brand text not null,
  model text not null,
  model_year integer not null,
  fipe_value numeric(14,2) not null check (fipe_value >= 0),
  discount_percent numeric(5,2) not null check (discount_percent in (15,20,25)),
  additional_costs jsonb not null default '{}'::jsonb,
  additional_costs_total numeric(14,2) not null default 0 check (additional_costs_total >= 0),
  suggested_offer numeric(14,2) not null check (suggested_offer >= 0),
  source text not null,
  source_consulted_at timestamptz not null,
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index vehicle_evaluations_created_idx on public.vehicle_evaluations (created_at desc);

create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  vehicle_id uuid null references public.vehicles(id) on delete set null,
  dry_run boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();

create or replace function public.validate_vehicle_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare photo_count integer;
begin
  if new.status = 'a_venda' and old.status is distinct from new.status then
    select count(*) into photo_count from public.vehicle_photos where vehicle_id = new.id;
    if photo_count < 4 then
      raise exception 'São necessárias no mínimo 4 fotos para colocar o veículo à venda.';
    end if;
    if new.asking_price is null or new.asking_price <= 0 then
      raise exception 'Informe o valor anunciado antes de colocar o veículo à venda.';
    end if;
  end if;
  if old.status = 'vendida' and new.status <> 'vendida' then
    raise exception 'Veículos vendidos não podem ter o status alterado diretamente.';
  end if;
  return new;
end;
$$;

create trigger vehicles_validate_status before update of status on public.vehicles
for each row execute function public.validate_vehicle_status();

create or replace function public.register_vehicle_sale(
  p_vehicle_id uuid,
  p_sale_date date,
  p_sale_price numeric,
  p_sale_fees numeric default 0
)
returns public.vehicle_sales
language plpgsql
security invoker
set search_path = ''
as $$
declare result public.vehicle_sales;
begin
  if p_sale_price is null or p_sale_price <= 0 or p_sale_fees is null or p_sale_fees < 0 then
    raise exception 'Valores da venda inválidos.';
  end if;

  perform 1 from public.vehicles
    where id = p_vehicle_id and deleted_at is null and status <> 'vendida'
    for update;
  if not found then raise exception 'Veículo indisponível ou já vendido.'; end if;

  insert into public.vehicle_sales(vehicle_id, sale_date, sale_price, sale_fees)
  values (p_vehicle_id, p_sale_date, p_sale_price, p_sale_fees)
  returning * into result;

  update public.vehicles set status = 'vendida', sold_at = p_sale_date::timestamptz
  where id = p_vehicle_id;
  return result;
end;
$$;

create or replace function public.reorder_vehicle_photos(p_vehicle_id uuid, p_photo_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare photo_id uuid; idx integer := 0; actual_count integer;
begin
  select count(*) into actual_count from public.vehicle_photos where vehicle_id = p_vehicle_id;
  if actual_count <> coalesce(array_length(p_photo_ids, 1), 0) then
    raise exception 'A lista de fotos está incompleta.';
  end if;
  set constraints vehicle_photos_vehicle_id_ord_key deferred;
  foreach photo_id in array p_photo_ids loop
    update public.vehicle_photos set ord = idx where id = photo_id and vehicle_id = p_vehicle_id;
    if not found then raise exception 'Foto inválida.'; end if;
    idx := idx + 1;
  end loop;
end;
$$;

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
  p.cover_path
from public.vehicles v
left join lateral (
  select sum(amount) total_costs from public.vehicle_costs where vehicle_id = v.id
) c on true
left join public.vehicle_sales s on s.vehicle_id = v.id
left join lateral (
  select path cover_path from public.vehicle_photos where vehicle_id = v.id order by ord limit 1
) p on true;

create or replace view public.v_profit_by_month
with (security_invoker = true) as
select date_trunc('month', sale_date)::date as month,
  count(*)::integer as sales_count,
  sum(sale_price)::numeric(14,2) as gross_sales,
  sum(sale_fees)::numeric(14,2) as total_fees,
  sum(profit)::numeric(14,2) as total_profit
from public.v_vehicle_financials
where sale_id is not null and deleted_at is null
group by 1 order by 1 desc;

alter table public.vehicles enable row level security;
alter table public.vehicle_costs enable row level security;
alter table public.vehicle_sales enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.vehicle_evaluations enable row level security;
alter table public.automation_logs enable row level security;

create policy "authenticated_all_vehicles" on public.vehicles for all to authenticated using (true) with check (true);
create policy "authenticated_all_costs" on public.vehicle_costs for all to authenticated using (true) with check (true);
create policy "authenticated_all_sales" on public.vehicle_sales for all to authenticated using (true) with check (true);
create policy "authenticated_all_photos" on public.vehicle_photos for all to authenticated using (true) with check (true);
create policy "authenticated_all_evaluations" on public.vehicle_evaluations for all to authenticated using (true) with check (auth.uid() = user_id);
create policy "authenticated_read_logs" on public.automation_logs for select to authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "authenticated_read_vehicle_photos" on storage.objects for select to authenticated
using (bucket_id = 'vehicle-photos');
create policy "authenticated_insert_vehicle_photos" on storage.objects for insert to authenticated
with check (bucket_id = 'vehicle-photos');
create policy "authenticated_update_vehicle_photos" on storage.objects for update to authenticated
using (bucket_id = 'vehicle-photos') with check (bucket_id = 'vehicle-photos');
create policy "authenticated_delete_vehicle_photos" on storage.objects for delete to authenticated
using (bucket_id = 'vehicle-photos');

grant usage on sequence public.vehicle_code_seq to authenticated;
grant select on public.v_vehicle_financials, public.v_profit_by_month to authenticated;
grant execute on function public.register_vehicle_sale(uuid,date,numeric,numeric) to authenticated;
grant execute on function public.reorder_vehicle_photos(uuid,uuid[]) to authenticated;

commit;