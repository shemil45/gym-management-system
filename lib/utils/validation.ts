import { z } from 'zod'

// Member validation schema
export const memberSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number (must be 10 digits)'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional().or(z.literal('')),
    membership_plan_id: z.string().uuid('Please select a membership plan'),
    membership_start_date: z.string(),
    notes: z.string().optional(),
})

// Payment validation schema
export const paymentSchema = z.object({
    member_id: z.string().uuid('Please select a member'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    payment_method: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'online']),
    payment_date: z.string(),
    membership_start_date: z.string().optional(),
    notes: z.string().optional(),
})

// Expense validation schema
export const expenseSchema = z.object({
    category: z.enum(['utilities', 'salary', 'equipment', 'maintenance', 'marketing', 'rent', 'other']),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    description: z.string().min(3, 'Description must be at least 3 characters'),
    expense_date: z.string(),
})

// Membership plan validation schema
export const membershipPlanSchema = z.object({
    name: z.string().min(2, 'Plan name must be at least 2 characters'),
    duration_days: z.number().min(1, 'Duration must be at least 1 day'),
    price: z.number().min(1, 'Price must be greater than 0'),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
})

// Login validation schema
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Register validation schema
export const registerSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

// Check-in validation schema
export const checkInSchema = z.object({
    member_id: z.string().uuid('Please select a member'),
    notes: z.string().optional(),
})

// Profile update validation schema
export const profileUpdateSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
    address: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional().or(z.literal('')),
})
