create type public.platform_role as enum ('owner', 'billing_admin', 'support_agent', 'analyst');
create type public.gym_onboarding_status as enum ('pending', 'in_progress', 'completed', 'stalled');
create type public.gym_platform_status as enum ('active', 'trialing', 'suspended', 'cancelled');
create type public.gym_subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'paused');
create type public.platform_billing_interval as enum ('monthly', 'annual');
create type public.platform_invoice_status as enum ('draft', 'open', 'paid', 'failed', 'void');
create type public.support_ticket_status as enum ('open', 'in_progress', 'waiting_on_gym', 'resolved', 'closed');
create type public.support_ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.support_actor_type as enum ('gym', 'platform');
create type public.announcement_audience_type as enum ('all', 'gym', 'plan_segment');
create type public.background_job_status as enum ('queued', 'running', 'completed', 'failed');
create type public.system_event_severity as enum ('info', 'warning', 'error', 'critical');

alter table public.gyms
  add column if not exists business_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists platform_status public.gym_platform_status not null default 'active',
  add column if not exists onboarding_status public.gym_onboarding_status not null default 'pending',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists platform_notes text;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role public.platform_role not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  price_monthly numeric(12,2) not null default 0,
  price_annual numeric(12,2) not null default 0,
  trial_days integer not null default 0,
  is_active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms(id) on delete cascade,
  plan_id uuid references public.platform_subscription_plans(id) on delete set null,
  status public.gym_subscription_status not null default 'trialing',
  billing_interval public.platform_billing_interval not null default 'monthly',
  currency_code text not null default 'INR',
  monthly_price numeric(12,2) not null default 0,
  annual_price numeric(12,2) not null default 0,
  discount_percentage numeric(5,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  free_extension_days integer not null default 0,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_invoice_at timestamptz,
  cancelled_at timestamptz,
  failed_payment_count integer not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid references public.gym_subscriptions(id) on delete set null,
  invoice_number text not null unique,
  status public.platform_invoice_status not null default 'open',
  currency_code text not null default 'INR',
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  due_at timestamptz,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.platform_admins(id) on delete set null,
  subject text not null,
  status public.support_ticket_status not null default 'open',
  priority public.support_ticket_priority not null default 'medium',
  summary text,
  tags text[] not null default '{}',
  last_message_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  sender_user_id uuid references public.profiles(id) on delete set null,
  sender_platform_admin_id uuid references public.platform_admins(id) on delete set null,
  sender_type public.support_actor_type not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.platform_admins(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_announcement_targets (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.platform_announcements(id) on delete cascade,
  audience_type public.announcement_audience_type not null,
  gym_id uuid references public.gyms(id) on delete cascade,
  plan_id uuid references public.platform_subscription_plans(id) on delete cascade,
  segment_key text,
  created_at timestamptz not null default now(),
  check (
    (audience_type = 'all' and gym_id is null and plan_id is null)
    or (audience_type = 'gym' and gym_id is not null and plan_id is null)
    or (audience_type = 'plan_segment' and plan_id is not null)
  )
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_platform_admin_id uuid references public.platform_admins(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  gym_id uuid references public.gyms(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  feature_flag_id uuid not null references public.platform_feature_flags(id) on delete cascade,
  is_enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, feature_flag_id)
);

create table if not exists public.platform_impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  started_by_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  banner_note text,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  ended_at timestamptz
);

create table if not exists public.background_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status public.background_job_status not null default 'queued',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity public.system_event_severity not null default 'info',
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_admins_user_id on public.platform_admins(user_id);
create index if not exists idx_gym_subscriptions_plan_id on public.gym_subscriptions(plan_id);
create index if not exists idx_gym_subscriptions_status on public.gym_subscriptions(status);
create index if not exists idx_gym_subscription_invoices_gym_id on public.gym_subscription_invoices(gym_id);
create index if not exists idx_gym_subscription_invoices_status on public.gym_subscription_invoices(status);
create index if not exists idx_support_tickets_gym_id on public.support_tickets(gym_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_last_message_at on public.support_tickets(last_message_at desc nulls last);
create index if not exists idx_support_ticket_messages_ticket_id on public.support_ticket_messages(ticket_id, created_at);
create index if not exists idx_platform_audit_logs_created_at on public.platform_audit_logs(created_at desc);
create index if not exists idx_platform_audit_logs_gym_id on public.platform_audit_logs(gym_id);
create index if not exists idx_platform_impersonation_sessions_user_gym on public.platform_impersonation_sessions(started_by_user_id, gym_id);
create index if not exists idx_platform_impersonation_sessions_active on public.platform_impersonation_sessions(started_by_user_id, expires_at desc) where ended_at is null;
create index if not exists idx_background_job_runs_status on public.background_job_runs(status, started_at desc);
create index if not exists idx_system_events_severity on public.system_events(severity, created_at desc);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists(
      select 1
      from public.platform_admins
      where user_id = auth.uid()
        and is_active = true
    ),
    false
  )
$$;

create or replace function public.current_platform_impersonation_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pis.gym_id
  from public.platform_impersonation_sessions pis
  join public.platform_admins pa on pa.id = pis.platform_admin_id
  where pa.user_id = auth.uid()
    and pa.is_active = true
    and pis.ended_at is null
    and pis.expires_at > now()
  order by pis.started_at desc
  limit 1
$$;

create or replace function public.is_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.admins
      where user_id = auth.uid()
        and gym_id = public.current_gym_id()
    )
    or public.current_platform_impersonation_gym_id() = public.current_gym_id(),
    false
  )
