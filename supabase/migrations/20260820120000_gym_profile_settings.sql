-- UP
ALTER TABLE public.gyms
    ADD COLUMN website text,
    ADD COLUMN address text,
    ADD COLUMN postal_code text,
    ADD COLUMN gstin text;

GRANT UPDATE (name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin)
    ON public.gyms TO authenticated;

-- DOWN / rollback
-- REVOKE UPDATE (name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin) ON public.gyms FROM authenticated;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS gstin;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS postal_code;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS address;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS website;
