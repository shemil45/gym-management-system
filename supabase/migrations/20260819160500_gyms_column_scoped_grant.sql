-- UP
REVOKE UPDATE ON public.gyms FROM authenticated, anon;
GRANT UPDATE (default_admission_fee, allow_admission_fee_waiver, allow_custom_membership_start_date)
    ON public.gyms TO authenticated;

-- DOWN / rollback
-- GRANT UPDATE ON public.gyms TO authenticated; -- restores pre-migration broad grant if truly rolling back