$$;

create or replace function public.user_has_gym_access(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.admins
      where user_id = auth.uid()
        and gym_id = target_gym_id
    )
    or exists (
      select 1
      from public.members
      where user_id = auth.uid()
        and gym_id = target_gym_id
    )
    or public.current_platform_impersonation_gym_id() = target_gym_id,
    false
  )
$$;

alter table public.platform_admins enable row level security;
alter table public.platform_subscription_plans enable row level security;
alter table public.gym_subscriptions enable row level security;
alter table public.gym_subscription_invoices enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.platform_announcements enable row level security;
alter table public.platform_announcement_targets enable row level security;
alter table public.platform_audit_logs enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.gym_feature_overrides enable row level security;
alter table public.platform_impersonation_sessions enable row level security;
alter table public.background_job_runs enable row level security;
alter table public.system_events enable row level security;

create policy "Platform admins can read platform admins"
  on public.platform_admins
  for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform owners can manage platform admins"
  on public.platform_admins
  to authenticated
  using (
    exists (
      select 1
      from public.platform_admins current_admin
      where current_admin.user_id = auth.uid()
        and current_admin.role = 'owner'
        and current_admin.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.platform_admins current_admin
      where current_admin.user_id = auth.uid()
        and current_admin.role = 'owner'
        and current_admin.is_active = true
    )
  );

create policy "Platform admins can manage plans"
  on public.platform_subscription_plans
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage subscriptions"
  on public.gym_subscriptions
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage invoices"
  on public.gym_subscription_invoices
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage support tickets"
  on public.support_tickets
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage support ticket messages"
  on public.support_ticket_messages
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage announcements"
  on public.platform_announcements
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage announcement targets"
  on public.platform_announcement_targets
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can read audit logs"
  on public.platform_audit_logs
  for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform admins can insert audit logs"
  on public.platform_audit_logs
  for insert
  to authenticated
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage feature flags"
  on public.platform_feature_flags
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage feature overrides"
  on public.gym_feature_overrides
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can manage impersonation sessions"
  on public.platform_impersonation_sessions
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can read monitoring"
  on public.background_job_runs
  for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform admins can insert monitoring jobs"
  on public.background_job_runs
  for insert
  to authenticated
  with check ((select public.is_platform_admin()));

create policy "Platform admins can update monitoring jobs"
  on public.background_job_runs
  for update
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "Platform admins can read system events"
  on public.system_events
  for select
  to authenticated
  using ((select public.is_platform_admin()));

create policy "Platform admins can insert system events"
  on public.system_events
  for insert
  to authenticated
  with check ((select public.is_platform_admin()));

create trigger update_platform_admins_updated_at
  before update on public.platform_admins
  for each row execute function public.update_updated_at_column();

create trigger update_platform_subscription_plans_updated_at
  before update on public.platform_subscription_plans
  for each row execute function public.update_updated_at_column();

create trigger update_gym_subscriptions_updated_at
  before update on public.gym_subscriptions
  for each row execute function public.update_updated_at_column();

create trigger update_gym_subscription_invoices_updated_at
  before update on public.gym_subscription_invoices
  for each row execute function public.update_updated_at_column();

create trigger update_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at_column();

create trigger update_platform_feature_flags_updated_at
  before update on public.platform_feature_flags
  for each row execute function public.update_updated_at_column();

create trigger update_gym_feature_overrides_updated_at
  before update on public.gym_feature_overrides
  for each row execute function public.update_updated_at_column();

insert into public.platform_subscription_plans (name, code, description, price_monthly, price_annual, trial_days, features)
values
  ('Starter', 'starter', 'For smaller gyms getting started on the platform.', 1999, 19990, 14, '["members", "payments", "check_ins"]'::jsonb),
  ('Growth', 'growth', 'For growing gyms that need analytics and support tooling.', 4999, 49990, 21, '["members", "payments", "check_ins", "analytics", "support"]'::jsonb),
  ('Scale', 'scale', 'For larger operators that need more control and overrides.', 9999, 99990, 30, '["members", "payments", "check_ins", "analytics", "support", "feature_flags"]'::jsonb)
on conflict (code) do nothing;

insert into public.platform_feature_flags (key, description, is_enabled)
values
  ('ai_trainer', 'Enable AI trainer experiences.', true),
  ('referrals', 'Enable referrals across gyms.', true),
  ('member_support', 'Enable the support center for gyms.', false),
  ('advanced_reports', 'Enable advanced analytics exports.', true)
on conflict (key) do nothing;

insert into public.gym_subscriptions (
  gym_id,
  status,
  billing_interval,
  plan_id,
  monthly_price,
  annual_price,
  trial_ends_at,
  current_period_start,
  current_period_end,
  next_invoice_at
)
select
  g.id,
  case when g.is_active then 'trialing'::public.gym_subscription_status else 'cancelled'::public.gym_subscription_status end,
  'monthly'::public.platform_billing_interval,
  p.id,
  p.price_monthly,
  p.price_annual,
  coalesce(g.trial_ends_at, g.created_at + interval '14 days'),
  g.created_at,
  g.created_at + interval '1 month',
  g.created_at + interval '1 month'
from public.gyms g
cross join lateral (
  select id, price_monthly, price_annual
  from public.platform_subscription_plans
  order by price_monthly asc, created_at asc
  limit 1
) p
on conflict (gym_id) do nothing;
