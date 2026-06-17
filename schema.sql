--
-- PostgreSQL database dump
--

\restrict zDvGttjnz185qDC2gGjXrg9sCn3ixYbBuEcq3RdZI9E2cajHEurO8YYKSGCWwgm

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: apply_member_status_from_expiry(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_member_status_from_expiry() RETURNS trigger
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


ALTER FUNCTION public.apply_member_status_from_expiry() OWNER TO postgres;

--
-- Name: assign_member_gym_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_member_gym_id() RETURNS trigger
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


ALTER FUNCTION public.assign_member_gym_id() OWNER TO postgres;

--
-- Name: assign_related_gym_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_related_gym_id() RETURNS trigger
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


ALTER FUNCTION public.assign_related_gym_id() OWNER TO postgres;

--
-- Name: current_gym_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_gym_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT active_gym_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;


ALTER FUNCTION public.current_gym_id() OWNER TO postgres;

--
-- Name: current_membership_business_date(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_membership_business_date() RETURNS date
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT timezone('Asia/Kolkata', now())::date;
$$;


ALTER FUNCTION public.current_membership_business_date() OWNER TO postgres;

--
-- Name: default_gym_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.default_gym_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id
  FROM public.gyms
  ORDER BY created_at, id
  LIMIT 1
$$;


ALTER FUNCTION public.default_gym_id() OWNER TO postgres;

--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_invoice_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.invoice_number := 'INV' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(nextval('invoice_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_invoice_number() OWNER TO postgres;

--
-- Name: is_staff_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_staff_user() RETURNS boolean
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


ALTER FUNCTION public.is_staff_user() OWNER TO postgres;

--
-- Name: profile_role_for_gym(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.profile_role_for_gym(profile_id uuid, target_gym_id uuid) RETURNS text
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


ALTER FUNCTION public.profile_role_for_gym(profile_id uuid, target_gym_id uuid) OWNER TO postgres;

--
-- Name: sync_member_statuses(date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_member_statuses(reference_date date DEFAULT public.current_membership_business_date()) RETURNS integer
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


ALTER FUNCTION public.sync_member_statuses(reference_date date) OWNER TO postgres;

--
-- Name: sync_profile_role_with_active_gym(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_profile_role_with_active_gym() RETURNS trigger
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


ALTER FUNCTION public.sync_profile_role_with_active_gym() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: user_has_gym_access(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_has_gym_access(target_gym_id uuid) RETURNS boolean
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


ALTER FUNCTION public.user_has_gym_access(target_gym_id uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admins_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'owner'::text, 'manager'::text, 'receptionist'::text, 'trainer'::text, 'house_keeper'::text])))
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: check_ins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid,
    check_in_time timestamp with time zone DEFAULT now(),
    check_out_time timestamp with time zone,
    entry_method text DEFAULT 'manual'::text,
    entered_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL,
    CONSTRAINT check_ins_entry_method_check CHECK ((entry_method = ANY (ARRAY['manual'::text, 'qr'::text, 'kiosk'::text, 'fingerprint'::text])))
);


ALTER TABLE public.check_ins OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    added_by uuid,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL,
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['utilities'::text, 'salary'::text, 'equipment'::text, 'maintenance'::text, 'marketing'::text, 'rent'::text, 'other'::text])))
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: fitness_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fitness_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal text NOT NULL,
    experience text NOT NULL,
    injuries text,
    days_per_week integer NOT NULL,
    dietary_preference text,
    height_cm numeric,
    weight_kg numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fitness_profiles OWNER TO postgres;

--
-- Name: gyms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gyms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    subdomain text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gyms OWNER TO postgres;

--
-- Name: invoice_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_seq OWNER TO postgres;

--
-- Name: members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    member_id text NOT NULL,
    full_name text NOT NULL,
    email text,
    phone text NOT NULL,
    date_of_birth date,
    gender text,
    photo_url text,
    address text,
    emergency_contact_name text,
    emergency_contact_phone text,
    membership_plan_id uuid,
    membership_start_date date,
    membership_expiry_date date,
    status text DEFAULT 'active'::text,
    referred_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    referral_coins_balance integer DEFAULT 0 NOT NULL,
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL,
    CONSTRAINT members_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'frozen'::text, 'expired'::text])))
);


ALTER TABLE public.members OWNER TO postgres;

--
-- Name: membership_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.membership_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    duration_days integer NOT NULL,
    price numeric(10,2) NOT NULL,
    description text,
    features jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL
);


ALTER TABLE public.membership_plans OWNER TO postgres;

