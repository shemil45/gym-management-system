-- =============================================
-- Multi-tenant SaaS foundation
-- =============================================

BEGIN;

-- =============================================
-- 1. GYMS AND TENANT ACCESS TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  subdomain TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gyms_is_active ON public.gyms(is_active);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_gym_id ON public.profiles(active_gym_id);

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'manager', 'receptionist', 'trainer', 'house_keeper')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, gym_id)
);

CREATE INDEX IF NOT EXISTS idx_admins_gym_id ON public.admins(gym_id);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_gym_role ON public.admins(gym_id, role);

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

DO $$
DECLARE
  default_gym UUID;
BEGIN
  SELECT id
  INTO default_gym
  FROM public.gyms
  ORDER BY created_at, id
  LIMIT 1;

  IF default_gym IS NULL THEN
    INSERT INTO public.gyms (name, slug)
    VALUES ('FitGym Default', 'fitgym-default')
    RETURNING id INTO default_gym;
  END IF;

  UPDATE public.profiles
  SET active_gym_id = default_gym
  WHERE active_gym_id IS NULL;

  INSERT INTO public.admins (user_id, gym_id, role)
  SELECT id, default_gym, role
  FROM public.profiles
  WHERE role <> 'member'
  ON CONFLICT (user_id, gym_id) DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = NOW();
END $$;

-- =============================================
-- 2. TENANT HELPERS
-- =============================================

