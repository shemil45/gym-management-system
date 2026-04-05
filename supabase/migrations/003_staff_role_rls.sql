CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role <> 'member'
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Staff can read all profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (public.is_staff_user());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view active plans" ON membership_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON membership_plans;
DROP POLICY IF EXISTS "Staff can manage plans" ON membership_plans;

CREATE POLICY "Anyone can view active plans" ON membership_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_staff_user());

CREATE POLICY "Staff can manage plans" ON membership_plans
  FOR ALL
  TO authenticated
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "Admins can manage all members" ON members;
DROP POLICY IF EXISTS "Staff can read all data" ON members;
DROP POLICY IF EXISTS "Staff can insert data" ON members;
DROP POLICY IF EXISTS "Staff can update data" ON members;
DROP POLICY IF EXISTS "Staff can delete data" ON members;
DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;

CREATE POLICY "Staff can read all data" ON members
  FOR SELECT
  TO authenticated
  USING (public.is_staff_user());

CREATE POLICY "Members can view own data" ON members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can insert data" ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Staff can update data" ON members
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Staff can delete data" ON members
  FOR DELETE
  TO authenticated
  USING (public.is_staff_user());

CREATE POLICY "Members can update own data" ON members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage check-ins" ON check_ins;
DROP POLICY IF EXISTS "Staff can manage check-ins" ON check_ins;
DROP POLICY IF EXISTS "Members can view own check-ins" ON check_ins;

CREATE POLICY "Staff can manage check-ins" ON check_ins
  FOR ALL
  TO authenticated
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Members can view own check-ins" ON check_ins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members WHERE id = check_ins.member_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Staff can read all data" ON payments;
DROP POLICY IF EXISTS "Staff can insert data" ON payments;
DROP POLICY IF EXISTS "Staff can update data" ON payments;
DROP POLICY IF EXISTS "Staff can delete data" ON payments;
DROP POLICY IF EXISTS "Members can view own payments" ON payments;

CREATE POLICY "Staff can read all data" ON payments
  FOR SELECT
  TO authenticated
  USING (public.is_staff_user());

CREATE POLICY "Members can view own payments" ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members WHERE id = payments.member_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert data" ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Staff can update data" ON payments
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Staff can delete data" ON payments
  FOR DELETE
  TO authenticated
  USING (public.is_staff_user());

DROP POLICY IF EXISTS "Admins can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Staff can manage expenses" ON expenses;

CREATE POLICY "Staff can manage expenses" ON expenses
  FOR ALL
  TO authenticated
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "Admins can manage referrals" ON referrals;
DROP POLICY IF EXISTS "Staff can read all data" ON referrals;
DROP POLICY IF EXISTS "Staff can insert data" ON referrals;
DROP POLICY IF EXISTS "Staff can update data" ON referrals;
DROP POLICY IF EXISTS "Staff can delete data" ON referrals;
DROP POLICY IF EXISTS "Members can view own referrals" ON referrals;

CREATE POLICY "Staff can read all data" ON referrals
  FOR SELECT
  TO authenticated
  USING (public.is_staff_user());

CREATE POLICY "Members can view own referrals" ON referrals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members WHERE id = referrals.referrer_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert data" ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Staff can update data" ON referrals
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_user())
  WITH CHECK (public.is_staff_user());

CREATE POLICY "Staff can delete data" ON referrals
  FOR DELETE
  TO authenticated
  USING (public.is_staff_user());
