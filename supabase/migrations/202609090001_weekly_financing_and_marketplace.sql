begin;

alter table public.store_financed_sales
  add column payment_frequency text not null default 'mensal'
  check (payment_frequency in ('mensal', 'semanal'));

alter table public.store_financed_sales
  drop constraint if exists store_financed_sales_installment_count_check;

alter table public.store_financed_sales
  add constraint store_financed_sales_installment_count_by_frequency_check check (
    (payment_frequency = 'mensal' and installment_count between 1 and 72)
    or (payment_frequency = 'semanal' and installment_count between 1 and 312)
  );

create or replace function public.installment_due_date(
  p_first_due_date date,
  p_installment_offset integer,
  p_payment_frequency text
)
returns date
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
begin
  if p_payment_frequency = 'semanal' then
    return p_first_due_date + (p_installment_offset * 7);
  end if;
  if p_payment_frequency = 'mensal' then
    return public.monthly_due_date(p_first_due_date, p_installment_offset);
  end if;
  raise exception 'Periodicidade de pagamento inválida.';
end;
$$;

create function public.register_store_financed_sale(
  p_vehicle_id uuid,
  p_customer_name text,
  p_customer_cpf text,
  p_customer_phone text,
  p_customer_address text,
  p_sale_date date,
  p_down_payment numeric,
  p_installment_count integer,
  p_installment_amount numeric,
  p_first_due_date date,
  p_payment_frequency text,
  p_notes text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  financed_sale_id uuid;
  vehicle_sale_id uuid;
  total_amount numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;
  if p_payment_frequency not in ('mensal', 'semanal') then
    raise exception 'Periodicidade de pagamento inválida.';
  end if;
  if p_installment_count < 1
    or (p_payment_frequency = 'mensal' and p_installment_count > 72)
    or (p_payment_frequency = 'semanal' and p_installment_count > 312) then
    raise exception 'Quantidade de parcelas inválida para a periodicidade escolhida.';
  end if;
  if p_installment_amount <= 0 or p_down_payment < 0 then
    raise exception 'Valores do financiamento inválidos.';
  end if;
  if p_first_due_date < p_sale_date then
    raise exception 'O primeiro vencimento não pode ser anterior à venda.';
  end if;

  total_amount := p_down_payment + p_installment_count * p_installment_amount;

  select sale.id into vehicle_sale_id
  from public.register_vehicle_sale(p_vehicle_id, p_sale_date, total_amount, 0) sale;

  insert into public.store_financed_sales (
    vehicle_id, vehicle_sale_id, customer_name, customer_cpf, customer_phone,
    customer_address, sale_date, down_payment, installment_count,
    installment_amount, first_due_date, payment_frequency, notes, user_id
  ) values (
    p_vehicle_id, vehicle_sale_id, trim(p_customer_name), p_customer_cpf, p_customer_phone,
    trim(p_customer_address), p_sale_date, p_down_payment, p_installment_count,
    p_installment_amount, p_first_due_date, p_payment_frequency, coalesce(trim(p_notes), ''), auth.uid()
  ) returning id into financed_sale_id;

  insert into public.store_financed_installments (
    financed_sale_id, installment_number, due_date, amount
  )
  select financed_sale_id, item.installment_number,
    public.installment_due_date(p_first_due_date, item.installment_number - 1, p_payment_frequency),
    p_installment_amount
  from generate_series(1, p_installment_count) as item(installment_number);

  return financed_sale_id;
end;
$$;

create or replace view public.v_store_financing_summary
with (security_invoker = true)
as
select
  sale.id,
  sale.vehicle_id,
  sale.customer_name,
  sale.customer_cpf,
  sale.customer_phone,
  sale.sale_date,
  sale.down_payment,
  sale.installment_count,
  sale.installment_amount,
  sale.first_due_date,
  sale.total_sale_amount,
  sale.user_id,
  sale.created_at,
  vehicle.code as vehicle_code,
  vehicle.brand,
  vehicle.model,
  vehicle.model_year,
  vehicle.plate,
  count(installment.id) filter (where installment.paid_at is not null)::integer as paid_count,
  count(installment.id) filter (where installment.paid_at is null)::integer as pending_count,
  count(installment.id) filter (where installment.paid_at is null and installment.due_date < current_date)::integer as overdue_count,
  coalesce(sum(installment.amount) filter (where installment.paid_at is not null), 0)::numeric(14,2) as installments_received,
  (sale.down_payment + coalesce(sum(installment.amount) filter (where installment.paid_at is not null), 0))::numeric(14,2) as total_received,
  coalesce(sum(installment.amount) filter (where installment.paid_at is null), 0)::numeric(14,2) as outstanding_amount,
  coalesce(sum(installment.amount) filter (where installment.paid_at is null and installment.due_date < current_date), 0)::numeric(14,2) as overdue_amount,
  coalesce(sum(installment.amount) filter (where installment.paid_at is null and installment.due_date between current_date and current_date + 5), 0)::numeric(14,2) as due_soon_amount,
  min(installment.due_date) filter (where installment.paid_at is null) as next_due_date,
  case
    when count(installment.id) filter (where installment.paid_at is null) = 0 then 'quitado'
    when count(installment.id) filter (where installment.paid_at is null and installment.due_date < current_date) > 0 then 'atrasado'
    else 'ativo'
  end as financing_status,
  sale.payment_frequency
from public.store_financed_sales sale
join public.vehicles vehicle on vehicle.id = sale.vehicle_id
join public.store_financed_installments installment on installment.financed_sale_id = sale.id
group by sale.id, vehicle.id;

alter table public.vehicles
  add column catalog_description text not null default ''
  check (char_length(catalog_description) <= 1000),
  add column marketplace_reviewed boolean not null default true,
  add column marketplace_warranty boolean not null default true,
  add column marketplace_trade boolean not null default true,
  add column marketplace_financing boolean not null default true,
  add column marketplace_card_24x boolean not null default true;

comment on column public.vehicles.catalog_description is
  'Diferenciais específicos da moto exibidos no catálogo e usados na legenda de marketplace.';

grant select on public.v_store_financing_summary to authenticated;
grant execute on function public.installment_due_date(date,integer,text) to authenticated;
grant execute on function public.register_store_financed_sale(uuid,text,text,text,text,date,numeric,integer,numeric,date,text,text) to authenticated;

commit;