CREATE OR REPLACE FUNCTION public.default_gym_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.gyms
  ORDER BY created_at, id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_gym_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_has_gym_access(target_gym_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.profile_role_for_gym(profile_id UUID, target_gym_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.sync_profile_role_with_active_gym()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS sync_profile_role_with_active_gym ON public.profiles;
CREATE TRIGGER sync_profile_role_with_active_gym
  BEFORE INSERT OR UPDATE OF active_gym_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_with_active_gym();

-- =============================================
-- 3. GYM ID COLUMNS AND DATA BACKFILL
-- =============================================

ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

UPDATE public.membership_plans
SET gym_id = public.default_gym_id()
WHERE gym_id IS NULL;

UPDATE public.members
SET gym_id = public.default_gym_id()
WHERE gym_id IS NULL;

UPDATE public.check_ins ci
SET gym_id = m.gym_id
FROM public.members m
WHERE ci.member_id = m.id
  AND ci.gym_id IS NULL;

UPDATE public.payments p
SET gym_id = m.gym_id
FROM public.members m
WHERE p.member_id = m.id
  AND p.gym_id IS NULL;

UPDATE public.expenses
SET gym_id = public.default_gym_id()
WHERE gym_id IS NULL;

UPDATE public.referrals r
SET gym_id = m.gym_id
FROM public.members m
WHERE r.referrer_id = m.id
  AND r.gym_id IS NULL;

UPDATE public.notification_logs n
SET gym_id = m.gym_id
FROM public.members m
WHERE n.member_id = m.id
  AND n.gym_id IS NULL;

ALTER TABLE public.membership_plans
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

ALTER TABLE public.members
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

ALTER TABLE public.check_ins
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

ALTER TABLE public.payments
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

ALTER TABLE public.expenses
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

ALTER TABLE public.referrals
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

ALTER TABLE public.notification_logs
  ALTER COLUMN gym_id SET NOT NULL,
  ALTER COLUMN gym_id SET DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id());

-- =============================================
-- 4. TENANT-SAFE UNIQUES AND INDEXES
-- =============================================

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_member_id_key;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_email_key;

ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_referral_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_gym_member_id_unique
  ON public.members(gym_id, member_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_gym_email_unique
  ON public.members(gym_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_gym_code_unique
  ON public.referrals(gym_id, referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_plans_gym_active
  ON public.membership_plans(gym_id, is_active);

CREATE INDEX IF NOT EXISTS idx_members_gym_status
  ON public.members(gym_id, status);

CREATE INDEX IF NOT EXISTS idx_members_gym_user
  ON public.members(gym_id, user_id);

CREATE INDEX IF NOT EXISTS idx_members_gym_expiry
  ON public.members(gym_id, membership_expiry_date);

CREATE INDEX IF NOT EXISTS idx_check_ins_gym_date
  ON public.check_ins(gym_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_check_ins_gym_member_date
  ON public.check_ins(gym_id, member_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_payments_gym_date
  ON public.payments(gym_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_payments_gym_member_status
  ON public.payments(gym_id, member_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_expenses_gym_date
  ON public.expenses(gym_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_referrals_gym_referrer
  ON public.referrals(gym_id, referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_gym_referred
  ON public.referrals(gym_id, referred_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_gym_member_sent_at
  ON public.notification_logs(gym_id, member_id, sent_at);

-- =============================================
-- 5. GYM ID PROPAGATION TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.assign_member_gym_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS assign_member_gym_id ON public.members;
CREATE TRIGGER assign_member_gym_id
  BEFORE INSERT
  ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_member_gym_id();

CREATE OR REPLACE FUNCTION public.assign_related_gym_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS assign_check_in_gym_id ON public.check_ins;
CREATE TRIGGER assign_check_in_gym_id
  BEFORE INSERT
  ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_related_gym_id();

DROP TRIGGER IF EXISTS assign_payment_gym_id ON public.payments;
CREATE TRIGGER assign_payment_gym_id
  BEFORE INSERT
  ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_related_gym_id();

DROP TRIGGER IF EXISTS assign_referral_gym_id ON public.referrals;
CREATE TRIGGER assign_referral_gym_id
  BEFORE INSERT
  ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_related_gym_id();

DROP TRIGGER IF EXISTS assign_notification_log_gym_id ON public.notification_logs;
CREATE TRIGGER assign_notification_log_gym_id
  BEFORE INSERT
  ON public.notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_related_gym_id();

-- =============================================
-- 6. UPDATED_AT TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS update_gyms_updated_at ON public.gyms;
CREATE TRIGGER update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. RLS POLICIES
-- =============================================

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read accessible gyms" ON public.gyms;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can manage plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Staff can read all data" ON public.members;
DROP POLICY IF EXISTS "Members can view own data" ON public.members;
DROP POLICY IF EXISTS "Staff can insert data" ON public.members;
DROP POLICY IF EXISTS "Staff can update data" ON public.members;
DROP POLICY IF EXISTS "Staff can delete data" ON public.members;
DROP POLICY IF EXISTS "Members can update own data" ON public.members;
DROP POLICY IF EXISTS "Staff can manage check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Members can view own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Staff can read all data" ON public.payments;
DROP POLICY IF EXISTS "Members can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can insert data" ON public.payments;
DROP POLICY IF EXISTS "Staff can update data" ON public.payments;
DROP POLICY IF EXISTS "Staff can delete data" ON public.payments;
DROP POLICY IF EXISTS "Staff can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff can read all data" ON public.referrals;
DROP POLICY IF EXISTS "Members can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Staff can insert data" ON public.referrals;
DROP POLICY IF EXISTS "Staff can update data" ON public.referrals;
DROP POLICY IF EXISTS "Staff can delete data" ON public.referrals;

CREATE POLICY "Users can read accessible gyms"
  ON public.gyms
  FOR SELECT
  TO authenticated
  USING (public.user_has_gym_access(id));

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Staff can read profiles in current gym"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user()
    AND (
      EXISTS (
        SELECT 1
        FROM public.admins a
        WHERE a.user_id = profiles.id
          AND a.gym_id = public.current_gym_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.user_id = profiles.id
          AND m.gym_id = public.current_gym_id()
      )
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      active_gym_id IS NULL
      OR public.user_has_gym_access(active_gym_id)
    )
  );

CREATE POLICY "Users can read current gym admins"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND (
      public.is_staff_user()
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage current gym admins"
  ON public.admins
  FOR ALL
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Users can read current gym plans"
  ON public.membership_plans
  FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND public.user_has_gym_access(gym_id)
    AND (is_active = true OR public.is_staff_user())
  );

CREATE POLICY "Staff can manage current gym plans"
  ON public.membership_plans
  FOR ALL
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can read current gym members"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Members can read own current gym membership"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can insert current gym members"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can update current gym members"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can delete current gym members"
  ON public.members
  FOR DELETE
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Members can update own current gym membership"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can manage current gym check-ins"
  ON public.check_ins
  FOR ALL
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    gym_id = public.current_gym_id()
  );

CREATE POLICY "Members can view own current gym check-ins"
  ON public.check_ins
  FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = check_ins.member_id
        AND m.user_id = auth.uid()
        AND m.gym_id = public.current_gym_id()
    )
  );

CREATE POLICY "Staff can read current gym payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Members can view own current gym payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = payments.member_id
        AND m.user_id = auth.uid()
        AND m.gym_id = public.current_gym_id()
    )
  );

CREATE POLICY "Staff can insert current gym payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can update current gym payments"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can delete current gym payments"
  ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can manage current gym expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can read current gym referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Members can view own current gym referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = referrals.referrer_id
        AND m.user_id = auth.uid()
        AND m.gym_id = public.current_gym_id()
    )
  );

CREATE POLICY "Staff can insert current gym referrals"
  ON public.referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can update current gym referrals"
  ON public.referrals
  FOR UPDATE
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  )
  WITH CHECK (
    gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can delete current gym referrals"
  ON public.referrals
  FOR DELETE
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Staff can read current gym notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

CREATE POLICY "Members can view own current gym notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = notification_logs.member_id
        AND m.user_id = auth.uid()
        AND m.gym_id = public.current_gym_id()
    )
  );

CREATE POLICY "Staff can insert current gym notification logs"
  ON public.notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_user()
    AND gym_id = public.current_gym_id()
  );

COMMIT;