--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    notification_type text NOT NULL,
    message text NOT NULL,
    status text NOT NULL,
    sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL,
    CONSTRAINT notification_logs_notification_type_check CHECK ((notification_type = ANY (ARRAY['payment_reminder'::text, 'membership_expiring'::text, 'membership_expired'::text, 'payment_received'::text, 'welcome_new_member'::text, 'referral_reward_earned'::text]))),
    CONSTRAINT notification_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text])))
);


ALTER TABLE public.notification_logs OWNER TO postgres;

--
-- Name: nutrition_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nutrition_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    plan_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.nutrition_plans OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_status text DEFAULT 'paid'::text,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    invoice_number text,
    razorpay_order_id text,
    razorpay_payment_id text,
    membership_start_date date,
    membership_end_date date,
    notes text,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL,
    CONSTRAINT payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'upi'::text, 'bank_transfer'::text, 'online'::text]))),
    CONSTRAINT payments_payment_status_check CHECK ((payment_status = ANY (ARRAY['paid'::text, 'pending'::text, 'failed'::text, 'refunded'::text])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text NOT NULL,
    full_name text NOT NULL,
    phone text,
    photo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    active_gym_id uuid,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'owner'::text, 'manager'::text, 'receptionist'::text, 'trainer'::text, 'house_keeper'::text, 'member'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid,
    referred_id uuid,
    referral_code text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    applied_at timestamp with time zone,
    gym_id uuid DEFAULT COALESCE(public.current_gym_id(), public.default_gym_id()) NOT NULL,
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'expired'::text])))
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: workout_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workout_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    plan_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.workout_plans OWNER TO postgres;

--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_user_id_gym_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_gym_id_key UNIQUE (user_id, gym_id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: check_ins check_ins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fitness_profiles fitness_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_pkey PRIMARY KEY (id);


--
-- Name: fitness_profiles fitness_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_user_id_key UNIQUE (user_id);


--
-- Name: gyms gyms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gyms
    ADD CONSTRAINT gyms_pkey PRIMARY KEY (id);


--
-- Name: gyms gyms_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gyms
    ADD CONSTRAINT gyms_slug_key UNIQUE (slug);


--
-- Name: gyms gyms_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gyms
    ADD CONSTRAINT gyms_subdomain_key UNIQUE (subdomain);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: membership_plans membership_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.membership_plans
    ADD CONSTRAINT membership_plans_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: nutrition_plans nutrition_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id);


--
-- Name: payments payments_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: workout_plans workout_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_pkey PRIMARY KEY (id);


--
-- Name: idx_admins_gym_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_gym_id ON public.admins USING btree (gym_id);


--
-- Name: idx_admins_gym_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_gym_role ON public.admins USING btree (gym_id, role);


--
-- Name: idx_admins_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_user_id ON public.admins USING btree (user_id);


--
-- Name: idx_check_ins_gym_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_check_ins_gym_date ON public.check_ins USING btree (gym_id, check_in_time);


--
-- Name: idx_check_ins_gym_member_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_check_ins_gym_member_date ON public.check_ins USING btree (gym_id, member_id, check_in_time);


--
-- Name: idx_checkins_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkins_date ON public.check_ins USING btree (check_in_time);


--
-- Name: idx_checkins_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkins_member ON public.check_ins USING btree (member_id);


--
-- Name: idx_checkins_member_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkins_member_date ON public.check_ins USING btree (member_id, check_in_time);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_gym_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_gym_date ON public.expenses USING btree (gym_id, expense_date);


--
-- Name: idx_gyms_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gyms_is_active ON public.gyms USING btree (is_active);


--
-- Name: idx_members_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_email ON public.members USING btree (email);


--
-- Name: idx_members_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_expiry ON public.members USING btree (membership_expiry_date);


--
-- Name: idx_members_gym_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_members_gym_email_unique ON public.members USING btree (gym_id, email) WHERE (email IS NOT NULL);


--
-- Name: idx_members_gym_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_gym_expiry ON public.members USING btree (gym_id, membership_expiry_date);


--
-- Name: idx_members_gym_member_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_members_gym_member_id_unique ON public.members USING btree (gym_id, member_id);


--
-- Name: idx_members_gym_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_gym_status ON public.members USING btree (gym_id, status);


--
-- Name: idx_members_gym_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_gym_user ON public.members USING btree (gym_id, user_id);


--
-- Name: idx_members_member_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_member_id ON public.members USING btree (member_id);


--
-- Name: idx_members_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_phone ON public.members USING btree (phone);


--
-- Name: idx_members_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_status ON public.members USING btree (status);


