-- =============================================
-- Gym Management System - Seed Data
-- =============================================

-- This seed targets the multi-tenant schema introduced in
-- 008_multi_tenant_saas_refactor.sql.
--
-- It seeds data into the earliest gym in the system, which keeps
-- `supabase db reset` and brand-new projects aligned with the current
-- tenant-aware architecture.

-- =============================================
-- 1. MEMBERSHIP PLANS
-- =============================================
WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
)
INSERT INTO public.membership_plans (gym_id, name, duration_days, price, description, features, is_active)
SELECT
  seed_gym.gym_id,
  plans.name,
  plans.duration_days,
  plans.price,
  plans.description,
  plans.features,
  plans.is_active
FROM seed_gym
CROSS JOIN (
  VALUES
    (
      'Monthly Plan',
      30,
      1500.00::DECIMAL(10,2),
      'Perfect for beginners',
      '["Access to gym equipment", "Locker facility", "Free fitness assessment"]'::jsonb,
      true
    ),
    (
      'Quarterly Plan',
      90,
      4000.00::DECIMAL(10,2),
      'Best value for regular members',
      '["Access to gym equipment", "Locker facility", "Free fitness assessment", "1 free personal training session", "10% discount on supplements"]'::jsonb,
      true
    ),
    (
      'Yearly Plan',
      365,
      15000.00::DECIMAL(10,2),
      'Ultimate commitment package',
      '["Access to gym equipment", "Locker facility", "Free fitness assessment", "4 free personal training sessions", "20% discount on supplements", "Free gym merchandise", "Priority booking for classes"]'::jsonb,
      true
    )
) AS plans(name, duration_days, price, description, features, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.membership_plans existing
  WHERE existing.gym_id = seed_gym.gym_id
    AND existing.name = plans.name
);

-- =============================================
-- 2. SAMPLE MEMBERS
-- =============================================
-- These are walk-in members without auth user accounts.
WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
),
seed_members AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY source.name) AS member_number,
    source.*
  FROM (
    VALUES
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
  ) AS source(name, email, phone, dob, gender, address, emergency_name, emergency_phone, start_date, expiry_date)
),
plan_choices AS (
  SELECT
    p.id,
    ROW_NUMBER() OVER (ORDER BY p.duration_days, p.price, p.name, p.id) AS plan_number
  FROM public.membership_plans p
  JOIN seed_gym sg ON sg.gym_id = p.gym_id
  WHERE p.is_active = true
)
INSERT INTO public.members (
  gym_id,
  member_id,
  full_name,
  email,
  phone,
  date_of_birth,
  gender,
  address,
  emergency_contact_name,
  emergency_contact_phone,
  membership_plan_id,
  membership_start_date,
  membership_expiry_date,
  status
)
SELECT
  sg.gym_id,
  'GYM' || LPAD(sm.member_number::TEXT, 3, '0'),
  sm.name,
  sm.email,
  sm.phone,
  sm.dob,
  sm.gender::TEXT,
  sm.address,
  sm.emergency_name,
  sm.emergency_phone,
  pc.id,
  sm.start_date::DATE,
  sm.expiry_date::DATE,
  CASE
    WHEN sm.expiry_date::DATE < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END
FROM seed_members sm
JOIN seed_gym sg ON true
LEFT JOIN plan_choices pc
  ON pc.plan_number = ((sm.member_number - 1) % 3) + 1
WHERE NOT EXISTS (
  SELECT 1
  FROM public.members existing
  WHERE existing.gym_id = sg.gym_id
    AND existing.email = sm.email
);

-- =============================================
-- 3. CHECK-INS (Last 7 days)
-- =============================================
WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
),
active_members AS (
  SELECT id, gym_id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS member_number
  FROM public.members
  WHERE gym_id = (SELECT gym_id FROM seed_gym)
    AND status = 'active'
),
check_in_rows AS (
  SELECT
    am.id AS member_id,
    am.gym_id,
    (CURRENT_TIMESTAMP - ((am.member_number + gs.iteration) * INTERVAL '9 hours')) AS check_in_time,
    (CURRENT_TIMESTAMP - ((am.member_number + gs.iteration) * INTERVAL '9 hours') + INTERVAL '90 minutes') AS check_out_time,
    (ARRAY['manual', 'qr', 'kiosk', 'manual'])[((((am.member_number + gs.iteration - 1) % 4) + 1))::INTEGER] AS entry_method
  FROM active_members am
  CROSS JOIN (VALUES (1), (2)) AS gs(iteration)
)
INSERT INTO public.check_ins (gym_id, member_id, check_in_time, check_out_time, entry_method)
SELECT
  cir.gym_id,
  cir.member_id,
  cir.check_in_time,
  cir.check_out_time,
  cir.entry_method
FROM check_in_rows cir
WHERE cir.check_in_time >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1
    FROM public.check_ins existing
    WHERE existing.gym_id = cir.gym_id
      AND existing.member_id = cir.member_id
      AND existing.check_in_time = cir.check_in_time
  );

