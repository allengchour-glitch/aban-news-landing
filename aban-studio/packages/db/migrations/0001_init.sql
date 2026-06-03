-- Aban Studio — Initial schema + Row-Level Security
-- Target: Supabase Postgres (EU region eu-central-1)
-- Convention: every user-owned table is RLS-scoped to auth.uid().
--             credit_ledger and api_call_log are service-role-write only.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  locale               text not null default 'de-DE'
                         check (locale in ('de-DE','de-AT','de-CH')),
  country              text,                       -- DE / AT / CH
  vat_id               text,
  kleinunternehmer     boolean not null default false,
  credit_balance       integer not null default 0, -- materialized cache of credit_ledger
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- brand_profiles  (1 user -> many brands)
-- ---------------------------------------------------------------------------
create table public.brand_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  name                 text not null,
  tone                 text not null default 'Sie' check (tone in ('du','Sie')),
  forbidden_terms      text[] not null default '{}',  -- feeds brand-voice validator
  required_terms       text[] not null default '{}',
  channels             text[] not null default '{}',  -- linkedin, instagram, blog, ...
  target_audience      text,
  sample_texts         text[] not null default '{}',
  color_primary        text,                           -- hex, for image prompts
  logo_path            text,
  created_at           timestamptz not null default now()
);
create index brand_profiles_user_idx on public.brand_profiles(user_id);

-- ---------------------------------------------------------------------------
-- subscriptions  (mirror of Stripe state)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  plan                     text not null default 'base29',
  status                   text not null default 'incomplete',  -- Stripe status string
  included_credits_monthly integer not null default 250,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- credit_ledger  (append-only single source of truth for balance)
-- ---------------------------------------------------------------------------
create table public.credit_ledger (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  delta                integer not null,                 -- +grant/topup/refund, -generation/hold
  reason               text not null
                         check (reason in ('grant','topup','generation','hold','refund')),
  ref_job_id           uuid,
  ref_stripe_id        text,
  balance_after        integer not null,
  created_at           timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger(user_id, created_at);

-- ---------------------------------------------------------------------------
-- generation_jobs  (the package request; doubles as the work queue)
-- ---------------------------------------------------------------------------
create table public.generation_jobs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  brand_id             uuid references public.brand_profiles(id) on delete set null,
  status               text not null default 'queued'
                         check (status in ('queued','running','done','failed','partial')),
  input_topic          text not null,
  options              jsonb not null default '{}',   -- modalities, lengths, voice_id, image_count
  estimated_credits    integer not null default 0,
  actual_credits       integer,
  error                text,
  created_at           timestamptz not null default now(),
  completed_at         timestamptz
);
-- Worker claims jobs via: SELECT ... WHERE status='queued' FOR UPDATE SKIP LOCKED
create index generation_jobs_queue_idx on public.generation_jobs(status, created_at)
  where status = 'queued';
create index generation_jobs_user_idx on public.generation_jobs(user_id, created_at);

-- ---------------------------------------------------------------------------
-- content_assets  (one job -> many assets)
-- ---------------------------------------------------------------------------
create table public.content_assets (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references public.generation_jobs(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  kind                 text not null check (kind in ('text','image','audio')),
  channel              text,
  storage_path         text,        -- for image/audio in Supabase Storage
  text_body            text,        -- for text assets
  provider             text,
  model                text,
  prompt_used          text,
  ai_act_label         jsonb,       -- disclosure text + C2PA/marker reference
  voice_score          numeric(3,1),
  voice_passed         boolean,
  voice_violations     jsonb,
  version              integer not null default 1,
  status               text not null default 'ready',
  created_at           timestamptz not null default now()
);
create index content_assets_job_idx on public.content_assets(job_id);

-- ---------------------------------------------------------------------------
-- api_call_log  (margin/audit + AI-Act provenance; service-role only)
-- ---------------------------------------------------------------------------
create table public.api_call_log (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid references public.generation_jobs(id) on delete set null,
  asset_id             uuid references public.content_assets(id) on delete set null,
  provider             text not null,
  model                text,
  input_tokens         integer,
  output_tokens        integer,
  unit_cost_eur        numeric(10,6),
  billed_credits       integer,
  latency_ms           integer,
  created_at           timestamptz not null default now()
);
create index api_call_log_job_idx on public.api_call_log(job_id);

-- ---------------------------------------------------------------------------
-- consent_events  (DSGVO / AI-Act audit trail)
-- ---------------------------------------------------------------------------
create table public.consent_events (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  type                 text not null
                         check (type in ('tos','dpa','us_transfer_scc','ai_act_ack')),
  version              text not null,
  ip_hash              text,
  created_at           timestamptz not null default now()
);
create index consent_events_user_idx on public.consent_events(user_id);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.profiles        enable row level security;
alter table public.brand_profiles  enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.credit_ledger   enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.content_assets  enable row level security;
alter table public.api_call_log    enable row level security;
alter table public.consent_events  enable row level security;

-- profiles: a user sees/updates only their own row
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Owner read/write for the user-managed tables
create policy brand_self on public.brand_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy jobs_self on public.generation_jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy assets_self on public.content_assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Read-only for the user; writes happen via service role (bypasses RLS)
create policy subs_read_self on public.subscriptions
  for select using (user_id = auth.uid());

create policy ledger_read_self on public.credit_ledger
  for select using (user_id = auth.uid());

create policy consent_read_self on public.consent_events
  for select using (user_id = auth.uid());

-- api_call_log: no client policy at all -> only service role can read/write.

-- Note: the service-role key bypasses RLS for orchestrator/webhook writes
-- (credit grants, generation deductions, api_call_log, Stripe sync).
