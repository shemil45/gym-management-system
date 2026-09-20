-- Referral leads workflow.
--
-- A referral no longer starts when staff type a code at registration. It
-- starts when a friend opens a member's referral link and submits their
-- name, phone and email. That submission is a *lead*: a referrals row whose
-- `referred_id` is still null. Staff convert it by completing the normal
-- member registration, which fills `referred_id` and flips the status.
--
-- Lifecycle: pending -> converted | expired | cancelled. Expired and
-- cancelled rows are kept for reporting.
--
-- The existing table is extended rather than replaced: every report, the
-- member portal and the coin credit already read `referrals`, and a lead is
-- the same fact (member X referred person Y) before Y has a member row.

-- ─── referrals: lead fields, expiry, cancellation ───────────────────────────

alter table public.referrals
  add column if not exists referred_name text,
  add column if not exists referred_phone text,
  add column if not exists referred_email text,
  add column if not exists submitted_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists source text not null default 'staff';

alter table public.referrals
  drop constraint if exists referrals_source_check;
alter table public.referrals
  add constraint referrals_source_check check (source in ('link', 'staff'));

-- 'applied' meant "the referrer was credited", which happens at conversion;
-- the workflow names that state 'converted'. `applied_at` keeps its name and
-- is the conversion timestamp.
alter table public.referrals drop constraint if exists referrals_status_check;
update public.referrals set status = 'converted' where status = 'applied';
alter table public.referrals
  add constraint referrals_status_check
  check (status in ('pending', 'converted', 'expired', 'cancelled'));

-- A lead must carry the person's details; a staff-recorded referral must
-- carry the member. Either way the referrer is required.
alter table public.referrals drop constraint if exists referrals_lead_shape_check;
alter table public.referrals
  add constraint referrals_lead_shape_check check (
    referred_id is not null
    or (referred_name is not null and referred_phone is not null and submitted_at is not null and expires_at is not null)
  );

-- One active lead per person per gym. Partial unique indexes make the
-- duplicate check race-safe: two concurrent submissions of the same phone
-- cannot both insert.
create unique index if not exists idx_referrals_active_lead_phone
  on public.referrals (gym_id, referred_phone)
  where status = 'pending' and referred_id is null and referred_phone is not null;

create unique index if not exists idx_referrals_active_lead_email
  on public.referrals (gym_id, referred_email)
  where status = 'pending' and referred_id is null and referred_email is not null;

-- The leads view and the expiry sweep both walk pending rows by expiry.
create index if not exists idx_referrals_pending_expiry
  on public.referrals (gym_id, expires_at)
  where status = 'pending';

-- ─── members: referral link token ───────────────────────────────────────────

-- The share link identifies the referrer by a random token, not by member
-- ID or row id, so a link cannot be guessed or enumerated. Issued lazily the
-- first time the member opens their referral page; `referral_link_visits`
-- counts landing-page opens for the analytics funnel.
alter table public.members
  add column if not exists referral_token text,
  add column if not exists referral_token_created_at timestamptz,
  add column if not exists referral_link_visits integer not null default 0;

create unique index if not exists idx_members_referral_token
  on public.members (referral_token)
  where referral_token is not null;

-- ─── gym_notifications: in-app notices for gym staff ────────────────────────

-- The admin header already has a bell; this gives it something to show.
-- Rows are written by the service role (a public lead submission has no
-- session) and read/updated by staff of the gym.
create table if not exists public.gym_notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  type text not null check (type in ('referral_lead')),
  title text not null,
  body text not null,
  href text,
  referral_id uuid references public.referrals(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_gym_notifications_gym_unread
  on public.gym_notifications (gym_id, created_at desc)
  where read_at is null;

create index if not exists idx_gym_notifications_gym_recent
  on public.gym_notifications (gym_id, created_at desc);

alter table public.gym_notifications enable row level security;

create policy "Staff read current gym notifications"
  on public.gym_notifications
  for select
  to authenticated
  using (public.is_staff_user() and gym_id = public.current_gym_id());

create policy "Staff update current gym notifications"
  on public.gym_notifications
  for update
  to authenticated
  using (public.is_staff_user() and gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

grant select, update on table public.gym_notifications to authenticated;
grant all on table public.gym_notifications to service_role;

-- ─── expiry sweep ───────────────────────────────────────────────────────────

-- Expiry is also computed from `expires_at` wherever a lead is read, so the
-- UI and the conversion guard never depend on this having run. The sweep
-- keeps the stored status honest for reporting.
create or replace function public.expire_referral_leads()
returns integer
language sql
security definer
set search_path = public
as $$
  with expired as (
    update public.referrals
    set status = 'expired'
    where status = 'pending'
      and referred_id is null
      and expires_at is not null
      and expires_at <= now()
    returning id
  )
  select count(*)::integer from expired;
$$;

revoke all on function public.expire_referral_leads() from public, anon, authenticated;
grant execute on function public.expire_referral_leads() to service_role;
