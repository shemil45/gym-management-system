-- UP
-- Removes the redundant payment_reminder notification: membership_expiring already
-- covers the pre-expiry reminder use case, and GMS requires immediate payment so
-- there is no separate unpaid-payment reminder concept. Also splits the expiry
-- reminder category into two independently toggleable settings now that only
-- membership_expiring and membership_expired remain in it.

ALTER TABLE public.gyms
    DROP CONSTRAINT IF EXISTS gyms_notify_payment_reminder_days_range;

ALTER TABLE public.gyms
    DROP COLUMN IF EXISTS notify_payment_reminder_days;

ALTER TABLE public.gyms
    ADD COLUMN notify_expired_notice_enabled boolean NOT NULL DEFAULT true;

GRANT UPDATE (
    notify_expired_notice_enabled
) ON public.gyms TO authenticated;

-- DOWN / rollback
-- REVOKE UPDATE (notify_expired_notice_enabled) ON public.gyms FROM authenticated;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_expired_notice_enabled;
-- ALTER TABLE public.gyms ADD COLUMN notify_payment_reminder_days integer NOT NULL DEFAULT 3;
-- ALTER TABLE public.gyms ADD CONSTRAINT gyms_notify_payment_reminder_days_range CHECK (notify_payment_reminder_days BETWEEN 0 AND 90);
