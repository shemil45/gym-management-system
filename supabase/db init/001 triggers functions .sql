-- =============================================================================
-- 001_triggers_functions.sql
-- Functions (defined first) then Triggers
-- =============================================================================


-- ---------------------------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_membership_business_date()
RETURNS date
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT timezone('Asia/Kolkata', now())::date;
$$;


CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT active_gym_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;


CREATE OR REPLACE FUNCTION public.default_gym_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.gyms
  ORDER BY created_at, id
  LIMIT 1
$$;


CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE user_id = auth.uid()
        AND gym_id = public.current_gym_id()
    ),
    false
  )
$$;


CREATE OR REPLACE FUNCTION public.user_has_gym_access(target_gym_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.admins
      WHERE user_id = auth.uid()
        AND gym_id = target_gym_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.members
      WHERE user_id = auth.uid()
        AND gym_id = target_gym_id
    ),
    false
  )
$$;


CREATE OR REPLACE FUNCTION public.profile_role_for_gym(profile_id uuid, target_gym_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT role
      FROM public.admins
      WHERE user_id = profile_id
        AND gym_id = target_gym_id
      LIMIT 1
    ),
    (
      SELECT 'member'
      FROM public.members
      WHERE user_id = profile_id
        AND gym_id = target_gym_id
      LIMIT 1
    )
  )
$$;


CREATE OR REPLACE FUNCTION public.apply_member_status_from_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.membership_expiry_date IS NULL THEN 'inactive'
    WHEN NEW.membership_expiry_date < public.current_membership_business_date() THEN 'expired'
    ELSE 'active'
  END;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.assign_member_gym_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.gym_id IS NULL THEN
    IF NEW.user_id IS NOT NULL THEN
      SELECT active_gym_id
      INTO NEW.gym_id
      FROM public.profiles
      WHERE id = NEW.user_id;
    END IF;

    IF NEW.gym_id IS NULL THEN
      NEW.gym_id := COALESCE(public.current_gym_id(), public.default_gym_id());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.assign_related_gym_id()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'referrals' THEN
    IF NEW.gym_id IS NULL THEN
      SELECT gym_id
      INTO NEW.gym_id
      FROM public.members
      WHERE id = NEW.referrer_id;
    END IF;
  ELSE
    IF NEW.gym_id IS NULL THEN
      SELECT gym_id
      INTO NEW.gym_id
      FROM public.members
      WHERE id = NEW.member_id;
    END IF;
  END IF;

  NEW.gym_id := COALESCE(NEW.gym_id, public.current_gym_id(), public.default_gym_id());
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.invoice_number := 'INV' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(nextval('invoice_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.sync_member_statuses(
    reference_date date DEFAULT public.current_membership_business_date()
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  synced_count integer;
BEGIN
  UPDATE public.members
  SET status = CASE
    WHEN membership_expiry_date IS NULL THEN 'inactive'
    WHEN membership_expiry_date < reference_date THEN 'expired'
    ELSE 'active'
  END
  WHERE status IS DISTINCT FROM CASE
    WHEN membership_expiry_date IS NULL THEN 'inactive'
    WHEN membership_expiry_date < reference_date THEN 'expired'
    ELSE 'active'
  END;

  GET DIAGNOSTICS synced_count = ROW_COUNT;
  RETURN synced_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.sync_profile_role_with_active_gym()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resolved_role TEXT;
BEGIN
  IF NEW.active_gym_id IS NULL THEN
    RETURN NEW;
  END IF;

  resolved_role := public.profile_role_for_gym(NEW.id, NEW.active_gym_id);

  IF resolved_role IS NOT NULL THEN
    NEW.role := resolved_role;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

-- members: auto-assign gym_id on insert
CREATE TRIGGER assign_member_gym_id
    BEFORE INSERT ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_member_gym_id();

-- members: sync status from expiry on insert/update
CREATE TRIGGER sync_member_status_before_write
    BEFORE INSERT OR UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_member_status_from_expiry();

-- members: updated_at
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- check_ins: auto-assign gym_id on insert
CREATE TRIGGER assign_check_in_gym_id
    BEFORE INSERT ON public.check_ins
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_related_gym_id();

-- payments: auto-assign gym_id on insert
CREATE TRIGGER assign_payment_gym_id
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_related_gym_id();

-- payments: generate invoice number if null
CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    WHEN (new.invoice_number IS NULL)
    EXECUTE FUNCTION public.generate_invoice_number();

-- payments: updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- expenses: auto-assign gym_id on insert (via assign_related_gym_id, member_id path fallback to current_gym_id)
-- Note: expenses has no member_id; gym_id defaults to current_gym_id() in the table default.
-- expenses: updated_at
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- referrals: auto-assign gym_id on insert
CREATE TRIGGER assign_referral_gym_id
    BEFORE INSERT ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_related_gym_id();

-- notification_logs: auto-assign gym_id on insert
CREATE TRIGGER assign_notification_log_gym_id
    BEFORE INSERT ON public.notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_related_gym_id();

-- profiles: sync role when active_gym_id changes
CREATE TRIGGER sync_profile_role_with_active_gym
    BEFORE INSERT OR UPDATE OF active_gym_id ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_role_with_active_gym();

-- profiles: updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- admins: updated_at
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- gyms: updated_at
CREATE TRIGGER update_gyms_updated_at
    BEFORE UPDATE ON public.gyms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- membership_plans: updated_at
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();