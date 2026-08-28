-- =============================================
-- SaaS billing: plan entitlements, grace periods, and payment records
-- Applied as `saas_billing_limits_grace_and_payments`.
-- =============================================

-- 1. Plan entitlements and lifecycle policy -----------------------------------
alter table public.platform_subscription_plans
  add column if not exists max_members integer,               -- null = unlimited
  add column if not exists max_staff integer,                 -- null = unlimited
  add column if not exists grace_period_days integer not null default 7,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_public boolean not null default true;

comment on column public.platform_subscription_plans.max_members is
  'Hard cap enforced on member creation. NULL means unlimited.';
comment on column public.platform_subscription_plans.grace_period_days is
  'Days a tenant keeps access after a failed renewal before the subscription expires.';
comment on column public.platform_subscription_plans.sort_order is
  'Tier ordering. Upgrade/downgrade direction is decided by this, not by price.';

update public.platform_subscription_plans
set sort_order = 1, max_members = 150, max_staff = 3, grace_period_days = 7
where code = 'starter';

update public.platform_subscription_plans
set sort_order = 2, max_members = 500, max_staff = 10, grace_period_days = 7
where code = 'growth';

update public.platform_subscription_plans
set sort_order = 3, max_members = null, max_staff = null, grace_period_days = 14
where code = 'scale';

-- 2. Subscription lifecycle ---------------------------------------------------
alter table public.gym_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancellation_reason text,
  add column if not exists grace_ends_at timestamptz,
  -- A downgrade is scheduled rather than applied immediately, so the tenant
  -- keeps what they paid for until the period they paid for ends.
  add column if not exists pending_plan_id uuid references public.platform_subscription_plans(id) on delete set null,
  add column if not exists pending_billing_interval public.platform_billing_interval,
  add column if not exists pending_effective_at timestamptz;

comment on column public.gym_subscriptions.grace_ends_at is
  'Set when a renewal fails. Access continues until this instant, then the subscription expires.';
comment on column public.gym_subscriptions.pending_plan_id is
  'Scheduled downgrade. Applied by the billing cron at pending_effective_at.';

create index if not exists idx_gym_subscriptions_period_end
  on public.gym_subscriptions(current_period_end)
  where status in ('active', 'trialing');

create index if not exists idx_gym_subscriptions_grace
  on public.gym_subscriptions(grace_ends_at)
  where grace_ends_at is not null;

-- 3. Payment records on platform invoices -------------------------------------
alter table public.gym_subscription_invoices
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_method text,
  add column if not exists plan_id uuid references public.platform_subscription_plans(id) on delete set null,
  add column if not exists billing_interval public.platform_billing_interval;

-- One invoice per Razorpay order: the verify path and the webhook can both
-- land on the same payment, and this is what stops a double credit.
create unique index if not exists idx_gym_subscription_invoices_razorpay_order
  on public.gym_subscription_invoices(razorpay_order_id)
  where razorpay_order_id is not null;

create index if not exists idx_gym_subscription_invoices_gym_issued
  on public.gym_subscription_invoices(gym_id, issued_at desc);

-- 4. Webhook idempotency ------------------------------------------------------
-- Razorpay retries deliveries. The unique constraint, not application logic,
-- is what guarantees an event is only applied once.
create table if not exists public.platform_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text not null,
  event_type text,
  gym_id uuid references public.gyms(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

alter table public.platform_webhook_events enable row level security;

create policy "Platform admins can read webhook events"
  on public.platform_webhook_events
  for select
  to authenticated
  using ((select public.is_platform_admin()));

-- 5. Invoice numbering for platform invoices ----------------------------------
create sequence if not exists public.platform_invoice_seq start 1000;

create or replace function public.next_platform_invoice_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'GMS' || to_char(now(), 'YYYYMM') || lpad(nextval('public.platform_invoice_seq')::text, 5, '0')
$$;
