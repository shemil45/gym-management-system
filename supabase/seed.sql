-- =============================================
-- Gym Management System - Seed Data
-- =============================================

-- NOTE: Run this AFTER creating your first admin user via Supabase Auth
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users

-- =============================================
-- 1. MEMBERSHIP PLANS
-- =============================================
INSERT INTO membership_plans (name, duration_days, price, description, features, is_active) VALUES
('Monthly Plan', 30, 1500.00, 'Perfect for beginners', 
 '["Access to gym equipment", "Locker facility", "Free fitness assessment"]'::jsonb, true),
('Quarterly Plan', 90, 4000.00, 'Best value for regular members', 
 '["Access to gym equipment", "Locker facility", "Free fitness assessment", "1 free personal training session", "10% discount on supplements"]'::jsonb, true),
('Yearly Plan', 365, 15000.00, 'Ultimate commitment package', 
 '["Access to gym equipment", "Locker facility", "Free fitness assessment", "4 free personal training sessions", "20% discount on supplements", "Free gym merchandise", "Priority booking for classes"]'::jsonb, true);

-- =============================================
-- 2. SAMPLE MEMBERS
-- =============================================
-- Note: These are members WITHOUT user accounts (walk-in registrations)
INSERT INTO members (member_id, full_name, email, phone, date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone, membership_plan_id, membership_start_date, membership_expiry_date, status) 
SELECT 
  'GYM' || LPAD(ROW_NUMBER() OVER (ORDER BY name)::TEXT, 3, '0'),
  name,
  email,
  phone,
  dob,
  gender,
  address,
  emergency_name,
  emergency_phone,
  (SELECT id FROM membership_plans ORDER BY RANDOM() LIMIT 1),
  start_date,
  expiry_date,
  CASE 
    WHEN expiry_date < CURRENT_DATE THEN 'expired'
    WHEN expiry_date < CURRENT_DATE + INTERVAL '7 days' THEN 'active'
    ELSE 'active'
  END
FROM (VALUES
  ('Rahul Sharma', 'rahul.sharma@email.com', '9876543210', '1995-03-15'::DATE, 'male', '123 MG Road, Bangalore', 'Priya Sharma', '9876543211', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days'),
  ('Priya Patel', 'priya.patel@email.com', '9876543212', '1998-07-22'::DATE, 'female', '456 Park Street, Mumbai', 'Amit Patel', '9876543213', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '30 days'),
  ('Amit Kumar', 'amit.kumar@email.com', '9876543214', '1992-11-08'::DATE, 'male', '789 Brigade Road, Bangalore', 'Sunita Kumar', '9876543215', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '80 days'),
  ('Sneha Reddy', 'sneha.reddy@email.com', '9876543216', '1996-05-30'::DATE, 'female', '321 Indiranagar, Bangalore', 'Rajesh Reddy', '9876543217', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '355 days'),
  ('Vikram Singh', 'vikram.singh@email.com', '9876543218', '1990-09-12'::DATE, 'male', '654 Koramangala, Bangalore', 'Kavita Singh', '9876543219', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '28 days'),
  ('Anjali Verma', 'anjali.verma@email.com', '9876543220', '1999-01-25'::DATE, 'female', '987 Whitefield, Bangalore', 'Suresh Verma', '9876543221', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '5 days'),
  ('Karan Mehta', 'karan.mehta@email.com', '9876543222', '1994-06-18'::DATE, 'male', '147 HSR Layout, Bangalore', 'Neha Mehta', '9876543223', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '70 days'),
  ('Deepika Joshi', 'deepika.joshi@email.com', '9876543224', '1997-12-03'::DATE, 'female', '258 Jayanagar, Bangalore', 'Rohit Joshi', '9876543225', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days'),
  ('Arjun Nair', 'arjun.nair@email.com', '9876543226', '1993-04-27'::DATE, 'male', '369 Electronic City, Bangalore', 'Lakshmi Nair', '9876543227', CURRENT_DATE - INTERVAL '80 days', CURRENT_DATE + INTERVAL '10 days'),
  ('Pooja Gupta', 'pooja.gupta@email.com', '9876543228', '2000-08-14'::DATE, 'female', '741 Marathahalli, Bangalore', 'Anil Gupta', '9876543229', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '27 days')
) AS t(name, email, phone, dob, gender, address, emergency_name, emergency_phone, start_date, expiry_date);

-- =============================================
-- 3. CHECK-INS (Last 7 days)
-- =============================================
INSERT INTO check_ins (member_id, check_in_time, check_out_time, entry_method)
SELECT 
  m.id,
  CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'),
  CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days') + INTERVAL '1.5 hours',
  (ARRAY['manual', 'qr', 'manual', 'manual'])[FLOOR(RANDOM() * 4 + 1)]
FROM members m
CROSS JOIN generate_series(1, 2) -- Each member gets 2 check-ins
WHERE m.status = 'active'
LIMIT 20;

-- =============================================
-- 4. PAYMENTS
-- =============================================
INSERT INTO payments (member_id, amount, payment_method, payment_status, payment_date, membership_start_date, membership_end_date)
SELECT 
  m.id,
  mp.price,
  (ARRAY['cash', 'upi', 'card', 'bank_transfer'])[FLOOR(RANDOM() * 4 + 1)],
  'paid',
  m.membership_start_date,
  m.membership_start_date,
  m.membership_expiry_date
FROM members m
JOIN membership_plans mp ON m.membership_plan_id = mp.id;

-- =============================================
-- 5. EXPENSES (Last 30 days)
-- =============================================
INSERT INTO expenses (category, amount, description, expense_date)
VALUES
  ('utilities', 8500.00, 'Electricity bill - January 2026', CURRENT_DATE - INTERVAL '5 days'),
  ('salary', 45000.00, 'Trainer salary - January 2026', CURRENT_DATE - INTERVAL '10 days'),
  ('equipment', 25000.00, 'New dumbbells set (5kg-30kg)', CURRENT_DATE - INTERVAL '15 days'),
  ('maintenance', 3500.00, 'Treadmill repair', CURRENT_DATE - INTERVAL '8 days'),
  ('marketing', 12000.00, 'Facebook & Instagram ads', CURRENT_DATE - INTERVAL '20 days');

-- =============================================
-- 6. REFERRALS
-- =============================================
-- Create referral codes for first 5 members
INSERT INTO referrals (referrer_id, referred_id, referral_code, reward_type, reward_amount, status)
SELECT 
  m1.id,
  m2.id,
  UPPER(SUBSTRING(m1.full_name FROM 1 FOR 4)) || SUBSTRING(m1.phone FROM 7 FOR 4),
  'discount',
  500.00,
  'applied'
FROM members m1
CROSS JOIN LATERAL (
  SELECT id FROM members WHERE id != m1.id ORDER BY RANDOM() LIMIT 1
) m2
LIMIT 3;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Uncomment to verify data:

-- SELECT 'Membership Plans' as table_name, COUNT(*) as count FROM membership_plans
-- UNION ALL
-- SELECT 'Members', COUNT(*) FROM members
-- UNION ALL
-- SELECT 'Check-ins', COUNT(*) FROM check_ins
-- UNION ALL
-- SELECT 'Payments', COUNT(*) FROM payments
-- UNION ALL
-- SELECT 'Expenses', COUNT(*) FROM expenses
-- UNION ALL
-- SELECT 'Referrals', COUNT(*) FROM referrals;
