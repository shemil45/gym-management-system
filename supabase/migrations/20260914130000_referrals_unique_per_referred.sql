-- `referral_code` on a referrals row is the *referrer's* member ID, so the
-- (gym_id, referral_code) unique index from 008 meant a member could refer
-- exactly one person, ever: the second enrolment with the same code failed
-- with a duplicate-key error the action never surfaced.
--
-- The invariant that actually holds is "a member is referred once". Keep the
-- plain code index for lookups; enforce uniqueness on the referred member.

drop index if exists public.idx_referrals_gym_code_unique;

create unique index if not exists idx_referrals_gym_referred_unique
  on public.referrals (gym_id, referred_id);

-- The non-unique (gym_id, referred_id) index is now redundant with the
-- unique one above.
drop index if exists public.idx_referrals_gym_referred;
