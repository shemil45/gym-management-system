-- =============================================================================
-- 000_init_schema.sql
-- Tables, Sequences, Indexes, Constraints, Foreign Keys
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS public;


-- ---------------------------------------------------------------------------
-- SEQUENCES
-- ---------------------------------------------------------------------------

CREATE SEQUENCE public.invoice_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE public.gyms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    subdomain text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    gym_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admins_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'owner'::text, 'manager'::text, 'receptionist'::text, 'trainer'::text, 'house_keeper'::text])))
);

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
    gym_id uuid NOT NULL
);

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
    gym_id uuid NOT NULL,
    CONSTRAINT members_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'frozen'::text, 'expired'::text])))
);

CREATE TABLE public.check_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid,
    check_in_time timestamp with time zone DEFAULT now(),
    check_out_time timestamp with time zone,
    entry_method text DEFAULT 'manual'::text,
    entered_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    gym_id uuid NOT NULL,
    CONSTRAINT check_ins_entry_method_check CHECK ((entry_method = ANY (ARRAY['manual'::text, 'qr'::text, 'kiosk'::text, 'fingerprint'::text])))
);

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
    gym_id uuid NOT NULL,
    CONSTRAINT payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'upi'::text, 'bank_transfer'::text, 'online'::text]))),
    CONSTRAINT payments_payment_status_check CHECK ((payment_status = ANY (ARRAY['paid'::text, 'pending'::text, 'failed'::text, 'refunded'::text])))
);

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
    gym_id uuid NOT NULL,
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['utilities'::text, 'salary'::text, 'equipment'::text, 'maintenance'::text, 'marketing'::text, 'rent'::text, 'other'::text])))
);

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid,
    referred_id uuid,
    referral_code text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    applied_at timestamp with time zone,
    gym_id uuid NOT NULL,
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'expired'::text])))
);

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    notification_type text NOT NULL,
    message text NOT NULL,
    status text NOT NULL,
    sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    gym_id uuid NOT NULL,
    CONSTRAINT notification_logs_notification_type_check CHECK ((notification_type = ANY (ARRAY['payment_reminder'::text, 'membership_expiring'::text, 'membership_expired'::text, 'payment_received'::text, 'welcome_new_member'::text, 'referral_reward_earned'::text]))),
    CONSTRAINT notification_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text])))
);

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

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

CREATE TABLE public.nutrition_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    plan_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.workout_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    plan_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- PRIMARY KEYS
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.gyms
    ADD CONSTRAINT gyms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.membership_plans
    ADD CONSTRAINT membership_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_pkey PRIMARY KEY (id);


-- ---------------------------------------------------------------------------
-- UNIQUE CONSTRAINTS
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.gyms
    ADD CONSTRAINT gyms_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.gyms
    ADD CONSTRAINT gyms_subdomain_key UNIQUE (subdomain);

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_gym_id_key UNIQUE (user_id, gym_id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_number_key UNIQUE (invoice_number);

ALTER TABLE ONLY public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_user_id_key UNIQUE (user_id);


-- ---------------------------------------------------------------------------
-- FOREIGN KEYS
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_active_gym_id_fkey FOREIGN KEY (active_gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.membership_plans
    ADD CONSTRAINT membership_plans_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_membership_plan_id_fkey FOREIGN KEY (membership_plan_id) REFERENCES public.membership_plans(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.members(id);

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT check_ins_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.nutrition_plans
    ADD CONSTRAINT nutrition_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

-- gyms
CREATE INDEX idx_gyms_is_active ON public.gyms USING btree (is_active);

-- profiles
CREATE INDEX idx_profiles_active_gym_id ON public.profiles USING btree (active_gym_id);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

-- admins
CREATE INDEX idx_admins_gym_id ON public.admins USING btree (gym_id);
CREATE INDEX idx_admins_gym_role ON public.admins USING btree (gym_id, role);
CREATE INDEX idx_admins_user_id ON public.admins USING btree (user_id);

-- membership_plans
CREATE INDEX idx_membership_plans_gym_active ON public.membership_plans USING btree (gym_id, is_active);
CREATE INDEX idx_plans_active ON public.membership_plans USING btree (is_active);

-- members
CREATE INDEX idx_members_email ON public.members USING btree (email);
CREATE INDEX idx_members_expiry ON public.members USING btree (membership_expiry_date);
CREATE INDEX idx_members_gym_expiry ON public.members USING btree (gym_id, membership_expiry_date);
CREATE INDEX idx_members_gym_status ON public.members USING btree (gym_id, status);
CREATE INDEX idx_members_gym_user ON public.members USING btree (gym_id, user_id);
CREATE INDEX idx_members_member_id ON public.members USING btree (member_id);
CREATE INDEX idx_members_phone ON public.members USING btree (phone);
CREATE INDEX idx_members_status ON public.members USING btree (status);
CREATE UNIQUE INDEX idx_members_gym_email_unique ON public.members USING btree (gym_id, email) WHERE (email IS NOT NULL);
CREATE UNIQUE INDEX idx_members_gym_member_id_unique ON public.members USING btree (gym_id, member_id);

-- check_ins
CREATE INDEX idx_check_ins_gym_date ON public.check_ins USING btree (gym_id, check_in_time);
CREATE INDEX idx_check_ins_gym_member_date ON public.check_ins USING btree (gym_id, member_id, check_in_time);
CREATE INDEX idx_checkins_date ON public.check_ins USING btree (check_in_time);
CREATE INDEX idx_checkins_member ON public.check_ins USING btree (member_id);
CREATE INDEX idx_checkins_member_date ON public.check_ins USING btree (member_id, check_in_time);

-- payments
CREATE INDEX idx_payments_date ON public.payments USING btree (payment_date);
CREATE INDEX idx_payments_gym_date ON public.payments USING btree (gym_id, payment_date);
CREATE INDEX idx_payments_gym_member_status ON public.payments USING btree (gym_id, member_id, payment_status);
CREATE INDEX idx_payments_member ON public.payments USING btree (member_id);
CREATE INDEX idx_payments_status ON public.payments USING btree (payment_status);

-- expenses
CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);
CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);
CREATE INDEX idx_expenses_gym_date ON public.expenses USING btree (gym_id, expense_date);

-- referrals
CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);
CREATE INDEX idx_referrals_gym_referred ON public.referrals USING btree (gym_id, referred_id);
CREATE INDEX idx_referrals_gym_referrer ON public.referrals USING btree (gym_id, referrer_id);
CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);
CREATE UNIQUE INDEX idx_referrals_gym_code_unique ON public.referrals USING btree (gym_id, referral_code) WHERE (referral_code IS NOT NULL);

-- notification_logs
CREATE INDEX idx_notification_logs_gym_member_sent_at ON public.notification_logs USING btree (gym_id, member_id, sent_at);
CREATE INDEX notification_logs_member_id_idx ON public.notification_logs USING btree (member_id);
CREATE INDEX notification_logs_type_sent_at_idx ON public.notification_logs USING btree (notification_type, sent_at DESC);