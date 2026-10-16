begin;

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
  where vehicle.deleted_at is null and vehicle.purchase_price > 0

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
    and not exists (
      select 1 from public.store_financed_sales financing
      where financing.vehicle_sale_id = sale.id
    )

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
  where vehicle.deleted_at is null and financing.down_payment > 0

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
  where vehicle.deleted_at is null and installment.paid_at is not null
)
select
  movements.*,
  (sum(case when direction = 'entrada' then amount else -amount end)
    over (order by event_at, id rows between unbounded preceding and current row))::numeric(14,2) as balance
from movements;

grant select on public.v_financial_statement to authenticated;

commit;