--
-- Name: idx_membership_plans_gym_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_membership_plans_gym_active ON public.membership_plans USING btree (gym_id, is_active);


--
-- Name: idx_notification_logs_gym_member_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_logs_gym_member_sent_at ON public.notification_logs USING btree (gym_id, member_id, sent_at);


--
-- Name: idx_payments_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_gym_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_gym_date ON public.payments USING btree (gym_id, payment_date);


--
-- Name: idx_payments_gym_member_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_gym_member_status ON public.payments USING btree (gym_id, member_id, payment_status);


--
-- Name: idx_payments_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_member ON public.payments USING btree (member_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (payment_status);


--
-- Name: idx_plans_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plans_active ON public.membership_plans USING btree (is_active);


--
-- Name: idx_profiles_active_gym_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_active_gym_id ON public.profiles USING btree (active_gym_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);


--
-- Name: idx_referrals_gym_code_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_referrals_gym_code_unique ON public.referrals USING btree (gym_id, referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: idx_referrals_gym_referred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_gym_referred ON public.referrals USING btree (gym_id, referred_id);


--
-- Name: idx_referrals_gym_referrer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_gym_referrer ON public.referrals USING btree (gym_id, referrer_id);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);


--
-- Name: notification_logs_member_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_logs_member_id_idx ON public.notification_logs USING btree (member_id);


--
-- Name: notification_logs_type_sent_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_logs_type_sent_at_idx ON public.notification_logs USING btree (notification_type, sent_at DESC);


--
-- Name: check_ins assign_check_in_gym_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER assign_check_in_gym_id BEFORE INSERT ON public.check_ins FOR EACH ROW EXECUTE FUNCTION public.assign_related_gym_id();


--
-- Name: members assign_member_gym_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER assign_member_gym_id BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.assign_member_gym_id();


--
-- Name: notification_logs assign_notification_log_gym_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER assign_notification_log_gym_id BEFORE INSERT ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION public.assign_related_gym_id();


--
-- Name: payments assign_payment_gym_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER assign_payment_gym_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.assign_related_gym_id();


--
-- Name: referrals assign_referral_gym_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER assign_referral_gym_id BEFORE INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.assign_related_gym_id();


--
-- Name: payments set_invoice_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.payments FOR EACH ROW WHEN ((new.invoice_number IS NULL)) EXECUTE FUNCTION public.generate_invoice_number();


--
-- Name: members sync_member_status_before_write; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_member_status_before_write BEFORE INSERT OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.apply_member_status_from_expiry();


--
-- Name: profiles sync_profile_role_with_active_gym; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_profile_role_with_active_gym BEFORE INSERT OR UPDATE OF active_gym_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_with_active_gym();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gyms update_gyms_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: members update_members_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: membership_plans update_plans_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admins admins_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: admins admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: check_ins check_ins_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.profiles(id);


--
-- Name: check_ins check_ins_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: check_ins check_ins_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: expenses expenses_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: fitness_profiles fitness_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: members members_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: members members_membership_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_membership_plan_id_fkey FOREIGN KEY (membership_plan_id) REFERENCES public.membership_plans(id);


--
-- Name: members members_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.members(id);


--
-- Name: members members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: membership_plans membership_plans_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.membership_plans
    ADD CONSTRAINT membership_plans_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: nutrition_plans nutrition_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: payments payments_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: payments payments_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: payments payments_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_active_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_active_gym_id_fkey FOREIGN KEY (active_gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_gym_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: workout_plans workout_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: members Members can read own current gym membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can read own current gym membership" ON public.members FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND (gym_id = public.current_gym_id())));


--
-- Name: members Members can update own current gym membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can update own current gym membership" ON public.members FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (gym_id = public.current_gym_id()))) WITH CHECK (((user_id = auth.uid()) AND (gym_id = public.current_gym_id())));


--
-- Name: check_ins Members can view own current gym check-ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can view own current gym check-ins" ON public.check_ins FOR SELECT TO authenticated USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
   FROM public.members m
  WHERE ((m.id = check_ins.member_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));


--
-- Name: notification_logs Members can view own current gym notification logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can view own current gym notification logs" ON public.notification_logs FOR SELECT TO authenticated USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
   FROM public.members m
  WHERE ((m.id = notification_logs.member_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));


--
-- Name: payments Members can view own current gym payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can view own current gym payments" ON public.payments FOR SELECT TO authenticated USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
   FROM public.members m
  WHERE ((m.id = payments.member_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));


--
-- Name: referrals Members can view own current gym referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can view own current gym referrals" ON public.referrals FOR SELECT TO authenticated USING (((gym_id = public.current_gym_id()) AND (EXISTS ( SELECT 1
   FROM public.members m
  WHERE ((m.id = referrals.referrer_id) AND (m.user_id = auth.uid()) AND (m.gym_id = public.current_gym_id()))))));


