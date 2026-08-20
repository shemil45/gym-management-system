-- UP
ALTER TABLE public.gyms
    ADD COLUMN member_id_prefix text NOT NULL DEFAULT 'GYM',
    ADD COLUMN member_id_next_number integer NOT NULL DEFAULT 1,
    ADD COLUMN member_id_padding integer NOT NULL DEFAULT 3;

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_member_id_next_number_positive CHECK (member_id_next_number > 0),
    ADD CONSTRAINT gyms_member_id_prefix_not_blank CHECK (btrim(member_id_prefix) <> ''),
    ADD CONSTRAINT gyms_member_id_padding_range CHECK (member_id_padding BETWEEN 1 AND 10);

-- Seed member_id_next_number per gym from that gym's own highest existing
-- GYM### member_id, so the next generated id continues the existing
-- sequence instead of colliding with (or skipping) real member ids.
-- Existing member_id values themselves are never touched.
UPDATE public.gyms g
SET member_id_next_number = COALESCE((
    SELECT MAX((regexp_match(m.member_id, '^GYM(\d+)$'))[1]::int) + 1
    FROM public.members m
    WHERE m.gym_id = g.id
      AND m.member_id ~ '^GYM\d+$'
), 1);

-- Column-scoped grant, mirroring 20260820150000_receipt_settings.sql.
GRANT UPDATE (
    member_id_prefix, member_id_next_number, member_id_padding
) ON public.gyms TO authenticated;

-- Same authorization pattern as generate_receipt_number(): auth.uid() IS
-- NULL identifies trusted service-role callers; a real authenticated user
-- must be an admin of the target gym. See that function's migration
-- (20260820150000_receipt_settings.sql) for why this doesn't rely on
-- user_has_gym_access()/is_staff_user().
CREATE OR REPLACE FUNCTION public.generate_member_id(p_gym_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix text;
    v_padding integer;
    v_assigned integer;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND gym_id = p_gym_id
    ) THEN
        RAISE EXCEPTION 'Not authorized for gym %', p_gym_id;
    END IF;

    UPDATE public.gyms
    SET member_id_next_number = member_id_next_number + 1
    WHERE id = p_gym_id
    RETURNING member_id_prefix, member_id_padding, member_id_next_number - 1
    INTO v_prefix, v_padding, v_assigned;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Gym % not found', p_gym_id;
    END IF;

    RETURN v_prefix || lpad(v_assigned::text, v_padding, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_member_id(uuid) TO authenticated;

-- DOWN / rollback
-- REVOKE EXECUTE ON FUNCTION public.generate_member_id(uuid) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.generate_member_id(uuid);
-- REVOKE UPDATE (member_id_prefix, member_id_next_number, member_id_padding) ON public.gyms FROM authenticated;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_member_id_padding_range;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_member_id_prefix_not_blank;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_member_id_next_number_positive;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS member_id_padding;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS member_id_next_number;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS member_id_prefix;