-- =============================================
-- 4. PAYMENTS
-- =============================================
WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
)
INSERT INTO public.payments (
  gym_id,
  member_id,
  amount,
  payment_method,
  payment_status,
  payment_date,
  membership_start_date,
  membership_end_date,
  notes
)
SELECT
  m.gym_id,
  m.id,
  COALESCE(mp.price, 0),
  (ARRAY['cash', 'upi', 'card', 'bank_transfer'])[((((ROW_NUMBER() OVER (ORDER BY m.created_at, m.id) - 1) % 4) + 1))::INTEGER],
  'paid',
  COALESCE(m.membership_start_date, CURRENT_DATE),
  m.membership_start_date,
  m.membership_expiry_date,
  'Seed payment'
FROM public.members m
LEFT JOIN public.membership_plans mp
  ON mp.id = m.membership_plan_id
WHERE m.gym_id = (SELECT gym_id FROM seed_gym)
  AND m.membership_plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.payments existing
    WHERE existing.gym_id = m.gym_id
      AND existing.member_id = m.id
      AND existing.notes = 'Seed payment'
  );

-- =============================================
-- 5. EXPENSES (Last 30 days)
-- =============================================
WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
)
INSERT INTO public.expenses (gym_id, category, amount, description, expense_date)
SELECT
  seed_gym.gym_id,
  expenses.category,
  expenses.amount,
  expenses.description,
  expenses.expense_date
FROM seed_gym
CROSS JOIN (
  VALUES
    ('utilities', 8500.00::DECIMAL(10,2), 'Electricity bill - January 2026', CURRENT_DATE - INTERVAL '5 days'),
    ('salary', 45000.00::DECIMAL(10,2), 'Trainer salary - January 2026', CURRENT_DATE - INTERVAL '10 days'),
    ('equipment', 25000.00::DECIMAL(10,2), 'New dumbbells set (5kg-30kg)', CURRENT_DATE - INTERVAL '15 days'),
    ('maintenance', 3500.00::DECIMAL(10,2), 'Treadmill repair', CURRENT_DATE - INTERVAL '8 days'),
    ('marketing', 12000.00::DECIMAL(10,2), 'Facebook & Instagram ads', CURRENT_DATE - INTERVAL '20 days')
) AS expenses(category, amount, description, expense_date)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expenses existing
  WHERE existing.gym_id = seed_gym.gym_id
    AND existing.description = expenses.description
    AND existing.expense_date = expenses.expense_date::DATE
);

-- =============================================
-- 6. REFERRALS
-- =============================================
WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
),
eligible_members AS (
  SELECT
    m.id,
    m.full_name,
    m.phone,
    ROW_NUMBER() OVER (ORDER BY m.created_at, m.id) AS member_number
  FROM public.members m
  WHERE m.gym_id = (SELECT gym_id FROM seed_gym)
),
referral_pairs AS (
  SELECT
    em1.id AS referrer_id,
    em2.id AS referred_id,
    LEFT(UPPER(REGEXP_REPLACE(em1.full_name, '[^A-Za-z]', '', 'g')) || 'REF', 4) || RIGHT(em1.phone, 4) AS referral_code
  FROM eligible_members em1
  JOIN eligible_members em2
    ON em2.member_number = em1.member_number + 1
  WHERE em1.member_number <= 3
)
INSERT INTO public.referrals (gym_id, referrer_id, referred_id, referral_code, status, applied_at)
SELECT
  sg.gym_id,
  rp.referrer_id,
  rp.referred_id,
  rp.referral_code,
  'applied',
  NOW()
FROM referral_pairs rp
JOIN seed_gym sg ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.referrals existing
  WHERE existing.gym_id = sg.gym_id
    AND existing.referral_code = rp.referral_code
);

WITH seed_gym AS (
  SELECT public.default_gym_id() AS gym_id
),
referral_totals AS (
  SELECT referrer_id, COUNT(*)::INTEGER * 500 AS applied_reward
  FROM public.referrals
  WHERE gym_id = (SELECT gym_id FROM seed_gym)
    AND status = 'applied'
  GROUP BY referrer_id
)
UPDATE public.members m
SET referral_coins_balance = rt.applied_reward
FROM referral_totals rt
WHERE m.id = rt.referrer_id
  AND m.gym_id = (SELECT gym_id FROM seed_gym);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Uncomment to verify seeded data for the default gym:
--
-- WITH seed_gym AS (SELECT public.default_gym_id() AS gym_id)
-- SELECT 'Membership Plans' AS table_name, COUNT(*) AS count
-- FROM public.membership_plans
-- WHERE gym_id = (SELECT gym_id FROM seed_gym)
-- UNION ALL
-- SELECT 'Members', COUNT(*)
-- FROM public.members
-- WHERE gym_id = (SELECT gym_id FROM seed_gym)
-- UNION ALL
-- SELECT 'Check-ins', COUNT(*)
-- FROM public.check_ins
-- WHERE gym_id = (SELECT gym_id FROM seed_gym)
-- UNION ALL
-- SELECT 'Payments', COUNT(*)
-- FROM public.payments
-- WHERE gym_id = (SELECT gym_id FROM seed_gym)
-- UNION ALL
-- SELECT 'Expenses', COUNT(*)
-- FROM public.expenses
-- WHERE gym_id = (SELECT gym_id FROM seed_gym)
-- UNION ALL
-- SELECT 'Referrals', COUNT(*)
-- FROM public.referrals
-- WHERE gym_id = (SELECT gym_id FROM seed_gym);