--
-- Name: members Staff can delete current gym members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can delete current gym members" ON public.members FOR DELETE TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: payments Staff can delete current gym payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can delete current gym payments" ON public.payments FOR DELETE TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: referrals Staff can delete current gym referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can delete current gym referrals" ON public.referrals FOR DELETE TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: members Staff can insert current gym members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can insert current gym members" ON public.members FOR INSERT TO authenticated WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: notification_logs Staff can insert current gym notification logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can insert current gym notification logs" ON public.notification_logs FOR INSERT TO authenticated WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: payments Staff can insert current gym payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can insert current gym payments" ON public.payments FOR INSERT TO authenticated WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: referrals Staff can insert current gym referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can insert current gym referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: admins Staff can manage current gym admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can manage current gym admins" ON public.admins TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: check_ins Staff can manage current gym check-ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can manage current gym check-ins" ON public.check_ins TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((gym_id = public.current_gym_id()));


--
-- Name: expenses Staff can manage current gym expenses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can manage current gym expenses" ON public.expenses TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((gym_id = public.current_gym_id()));


--
-- Name: membership_plans Staff can manage current gym plans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can manage current gym plans" ON public.membership_plans TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: members Staff can read current gym members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can read current gym members" ON public.members FOR SELECT TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: notification_logs Staff can read current gym notification logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can read current gym notification logs" ON public.notification_logs FOR SELECT TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: payments Staff can read current gym payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can read current gym payments" ON public.payments FOR SELECT TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: referrals Staff can read current gym referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can read current gym referrals" ON public.referrals FOR SELECT TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id())));


--
-- Name: profiles Staff can read profiles in current gym; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can read profiles in current gym" ON public.profiles FOR SELECT TO authenticated USING ((public.is_staff_user() AND ((EXISTS ( SELECT 1
   FROM public.admins a
  WHERE ((a.user_id = profiles.id) AND (a.gym_id = public.current_gym_id())))) OR (EXISTS ( SELECT 1
   FROM public.members m
  WHERE ((m.user_id = profiles.id) AND (m.gym_id = public.current_gym_id())))))));


--
-- Name: members Staff can update current gym members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can update current gym members" ON public.members FOR UPDATE TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((gym_id = public.current_gym_id()));


--
-- Name: payments Staff can update current gym payments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can update current gym payments" ON public.payments FOR UPDATE TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((gym_id = public.current_gym_id()));


--
-- Name: referrals Staff can update current gym referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can update current gym referrals" ON public.referrals FOR UPDATE TO authenticated USING ((public.is_staff_user() AND (gym_id = public.current_gym_id()))) WITH CHECK ((gym_id = public.current_gym_id()));


--
-- Name: gyms Users can read accessible gyms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read accessible gyms" ON public.gyms FOR SELECT TO authenticated USING (public.user_has_gym_access(id));


--
-- Name: admins Users can read current gym admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read current gym admins" ON public.admins FOR SELECT TO authenticated USING (((gym_id = public.current_gym_id()) AND (public.is_staff_user() OR (user_id = auth.uid()))));


--
-- Name: membership_plans Users can read current gym plans; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read current gym plans" ON public.membership_plans FOR SELECT TO authenticated USING (((gym_id = public.current_gym_id()) AND public.user_has_gym_access(gym_id) AND ((is_active = true) OR public.is_staff_user())));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND ((active_gym_id IS NULL) OR public.user_has_gym_access(active_gym_id))));


--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: check_ins; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: gyms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

