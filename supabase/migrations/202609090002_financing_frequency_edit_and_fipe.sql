begin;

alter table public.vehicles
  add column fipe_reference_value numeric(14,2) null
  check (fipe_reference_value is null or fipe_reference_value >= 0);

comment on column public.vehicles.fipe_reference_value is
  'Valor FIPE mantido como referência interna para definição do preço anunciado.';

create or replace function public.update_store_financing_frequency(
  p_financed_sale_id uuid,
  p_payment_frequency text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_sale public.store_financed_sales;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;
  if p_payment_frequency not in ('mensal', 'semanal') then
    raise exception 'Periodicidade de pagamento inválida.';
  end if;

  select * into selected_sale
  from public.store_financed_sales
  where id = p_financed_sale_id and user_id = auth.uid()
  for update;

  if selected_sale.id is null then
    raise exception 'Financiamento não encontrado.';
  end if;
  if p_payment_frequency = 'mensal' and selected_sale.installment_count > 72 then
    raise exception 'O limite é de 72 parcelas mensais.';
  end if;

  update public.store_financed_sales
  set payment_frequency = p_payment_frequency
  where id = p_financed_sale_id;

  update public.store_financed_installments
  set due_date = public.installment_due_date(
    selected_sale.first_due_date,
    installment_number - 1,
    p_payment_frequency
  )
  where financed_sale_id = p_financed_sale_id
    and paid_at is null;
end;
$$;

grant execute on function public.update_store_financing_frequency(uuid,text) to authenticated;

-- Correção solicitada para o contrato já existente da POP (GV-000015).
update public.store_financed_sales
set payment_frequency = 'semanal'
where id = '79493359-8e80-471e-88fe-94caf4fbe7f3';

update public.store_financed_installments installment
set due_date = public.installment_due_date(
  sale.first_due_date,
  installment.installment_number - 1,
  sale.payment_frequency
)
from public.store_financed_sales sale
where sale.id = installment.financed_sale_id
  and sale.id = '79493359-8e80-471e-88fe-94caf4fbe7f3'
  and installment.paid_at is null;

commit;