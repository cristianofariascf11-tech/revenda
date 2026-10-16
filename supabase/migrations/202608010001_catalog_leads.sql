begin;

create type public.catalog_lead_interest as enum ('atendimento', 'financiamento');
create type public.catalog_lead_status as enum ('novo', 'contatado', 'convertido', 'descartado');

create table public.catalog_leads (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid null references public.vehicles(id) on delete set null,
  vehicle_name text not null check (char_length(trim(vehicle_name)) between 2 and 220),
  interest_type public.catalog_lead_interest not null,
  status public.catalog_lead_status not null default 'novo',
  full_name text not null check (char_length(trim(full_name)) between 3 and 160),
  age smallint not null check (age between 18 and 100),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  city text not null check (char_length(trim(city)) between 2 and 120),
  birth_date date null,
  cpf text null check (cpf is null or cpf ~ '^[0-9]{11}$'),
  has_proven_income boolean null,
  has_cnh_a boolean null,
  privacy_acknowledged boolean not null check (privacy_acknowledged),
  marketing_consent boolean not null default false,
  marketing_consented_at timestamptz null,
  request_fingerprint text null check (request_fingerprint is null or char_length(request_fingerprint) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_leads_financing_fields_check check (
    (
      interest_type = 'atendimento'
      and birth_date is null
      and cpf is null
      and has_proven_income is null
      and has_cnh_a is null
    )
    or
    (
      interest_type = 'financiamento'
      and birth_date is not null
      and cpf is not null
      and has_proven_income is not null
      and has_cnh_a is not null
    )
  ),
  constraint catalog_leads_marketing_consent_date_check check (
    (marketing_consent and marketing_consented_at is not null)
    or (not marketing_consent and marketing_consented_at is null)
  )
);

create index catalog_leads_created_idx on public.catalog_leads (created_at desc);
create index catalog_leads_status_idx on public.catalog_leads (status, created_at desc);
create index catalog_leads_phone_idx on public.catalog_leads (phone, created_at desc);
create index catalog_leads_fingerprint_idx on public.catalog_leads (request_fingerprint, created_at desc)
  where request_fingerprint is not null;
create index catalog_leads_marketing_idx on public.catalog_leads (created_at desc)
  where marketing_consent;

create trigger catalog_leads_set_updated_at before update on public.catalog_leads
for each row execute function public.set_updated_at();

alter table public.catalog_leads enable row level security;

create policy "authenticated_all_catalog_leads"
on public.catalog_leads for all to authenticated
using (true) with check (true);

revoke all on public.catalog_leads from anon;
grant select, update, delete on public.catalog_leads to authenticated;

commit;