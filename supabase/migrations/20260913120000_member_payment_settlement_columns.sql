-- A pending self-service payment must carry everything needed to apply the
-- membership later without the member's browser: the plan bought and the
-- referral coins reserved. Both were only recoverable from free text in
-- `notes` before, which is not a basis for the Razorpay webhook to extend a
-- membership on. Nullable / defaulted so admin-recorded payments are untouched.
alter table public.payments
  add column if not exists membership_plan_id uuid references public.membership_plans(id) on delete set null,
  add column if not exists referral_coins_used integer not null default 0
    check (referral_coins_used >= 0);

comment on column public.payments.membership_plan_id is
  'Plan applied when this payment settles. Set for self-service (Razorpay) purchases.';
comment on column public.payments.referral_coins_used is
  'Referral coins reserved against this payment; deducted from the member when it settles.';
