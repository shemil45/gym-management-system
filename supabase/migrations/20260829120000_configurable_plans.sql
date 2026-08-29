-- =============================================
-- Configurable subscription plans
--
-- Makes the plan catalogue editable from the Platform Portal instead of
-- living in seed SQL, and stops a plan edit from silently re-rating or
-- re-entitling the tenants already on that plan.
--
-- Two things are deliberately kept apart:
--   * platform_plan_features  - what a tier SELLS. Customer-facing.
--   * platform_feature_flags  - an operational kill switch per tenant.
-- They answer different questions ("what did they buy" vs "is this switched
-- on for them right now"), so merging them would mean internal keys like
-- `feature_flags` leaking into a pricing page.
-- =============================================

-- 1. Customer-facing feature catalogue ----------------------------------------
create table if not exists public.platform_plan_features (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_plan_features is
  'Sellable feature catalogue. Drives the plan editor checklist. Distinct from platform_feature_flags, which is the per-tenant operational kill switch.';

insert into public.platform_plan_features (key, label, description, sort_order)
values
  ('member_management',       'Member Management',       'Add, edit and search member records.',                        1),
  ('membership_management',   'Membership Management',   'Plans, renewals, freezes and expiry tracking.',               2),
  ('payments',                'Payments',                'Record payments, issue receipts and track dues.',             3),
  ('check_ins',               'Check-ins',               'Attendance capture and check-in history.',                    4),
  ('reports',                 'Reports',                 'Operational reports and exports.',                            5),
  ('analytics',               'Analytics',               'Revenue, retention and growth dashboards.',                   6),
  ('staff_management',        'Staff Management',        'Staff accounts, roles and permissions.',                      7),
  ('member_portal',           'Member Portal',           'Self-service portal where members sign in.',                   8),
  ('whatsapp_notifications',  'WhatsApp Notifications',  'Send member notifications over WhatsApp.',                     9),
  ('automated_notifications', 'Automated Notifications', 'Scheduled renewal, expiry and dues reminders.',               10),
  ('priority_support',        'Priority Support',        'Faster response times and a named support contact.',          11)
on conflict (key) do update
  set label = excluded.label,
      description = excluded.description,
      sort_order = excluded.sort_order;

alter table public.platform_plan_features enable row level security;

-- Same posture as the rest of the platform tables: reads for platform admins,
-- writes only through the service-role client behind requireCapability().
create policy "Platform admins read plan features"
  on public.platform_plan_features
  for select
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid() and pa.is_active
    )
  );

create trigger update_platform_plan_features_updated_at
  before update on public.platform_plan_features
  for each row execute function public.update_updated_at_column();

-- 2. Per-subscription entitlement snapshot ------------------------------------
-- One jsonb column rather than three scalar ones, because a null max_members
-- has to mean "unlimited" inside a snapshot while a missing snapshot has to
-- mean "follow the live plan". Separate nullable columns cannot express both.
alter table public.gym_subscriptions
  add column if not exists plan_entitlements jsonb,
  add column if not exists plan_entitlements_set_at timestamptz;

comment on column public.gym_subscriptions.plan_entitlements is
  'Frozen copy of the plan entitlements at assignment: {max_members, max_staff, features[]}. NULL means follow the live plan. A null max_members INSIDE the object means unlimited.';

-- 3. Freeze what existing tenants already have --------------------------------
-- Runs BEFORE the catalogue is rewritten below, so a tenant sold Starter at
-- 150 members keeps 150 when the list plan drops to 100. Pushing the new
-- numbers onto them is a deliberate act ("Apply to existing tenants" in the
-- plan editor), never a side effect of editing the price list.
update public.gym_subscriptions s
set plan_entitlements = jsonb_build_object(
      'max_members', to_jsonb(p.max_members),
      'max_staff', to_jsonb(p.max_staff),
      'features', p.features
    ),
    plan_entitlements_set_at = now()
from public.platform_subscription_plans p
where s.plan_id = p.id
  and s.plan_entitlements is null;

-- 4. Plan catalogue -----------------------------------------------------------
-- Scale is removed: it was seed data for a tier that was never sold and no
-- subscription references it.
delete from public.platform_subscription_plans where code = 'scale';

insert into public.platform_subscription_plans
  (name, code, description, price_monthly, price_annual, trial_days, grace_period_days,
   max_members, max_staff, sort_order, is_active, is_public, features)
values
  (
    'Free Trial', 'free_trial',
    'Full Growth access for 14 days. Assigned at signup; not self-selectable.',
    0, 0, 14, 0, 100, 3, 0, true, false,
    '["member_management","membership_management","payments","check_ins","reports","analytics","staff_management","member_portal","whatsapp_notifications","automated_notifications","priority_support"]'::jsonb
  ),
  (
    'Starter', 'starter',
    'Core gym operations for smaller teams.',
    1999, 19990, 0, 7, 100, 3, 1, true, true,
    '["member_management","membership_management","payments","check_ins","reports","analytics","staff_management","priority_support"]'::jsonb
  ),
  (
    'Growth', 'growth',
    'Everything in the platform, for gyms that have outgrown the basics.',
    4999, 49990, 0, 7, 500, 10, 2, true, true,
    '["member_management","membership_management","payments","check_ins","reports","analytics","staff_management","member_portal","whatsapp_notifications","automated_notifications","priority_support"]'::jsonb
  )
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      price_monthly = excluded.price_monthly,
      price_annual = excluded.price_annual,
      trial_days = excluded.trial_days,
      grace_period_days = excluded.grace_period_days,
      max_members = excluded.max_members,
      max_staff = excluded.max_staff,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active,
      is_public = excluded.is_public,
      features = excluded.features;
