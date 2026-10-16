begin;

alter table public.vehicles
  add column ownership_type text not null default 'propria'
  check (ownership_type in ('propria', 'consignada'));

alter table public.vehicles alter column purchase_price drop not null;

alter table public.vehicles
  add constraint vehicles_purchase_price_by_ownership_check check (
    (ownership_type = 'propria' and purchase_price is not null and purchase_price >= 0)
    or (ownership_type = 'consignada' and purchase_price is null)
  );

alter table public.vehicle_sales
  add column commission_amount numeric(14,2) null
  check (commission_amount is null or commission_amount > 0);

create or replace function public.validate_vehicle_sale_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_ownership text;
begin
  select ownership_type into selected_ownership
  from public.vehicles
  where id = new.vehicle_id;

  if selected_ownership = 'consignada' and new.commission_amount is null then
    raise exception 'Informe a comissão recebida na venda consignada.';
  end if;
  if selected_ownership = 'propria' and new.commission_amount is not null then
    raise exception 'Comissão deve ser informada somente para motos consignadas.';
  end if;
  return new;
end;
$$;

create trigger vehicle_sales_validate_ownership
before insert or update of vehicle_id, commission_amount on public.vehicle_sales
for each row execute function public.validate_vehicle_sale_ownership();

create or replace function public.prevent_sold_vehicle_ownership_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.ownership_type is distinct from new.ownership_type
    and exists (select 1 from public.vehicle_sales where vehicle_id = old.id) then
    raise exception 'O tipo de uma motocicleta vendida não pode ser alterado.';
  end if;
  return new;
end;
$$;

create trigger vehicles_prevent_sold_ownership_change
before update of ownership_type on public.vehicles
for each row execute function public.prevent_sold_vehicle_ownership_change();

drop function public.register_vehicle_sale(uuid,date,numeric,numeric);

create function public.register_vehicle_sale(
  p_vehicle_id uuid,
  p_sale_date date,
  p_sale_price numeric,
  p_sale_fees numeric default 0,
  p_commission_amount numeric default null
)
returns public.vehicle_sales
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.vehicle_sales;
  selected_ownership text;
begin
  if p_sale_price is null or p_sale_price <= 0 or p_sale_fees is null or p_sale_fees < 0 then
    raise exception 'Valores da venda inválidos.';
  end if;

  select ownership_type into selected_ownership
  from public.vehicles
  where id = p_vehicle_id and deleted_at is null and status <> 'vendida'
  for update;
  if not found then raise exception 'Veículo indisponível ou já vendido.'; end if;

  if selected_ownership = 'consignada' and (p_commission_amount is null or p_commission_amount <= 0) then
    raise exception 'Informe a comissão recebida na venda consignada.';
  end if;
  if selected_ownership = 'propria' then
    p_commission_amount := null;
  end if;

  insert into public.vehicle_sales(vehicle_id, sale_date, sale_price, sale_fees, commission_amount)
  values (p_vehicle_id, p_sale_date, p_sale_price, p_sale_fees, p_commission_amount)
  returning * into result;

  update public.vehicles set status = 'vendida', sold_at = p_sale_date::timestamptz
  where id = p_vehicle_id;
  return result;
end;
$$;

create or replace view public.v_vehicle_financials
with (security_invoker = true) as
select
  v.id, v.code, v.brand, v.model, v.model_year, v.plate, v.status, v.entry_date,
  v.purchase_price, v.asking_price, v.sold_at, v.deleted_at, v.created_at, v.updated_at,
  coalesce(c.total_costs, 0)::numeric(14,2) as total_costs,
  (coalesce(v.purchase_price, 0) + coalesce(c.total_costs, 0))::numeric(14,2) as total_invested,
  s.id as sale_id, s.sale_date, s.sale_price, coalesce(s.sale_fees,0)::numeric(14,2) as sale_fees,
  case when s.id is null then null else
    ((case when v.ownership_type = 'consignada' then s.commission_amount else s.sale_price end)
      - s.sale_fees - coalesce(v.purchase_price, 0) - coalesce(c.total_costs,0))::numeric(14,2)
  end as profit,
  greatest(0, (coalesce(s.sale_date, current_date) - v.entry_date))::integer as days_in_stock,
  p.cover_path,
  v.chassis,
  v.engine_number,
  v.ownership_type,
  s.commission_amount,
  case when s.id is null then null
    when v.ownership_type = 'consignada' then s.commission_amount
    else s.sale_price
  end::numeric(14,2) as financial_revenue
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
  sum(financial_revenue)::numeric(14,2) as gross_sales,
  sum(sale_fees)::numeric(14,2) as total_fees,
  sum(profit)::numeric(14,2) as total_profit
from public.v_vehicle_financials
where sale_id is not null and deleted_at is null
group by 1 order by 1 desc;

