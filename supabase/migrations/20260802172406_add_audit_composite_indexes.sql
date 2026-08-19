-- UP
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_status_expiry
ON public.members (status, membership_expiry_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_date
ON public.payments (payment_status, payment_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_checkins_member_time
ON public.check_ins (member_id, check_in_time);

-- DOWN / rollback
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_checkins_member_time;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_payments_status_date;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_members_status_expiry;
