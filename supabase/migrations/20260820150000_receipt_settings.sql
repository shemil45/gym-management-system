-- UP
ALTER TABLE public.gyms
    ADD COLUMN receipt_prefix text NOT NULL DEFAULT 'REC-',
    ADD COLUMN receipt_next_number integer NOT NULL DEFAULT 1,
    ADD COLUMN receipt_show_logo boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_address boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_phone boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_email boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_gstin boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_footer_message text NULL,
    ADD COLUMN receipt_additional_notes text NULL;

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_receipt_next_number_positive CHECK (receipt_next_number > 0),
    ADD CONSTRAINT gyms_receipt_prefix_not_blank CHECK (btrim(receipt_prefix) <> '');

ALTER TABLE public.payments
    ADD COLUMN receipt_number text NULL;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_receipt_number_unique UNIQUE (receipt_number);

-- Column-scoped grant, mirroring 20260820120000_gym_profile_settings.sql
-- (additive: authenticated already has UPDATE restricted to a specific
-- column set by 20260819160312_membership_fees_settings.sql; this adds
-- the new receipt_* columns to that allow-list without a REVOKE).
GRANT UPDATE (
    receipt_prefix, receipt_next_number, receipt_show_logo,
    receipt_show_address, receipt_show_phone, receipt_show_email,
    receipt_show_gstin, receipt_footer_message, receipt_additional_notes
) ON public.gyms TO authenticated;

-- NOTE: public.user_has_gym_access()/is_staff_user() currently error for
-- every caller in this database — they transitively call
-- current_platform_impersonation_gym_id(), which queries a
-- platform_impersonation_sessions table that does not exist here. This is
-- a pre-existing bug, unrelated to receipt settings; flagged separately.
-- This function therefore does its own lightweight authorization check
-- instead of depending on the broken helper. auth.uid() IS NULL identifies
-- trusted service-role callers (already fully trusted, same as elsewhere
-- in this codebase's use of the service-role client) and skips the check;
-- a real authenticated user must be an admin of the target gym.
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_gym_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix text;
    v_assigned integer;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND gym_id = p_gym_id
    ) THEN
        RAISE EXCEPTION 'Not authorized for gym %', p_gym_id;
    END IF;

    UPDATE public.gyms
    SET receipt_next_number = receipt_next_number + 1
    WHERE id = p_gym_id
    RETURNING receipt_prefix, receipt_next_number - 1
    INTO v_prefix, v_assigned;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Gym % not found', p_gym_id;
    END IF;

    RETURN v_prefix || lpad(v_assigned::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_receipt_number(uuid) TO authenticated;

-- DOWN / rollback
-- REVOKE EXECUTE ON FUNCTION public.generate_receipt_number(uuid) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.generate_receipt_number(uuid);
-- REVOKE UPDATE (receipt_prefix, receipt_next_number, receipt_show_logo, receipt_show_address, receipt_show_phone, receipt_show_email, receipt_show_gstin, receipt_footer_message, receipt_additional_notes) ON public.gyms FROM authenticated;
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_receipt_number_unique;
-- ALTER TABLE public.payments DROP COLUMN IF EXISTS receipt_number;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_receipt_prefix_not_blank;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_receipt_next_number_positive;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_additional_notes;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_footer_message;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_gstin;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_email;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_phone;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_address;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_logo;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_next_number;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_prefix;
