-- Tenant-side referral controls. The platform decides whether a gym's plan
-- includes referrals; these let the gym switch the programme off for
-- itself and set what a converted referral is worth.
alter table public.gyms
  add column if not exists referrals_enabled boolean not null default true,
  add column if not exists referral_bonus_coins integer not null default 100;

alter table public.gyms drop constraint if exists gyms_referral_bonus_coins_check;
alter table public.gyms
  add constraint gyms_referral_bonus_coins_check check (referral_bonus_coins >= 0 and referral_bonus_coins <= 100000);

-- Column-scoped grant, mirroring 20260819160500_gyms_column_scoped_grant.sql:
-- UPDATE on gyms is granted per column, so the new settings need their own.
grant update (referrals_enabled, referral_bonus_coins) on public.gyms to authenticated;
