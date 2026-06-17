-- =============================================================================
-- 002_rls_policies.sql
-- Enable Row Level Security + all RLS policies
-- =============================================================================


-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- POLICIES: gyms
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read accessible gyms"
    ON public.gyms
    FOR SELECT
    TO authenticated
    USING (public.user_has_gym_access(id));


-- ---------------------------------------------------------------------------
-- POLICIES: profiles
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING ((id = auth.uid()));

CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING ((id = auth.uid()))
    WITH CHECK (((id = auth.uid()) AND ((active_gym_id IS NULL) OR public.user_has_gym_access(active_gym_id))));

CREATE POLICY "Staff can read profiles in current gym"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING ((public.is_staff_user() AND (
        (EXISTS ( SELECT 1
           FROM public.admins a
          WHERE ((a.user_id = profiles.id) AND (a.gym_id = public.current_gym_id()))))
        OR
        (EXISTS ( SELECT 1
           FROM public.members m
          WHERE ((m.user_id = profiles.id) AND (m.gym_id = public.current_gym_id()))))
    )));


-- ---------------------------------------------------------------------------
-- POLICIES: admins
-- ---------------------------------------------------------------------------

CREATE POLICY "Staff can manage current gym admins"
    ON public.admins
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Users can read current gym admins"
    ON public.admins
    FOR SELECT
    TO authenticated
    USING (((gym_id = public.current_gym_id()) AND (public.is_staff_user() OR (user_id = auth.uid()))));


-- ---------------------------------------------------------------------------
-- POLICIES: membership_plans
-- ---------------------------------------------------------------------------

CREATE POLICY "Staff can manage current gym plans"
    ON public.membership_plans
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Users can read current gym plans"
    ON public.membership_plans
    FOR SELECT
    TO authenticated
    USING (((gym_id = public.current_gym_id()) AND public.user_has_gym_access(gym_id) AND ((is_active = true) OR public.is_staff_user())));


-- ---------------------------------------------------------------------------
-- POLICIES: members
-- ---------------------------------------------------------------------------

CREATE POLICY "Members can read own current gym membership"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (((user_id = auth.uid()) AND (gym_id = public.current_gym_id())));

CREATE POLICY "Members can update own current gym membership"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (((user_id = auth.uid()) AND (gym_id = public.current_gym_id())))
    WITH CHECK (((user_id = auth.uid()) AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can read current gym members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can insert current gym members"
    ON public.members
    FOR INSERT
    TO authenticated
    WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can update current gym members"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((gym_id = public.current_gym_id()));

CREATE POLICY "Staff can delete current gym members"
    ON public.members
    FOR DELETE
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


-- ---------------------------------------------------------------------------
-- POLICIES: check_ins
-- ---------------------------------------------------------------------------

CREATE POLICY "Members can view own current gym check-ins"
    ON public.check_ins
    FOR SELECT
    TO authenticated
    USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
       FROM public.members m
      WHERE ((m.id = check_ins.member_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));

CREATE POLICY "Staff can manage current gym check-ins"
    ON public.check_ins
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((gym_id = public.current_gym_id()));


-- ---------------------------------------------------------------------------
-- POLICIES: payments
-- ---------------------------------------------------------------------------

CREATE POLICY "Members can view own current gym payments"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
       FROM public.members m
      WHERE ((m.id = payments.member_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));

CREATE POLICY "Staff can read current gym payments"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can insert current gym payments"
    ON public.payments
    FOR INSERT
    TO authenticated
    WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can update current gym payments"
    ON public.payments
    FOR UPDATE
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((gym_id = public.current_gym_id()));

CREATE POLICY "Staff can delete current gym payments"
    ON public.payments
    FOR DELETE
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


-- ---------------------------------------------------------------------------
-- POLICIES: expenses
-- ---------------------------------------------------------------------------

CREATE POLICY "Staff can manage current gym expenses"
    ON public.expenses
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((gym_id = public.current_gym_id()));


-- ---------------------------------------------------------------------------
-- POLICIES: referrals
-- ---------------------------------------------------------------------------

CREATE POLICY "Members can view own current gym referrals"
    ON public.referrals
    FOR SELECT
    TO authenticated
    USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
       FROM public.members m
      WHERE ((m.id = referrals.referrer_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));

CREATE POLICY "Staff can read current gym referrals"
    ON public.referrals
    FOR SELECT
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can insert current gym referrals"
    ON public.referrals
    FOR INSERT
    TO authenticated
    WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can update current gym referrals"
    ON public.referrals
    FOR UPDATE
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())))
    WITH CHECK ((gym_id = public.current_gym_id()));

CREATE POLICY "Staff can delete current gym referrals"
    ON public.referrals
    FOR DELETE
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


-- ---------------------------------------------------------------------------
-- POLICIES: notification_logs
-- ---------------------------------------------------------------------------

CREATE POLICY "Members can view own current gym notification logs"
    ON public.notification_logs
    FOR SELECT
    TO authenticated
    USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
       FROM public.members m
      WHERE ((m.id = notification_logs.member_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));

CREATE POLICY "Staff can read current gym notification logs"
    ON public.notification_logs
    FOR SELECT
    TO authenticated
    USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));

CREATE POLICY "Staff can insert current gym notification logs"
    ON public.notification_logs
    FOR INSERT
    TO authenticated
    WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));