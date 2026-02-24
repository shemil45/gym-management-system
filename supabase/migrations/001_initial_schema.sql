-- =============================================
-- Gym Management System - Initial Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  full_name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================
-- 2. MEMBERSHIP PLANS TABLE
-- =============================================
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active plans
CREATE INDEX idx_plans_active ON membership_plans(is_active);

-- =============================================
-- 3. MEMBERS TABLE
-- =============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  member_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  photo_url TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  membership_plan_id UUID REFERENCES membership_plans(id),
  membership_start_date DATE,
  membership_expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'expired')),
  referred_by UUID REFERENCES members(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_members_member_id ON members(member_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_expiry ON members(membership_expiry_date);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_phone ON members(phone);

-- =============================================
-- 4. CHECK-INS TABLE
-- =============================================
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  entry_method TEXT DEFAULT 'manual' CHECK (entry_method IN ('manual', 'qr', 'kiosk', 'fingerprint')),
  entered_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_checkins_member ON check_ins(member_id);
CREATE INDEX idx_checkins_date ON check_ins(check_in_time);
CREATE INDEX idx_checkins_member_date ON check_ins(member_id, check_in_time);

-- =============================================
-- 5. PAYMENTS TABLE
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'online')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'failed', 'refunded')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT UNIQUE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  membership_start_date DATE,
  membership_end_date DATE,
  notes TEXT,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- Auto-generate invoice number
CREATE SEQUENCE invoice_seq START 1000;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(nextval('invoice_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- =============================================
-- 6. EXPENSES TABLE
-- =============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('utilities', 'salary', 'equipment', 'maintenance', 'marketing', 'rent', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  added_by UUID REFERENCES profiles(id),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- =============================================
-- 7. REFERRALS TABLE
-- =============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES members(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES members(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE,
  reward_type TEXT CHECK (reward_type IN ('discount', 'free_days', 'cash')),
  reward_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Membership Plans: Everyone can read active plans, admins can manage
CREATE POLICY "Anyone can view active plans" ON membership_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON membership_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Members: Admins can manage all, members can view their own
CREATE POLICY "Admins can manage all members" ON members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members can view own data" ON members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can update own data" ON members
  FOR UPDATE USING (user_id = auth.uid());

-- Check-ins: Admins can manage all, members can view their own
CREATE POLICY "Admins can manage check-ins" ON check_ins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members can view own check-ins" ON check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members WHERE id = check_ins.member_id AND user_id = auth.uid()
    )
  );

-- Payments: Admins can manage all, members can view their own
CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members can view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members WHERE id = payments.member_id AND user_id = auth.uid()
    )
  );

-- Expenses: Admin only
CREATE POLICY "Admins can manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Referrals: Admins can manage all, members can view their own
CREATE POLICY "Admins can manage referrals" ON referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members can view own referrals" ON referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members WHERE id = referrals.referrer_id AND user_id = auth.uid()
    )
  );