create or replace view public.v_financial_statement
with (security_invoker = true)
as
with movements as (
  select
    'purchase-' || vehicle.id::text as id,
    vehicle.entry_date as event_date,
    (vehicle.entry_date + time '08:00') at time zone 'America/Sao_Paulo' as event_at,
    'saida'::text as direction,
    'compra_veiculo'::text as category,
    'Compra da motocicleta'::text as description,
    vehicle.id as vehicle_id,
    vehicle.code as vehicle_code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text) as vehicle_label,
    vehicle.plate,
    vehicle.purchase_price::numeric(14,2) as amount
  from public.vehicles vehicle
  where vehicle.deleted_at is null
    and vehicle.ownership_type = 'propria'
    and vehicle.purchase_price > 0

  union all

  select
    'cost-' || cost.id::text,
    cost.cost_date,
    (cost.cost_date + time '10:00') at time zone 'America/Sao_Paulo',
    'saida'::text,
    cost.category::text,
    case when trim(cost.description) <> '' then cost.description
      else replace(initcap(cost.category::text), '_', ' ')
    end,
    vehicle.id,
    vehicle.code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text),
    vehicle.plate,
    cost.amount::numeric(14,2)
  from public.vehicle_costs cost
  join public.vehicles vehicle on vehicle.id = cost.vehicle_id
  where vehicle.deleted_at is null

  union all

  select
    'sale-fee-' || sale.id::text,
    sale.sale_date,
    (sale.sale_date + time '11:00') at time zone 'America/Sao_Paulo',
    'saida'::text,
    'taxa_venda'::text,
    'Taxas da venda'::text,
    vehicle.id,
    vehicle.code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text),
    vehicle.plate,
    sale.sale_fees::numeric(14,2)
  from public.vehicle_sales sale
  join public.vehicles vehicle on vehicle.id = sale.vehicle_id
  where vehicle.deleted_at is null and sale.sale_fees > 0

  union all

  select
    'cash-sale-' || sale.id::text,
    sale.sale_date,
    (sale.sale_date + time '12:00') at time zone 'America/Sao_Paulo',
    'entrada'::text,
    'venda_vista'::text,
    'Venda da motocicleta'::text,
    vehicle.id,
    vehicle.code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text),
    vehicle.plate,
    sale.sale_price::numeric(14,2)
  from public.vehicle_sales sale
  join public.vehicles vehicle on vehicle.id = sale.vehicle_id
  where vehicle.deleted_at is null
    and vehicle.ownership_type = 'propria'
    and not exists (
      select 1 from public.store_financed_sales financing
      where financing.vehicle_sale_id = sale.id
    )

  union all

  select
    'commission-' || sale.id::text,
    sale.sale_date,
    (sale.sale_date + time '12:00') at time zone 'America/Sao_Paulo',
    'entrada'::text,
    'comissao_consignacao'::text,
    'Comissão da venda consignada'::text,
    vehicle.id,
    vehicle.code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text),
    vehicle.plate,
    sale.commission_amount::numeric(14,2)
  from public.vehicle_sales sale
  join public.vehicles vehicle on vehicle.id = sale.vehicle_id
  where vehicle.deleted_at is null
    and vehicle.ownership_type = 'consignada'

  union all

  select
    'down-payment-' || financing.id::text,
    financing.sale_date,
    (financing.sale_date + time '12:00') at time zone 'America/Sao_Paulo',
    'entrada'::text,
    'entrada_financiamento'::text,
    'Entrada do financiamento - ' || financing.customer_name,
    vehicle.id,
    vehicle.code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text),
    vehicle.plate,
    financing.down_payment::numeric(14,2)
  from public.store_financed_sales financing
  join public.vehicles vehicle on vehicle.id = financing.vehicle_id
  where vehicle.deleted_at is null and vehicle.ownership_type = 'propria' and financing.down_payment > 0

  union all

  select
    'installment-' || installment.id::text,
    (installment.paid_at at time zone 'America/Sao_Paulo')::date,
    installment.paid_at,
    'entrada'::text,
    'parcela_financiamento'::text,
    'Parcela ' || installment.installment_number::text || '/' || financing.installment_count::text || ' - ' || financing.customer_name,
    vehicle.id,
    vehicle.code,
    concat_ws(' ', vehicle.brand, vehicle.model, vehicle.model_year::text),
    vehicle.plate,
    installment.amount::numeric(14,2)
  from public.store_financed_installments installment
  join public.store_financed_sales financing on financing.id = installment.financed_sale_id
  join public.vehicles vehicle on vehicle.id = financing.vehicle_id
  where vehicle.deleted_at is null and vehicle.ownership_type = 'propria' and installment.paid_at is not null
)
select
  movements.*,
  (sum(case when direction = 'entrada' then amount else -amount end)
    over (order by event_at, id rows between unbounded preceding and current row))::numeric(14,2) as balance
from movements;

grant execute on function public.register_vehicle_sale(uuid,date,numeric,numeric,numeric) to authenticated;
grant select on public.v_vehicle_financials, public.v_profit_by_month, public.v_financial_statement to authenticated;

commit;