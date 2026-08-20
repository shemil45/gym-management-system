-- UP
ALTER TABLE public.gyms
    ADD COLUMN notify_expiry_reminder_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN notify_expiry_reminder_days integer NOT NULL DEFAULT 7,
    ADD COLUMN notify_payment_reminder_days integer NOT NULL DEFAULT 3,
    ADD COLUMN notify_expired_notice_days integer NOT NULL DEFAULT 0,
    ADD COLUMN notify_payment_confirmation_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN notify_renewal_confirmation_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN notify_welcome_message_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_notify_expiry_reminder_days_range CHECK (notify_expiry_reminder_days BETWEEN 1 AND 90),
    ADD CONSTRAINT gyms_notify_payment_reminder_days_range CHECK (notify_payment_reminder_days BETWEEN 0 AND 90),
    ADD CONSTRAINT gyms_notify_expired_notice_days_range CHECK (notify_expired_notice_days BETWEEN 0 AND 90);

-- Column-scoped grant, mirroring 20260820150000_receipt_settings.sql
-- (additive: authenticated already has UPDATE restricted to a specific
-- column set by earlier settings migrations; this adds the new
-- notify_* columns to that allow-list without a REVOKE).
GRANT UPDATE (
    notify_expiry_reminder_enabled, notify_expiry_reminder_days,
    notify_payment_reminder_days, notify_expired_notice_days,
    notify_payment_confirmation_enabled, notify_renewal_confirmation_enabled,
    notify_welcome_message_enabled
) ON public.gyms TO authenticated;

-- DOWN / rollback
-- REVOKE UPDATE (notify_expiry_reminder_enabled, notify_expiry_reminder_days, notify_payment_reminder_days, notify_expired_notice_days, notify_payment_confirmation_enabled, notify_renewal_confirmation_enabled, notify_welcome_message_enabled) ON public.gyms FROM authenticated;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_notify_expired_notice_days_range;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_notify_payment_reminder_days_range;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_notify_expiry_reminder_days_range;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_welcome_message_enabled;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_renewal_confirmation_enabled;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_payment_confirmation_enabled;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_expired_notice_days;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_payment_reminder_days;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_expiry_reminder_days;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS notify_expiry_reminder_enabled;
