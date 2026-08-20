-- UP
ALTER TABLE public.gyms
    ADD COLUMN payment_method_cash_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN payment_method_upi_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN payment_method_card_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN payment_method_bank_transfer_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN default_payment_method text NOT NULL DEFAULT 'cash';

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_default_payment_method_valid
        CHECK (default_payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
    ADD CONSTRAINT gyms_at_least_one_payment_method_enabled
        CHECK (
            payment_method_cash_enabled OR payment_method_upi_enabled OR
            payment_method_card_enabled OR payment_method_bank_transfer_enabled
        );

-- Column-scoped grant, mirroring 20260820150000_receipt_settings.sql
GRANT UPDATE (
    payment_method_cash_enabled, payment_method_upi_enabled,
    payment_method_card_enabled, payment_method_bank_transfer_enabled,
    default_payment_method
) ON public.gyms TO authenticated;

-- DOWN / rollback
-- REVOKE UPDATE (payment_method_cash_enabled, payment_method_upi_enabled, payment_method_card_enabled, payment_method_bank_transfer_enabled, default_payment_method) ON public.gyms FROM authenticated;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_at_least_one_payment_method_enabled;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_default_payment_method_valid;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS default_payment_method;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS payment_method_bank_transfer_enabled;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS payment_method_card_enabled;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS payment_method_upi_enabled;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS payment_method_cash_enabled;
