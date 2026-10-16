begin;

create table public.store_financed_sales (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id),
  vehicle_sale_id uuid not null unique references public.vehicle_sales(id),
  customer_name text not null check (char_length(trim(customer_name)) between 3 and 160),
  customer_cpf text not null check (customer_cpf ~ '^[0-9]{11}$'),
  customer_phone text not null check (customer_phone ~ '^[0-9]{10,11}$'),
  customer_address text not null check (char_length(trim(customer_address)) between 5 and 500),
  sale_date date not null,
  down_payment numeric(14,2) not null default 0 check (down_payment >= 0),
  installment_count smallint not null check (installment_count between 1 and 72),
  installment_amount numeric(14,2) not null check (installment_amount > 0),
  first_due_date date not null,
  total_sale_amount numeric(14,2) generated always as
    (down_payment + installment_count::numeric * installment_amount) stored,
  notes text not null default '' check (char_length(notes) <= 1000),
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_due_date >= sale_date)
);

create index store_financed_sales_user_created_idx
  on public.store_financed_sales (user_id, created_at desc);
create index store_financed_sales_customer_idx
  on public.store_financed_sales (customer_name);

create table public.store_financed_installments (
  id uuid primary key default gen_random_uuid(),
  financed_sale_id uuid not null references public.store_financed_sales(id) on delete cascade,
  installment_number smallint not null check (installment_number > 0),
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz null,
  paid_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (financed_sale_id, installment_number),
  check ((paid_at is null and paid_by is null) or (paid_at is not null and paid_by is not null))
);

create index store_financed_installments_due_idx
  on public.store_financed_installments (due_date)
  where paid_at is null;
create index store_financed_installments_sale_idx
  on public.store_financed_installments (financed_sale_id, installment_number);

create trigger store_financed_sales_set_updated_at
before update on public.store_financed_sales
for each row execute function public.set_updated_at();

create trigger store_financed_installments_set_updated_at
before update on public.store_financed_installments
for each row execute function public.set_updated_at();

alter table public.store_financed_sales enable row level security;
alter table public.store_financed_installments enable row level security;

create policy "owner_all_store_financed_sales"
on public.store_financed_sales for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "owner_select_store_financed_installments"
on public.store_financed_installments for select to authenticated
using (exists (
  select 1 from public.store_financed_sales sale
  where sale.id = financed_sale_id and sale.user_id = auth.uid()
));

create policy "owner_insert_store_financed_installments"
on public.store_financed_installments for insert to authenticated
with check (exists (
  select 1 from public.store_financed_sales sale
  where sale.id = financed_sale_id and sale.user_id = auth.uid()
));

create policy "owner_update_store_financed_installments"
on public.store_financed_installments for update to authenticated
using (exists (
  select 1 from public.store_financed_sales sale
  where sale.id = financed_sale_id and sale.user_id = auth.uid()
))
with check (exists (
  select 1 from public.store_financed_sales sale
  where sale.id = financed_sale_id and sale.user_id = auth.uid()
));

create or replace function public.monthly_due_date(p_first_due_date date, p_months integer)
returns date
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  month_start date;
  last_day date;
  selected_day integer;
begin
  month_start := (date_trunc('month', p_first_due_date) + (p_months || ' months')::interval)::date;
  last_day := (month_start + interval '1 month - 1 day')::date;
  selected_day := least(extract(day from p_first_due_date)::integer, extract(day from last_day)::integer);
  return month_start + (selected_day - 1);
end;
$$;

create or replace function public.register_store_financed_sale(
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
  if p_installment_count < 1 or p_installment_count > 72 then
    raise exception 'A quantidade de parcelas deve estar entre 1 e 72.';
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
    installment_amount, first_due_date, notes, user_id
  ) values (
    p_vehicle_id, vehicle_sale_id, trim(p_customer_name), p_customer_cpf, p_customer_phone,
    trim(p_customer_address), p_sale_date, p_down_payment, p_installment_count,
    p_installment_amount, p_first_due_date, coalesce(trim(p_notes), ''), auth.uid()
  ) returning id into financed_sale_id;

  insert into public.store_financed_installments (
    financed_sale_id, installment_number, due_date, amount
  )
  select financed_sale_id, item.installment_number,
    public.monthly_due_date(p_first_due_date, item.installment_number - 1),
    p_installment_amount
  from generate_series(1, p_installment_count) as item(installment_number);

  return financed_sale_id;
end;
$$;

create or replace function public.set_store_installment_paid(
  p_installment_id uuid,
  p_paid boolean
)
returns public.store_financed_installments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.store_financed_installments;
begin
  update public.store_financed_installments
  set paid_at = case when p_paid then coalesce(paid_at, now()) else null end,
      paid_by = case when p_paid then auth.uid() else null end
  where id = p_installment_id
  returning * into result;

  if not found then
    raise exception 'Parcela não encontrada ou acesso negado.';
  end if;
  return result;
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
  end as financing_status
from public.store_financed_sales sale
join public.vehicles vehicle on vehicle.id = sale.vehicle_id
join public.store_financed_installments installment on installment.financed_sale_id = sale.id
group by sale.id, vehicle.id;

grant select on public.v_store_financing_summary to authenticated;
grant execute on function public.monthly_due_date(date,integer) to authenticated;
grant execute on function public.register_store_financed_sale(uuid,text,text,text,text,date,numeric,integer,numeric,date,text) to authenticated;
grant execute on function public.set_store_installment_paid(uuid,boolean) to authenticated;

commit;