--
-- Name: members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION apply_member_status_from_expiry(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.apply_member_status_from_expiry() FROM PUBLIC;
GRANT ALL ON FUNCTION public.apply_member_status_from_expiry() TO service_role;


--
-- Name: FUNCTION assign_member_gym_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.assign_member_gym_id() TO anon;
GRANT ALL ON FUNCTION public.assign_member_gym_id() TO authenticated;
GRANT ALL ON FUNCTION public.assign_member_gym_id() TO service_role;


--
-- Name: FUNCTION assign_related_gym_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.assign_related_gym_id() TO anon;
GRANT ALL ON FUNCTION public.assign_related_gym_id() TO authenticated;
GRANT ALL ON FUNCTION public.assign_related_gym_id() TO service_role;


--
-- Name: FUNCTION current_gym_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.current_gym_id() TO anon;
GRANT ALL ON FUNCTION public.current_gym_id() TO authenticated;
GRANT ALL ON FUNCTION public.current_gym_id() TO service_role;


--
-- Name: FUNCTION current_membership_business_date(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.current_membership_business_date() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_membership_business_date() TO service_role;
GRANT ALL ON FUNCTION public.current_membership_business_date() TO authenticated;
GRANT ALL ON FUNCTION public.current_membership_business_date() TO anon;


--
-- Name: FUNCTION default_gym_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.default_gym_id() TO anon;
GRANT ALL ON FUNCTION public.default_gym_id() TO authenticated;
GRANT ALL ON FUNCTION public.default_gym_id() TO service_role;


--
-- Name: FUNCTION generate_invoice_number(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_invoice_number() TO anon;
GRANT ALL ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_invoice_number() TO service_role;


--
-- Name: FUNCTION is_staff_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_staff_user() TO anon;
GRANT ALL ON FUNCTION public.is_staff_user() TO authenticated;
GRANT ALL ON FUNCTION public.is_staff_user() TO service_role;


--
-- Name: FUNCTION profile_role_for_gym(profile_id uuid, target_gym_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.profile_role_for_gym(profile_id uuid, target_gym_id uuid) TO anon;
GRANT ALL ON FUNCTION public.profile_role_for_gym(profile_id uuid, target_gym_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.profile_role_for_gym(profile_id uuid, target_gym_id uuid) TO service_role;


--
-- Name: FUNCTION sync_member_statuses(reference_date date); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.sync_member_statuses(reference_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_member_statuses(reference_date date) TO service_role;


--
-- Name: FUNCTION sync_profile_role_with_active_gym(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_profile_role_with_active_gym() TO anon;
GRANT ALL ON FUNCTION public.sync_profile_role_with_active_gym() TO authenticated;
GRANT ALL ON FUNCTION public.sync_profile_role_with_active_gym() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION user_has_gym_access(target_gym_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_has_gym_access(target_gym_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_has_gym_access(target_gym_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_has_gym_access(target_gym_id uuid) TO service_role;


--
-- Name: TABLE admins; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admins TO anon;
GRANT ALL ON TABLE public.admins TO authenticated;
GRANT ALL ON TABLE public.admins TO service_role;


--
-- Name: TABLE chat_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_messages TO anon;
GRANT ALL ON TABLE public.chat_messages TO authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role;


--
-- Name: TABLE check_ins; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.check_ins TO anon;
GRANT ALL ON TABLE public.check_ins TO authenticated;
GRANT ALL ON TABLE public.check_ins TO service_role;


--
-- Name: TABLE expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expenses TO anon;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO service_role;


--
-- Name: TABLE fitness_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fitness_profiles TO anon;
GRANT ALL ON TABLE public.fitness_profiles TO authenticated;
GRANT ALL ON TABLE public.fitness_profiles TO service_role;


--
-- Name: TABLE gyms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gyms TO anon;
GRANT ALL ON TABLE public.gyms TO authenticated;
GRANT ALL ON TABLE public.gyms TO service_role;


--
-- Name: SEQUENCE invoice_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.invoice_seq TO anon;
GRANT ALL ON SEQUENCE public.invoice_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invoice_seq TO service_role;


--
-- Name: TABLE members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.members TO anon;
GRANT ALL ON TABLE public.members TO authenticated;
GRANT ALL ON TABLE public.members TO service_role;


--
-- Name: TABLE membership_plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.membership_plans TO anon;
GRANT ALL ON TABLE public.membership_plans TO authenticated;
GRANT ALL ON TABLE public.membership_plans TO service_role;


--
-- Name: TABLE notification_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_logs TO anon;
GRANT ALL ON TABLE public.notification_logs TO authenticated;
GRANT ALL ON TABLE public.notification_logs TO service_role;


--
-- Name: TABLE nutrition_plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nutrition_plans TO anon;
GRANT ALL ON TABLE public.nutrition_plans TO authenticated;
GRANT ALL ON TABLE public.nutrition_plans TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE referrals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referrals TO anon;
GRANT ALL ON TABLE public.referrals TO authenticated;
GRANT ALL ON TABLE public.referrals TO service_role;


--
-- Name: TABLE workout_plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.workout_plans TO anon;
GRANT ALL ON TABLE public.workout_plans TO authenticated;
GRANT ALL ON TABLE public.workout_plans TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict zDvGttjnz185qDC2gGjXrg9sCn3ixYbBuEcq3RdZI9E2cajHEurO8YYKSGCWwgm

