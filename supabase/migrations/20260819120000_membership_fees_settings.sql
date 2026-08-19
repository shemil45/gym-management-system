-- UP
ALTER TABLE public.gyms
    ADD COLUMN default_admission_fee numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN allow_admission_fee_waiver boolean NOT NULL DEFAULT true,
    ADD COLUMN allow_custom_membership_start_date boolean NOT NULL DEFAULT false;

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_default_admission_fee_non_negative CHECK (default_admission_fee >= 0);

ALTER TABLE public.payments
    ADD COLUMN admission_fee_amount numeric(10,2) NULL;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_admission_fee_amount_non_negative CHECK (admission_fee_amount IS NULL OR admission_fee_amount >= 0);

CREATE POLICY "Staff can update current gym"
    ON public.gyms
    FOR UPDATE
    TO authenticated
    USING (is_staff_user() AND id = current_gym_id())
    WITH CHECK (is_staff_user() AND id = current_gym_id());

-- DOWN / rollback
-- DROP POLICY IF EXISTS "Staff can update current gym" ON public.gyms;
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_admission_fee_amount_non_negative;
-- ALTER TABLE public.payments DROP COLUMN IF EXISTS admission_fee_amount;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_default_admission_fee_non_negative;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS allow_custom_membership_start_date;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS allow_admission_fee_waiver;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS default_admission_fee;
