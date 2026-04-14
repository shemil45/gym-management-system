export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

type ProfileRole = 'admin' | 'owner' | 'manager' | 'receptionist' | 'trainer' | 'house_keeper' | 'member'
type StaffRole = Exclude<ProfileRole, 'member'>
type Gender = 'male' | 'female' | 'other'
type MemberStatus = 'active' | 'inactive' | 'frozen' | 'expired'
type CheckInMethod = 'manual' | 'qr' | 'kiosk' | 'fingerprint'
type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'
type ExpenseCategory = 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
type ReferralStatus = 'pending' | 'applied' | 'expired'
type NotificationType =
    | 'payment_reminder'
    | 'membership_expiring'
    | 'membership_expired'
    | 'payment_received'
    | 'welcome_new_member'
    | 'referral_reward_earned'
type NotificationStatus = 'sent' | 'failed'

export interface Database {
    public: {
        Tables: {
            gyms: {
                Row: {
                    id: string
                    name: string
                    slug: string | null
                    subdomain: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug?: string | null
                    subdomain?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string | null
                    subdomain?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    role: ProfileRole
                    full_name: string
                    phone: string | null
                    photo_url: string | null
                    active_gym_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    role: ProfileRole
                    full_name: string
                    phone?: string | null
                    photo_url?: string | null
                    active_gym_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    role?: ProfileRole
                    full_name?: string
                    phone?: string | null
                    photo_url?: string | null
                    active_gym_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            admins: {
                Row: {
                    id: string
                    user_id: string
                    gym_id: string
                    role: StaffRole
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    gym_id?: string
                    role: StaffRole
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    gym_id?: string
                    role?: StaffRole
                    created_at?: string
                    updated_at?: string
                }
            }
            membership_plans: {
                Row: {
                    id: string
                    gym_id: string
                    name: string
                    duration_days: number
                    price: number
                    description: string | null
                    features: Json | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id?: string
                    name: string
                    duration_days: number
                    price: number
                    description?: string | null
                    features?: Json | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    name?: string
                    duration_days?: number
                    price?: number
                    description?: string | null
                    features?: Json | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            members: {
                Row: {
                    id: string
                    user_id: string | null
                    gym_id: string
                    member_id: string
                    full_name: string
                    email: string | null
                    phone: string
                    date_of_birth: string | null
                    gender: Gender | null
                    photo_url: string | null
                    address: string | null
                    emergency_contact_name: string | null
                    emergency_contact_phone: string | null
                    membership_plan_id: string | null
                    membership_start_date: string | null
                    membership_expiry_date: string | null
                    status: MemberStatus
                    referral_coins_balance: number
                    referred_by: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    gym_id?: string
                    member_id: string
                    full_name: string
                    email?: string | null
                    phone: string
                    date_of_birth?: string | null
                    gender?: Gender | null
                    photo_url?: string | null
                    address?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    membership_plan_id?: string | null
                    membership_start_date?: string | null
                    membership_expiry_date?: string | null
                    status?: MemberStatus
                    referral_coins_balance?: number
                    referred_by?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    gym_id?: string
                    member_id?: string
                    full_name?: string
                    email?: string | null
                    phone?: string
                    date_of_birth?: string | null
                    gender?: Gender | null
                    photo_url?: string | null
                    address?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    membership_plan_id?: string | null
                    membership_start_date?: string | null
                    membership_expiry_date?: string | null
                    status?: MemberStatus
                    referral_coins_balance?: number
                    referred_by?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            check_ins: {
                Row: {
                    id: string
                    gym_id: string
                    member_id: string
                    check_in_time: string
                    check_out_time: string | null
                    entry_method: CheckInMethod
                    entered_by: string | null
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    gym_id?: string
                    member_id: string
                    check_in_time?: string
                    check_out_time?: string | null
                    entry_method?: CheckInMethod
                    entered_by?: string | null
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    member_id?: string
                    check_in_time?: string
                    check_out_time?: string | null
                    entry_method?: CheckInMethod
                    entered_by?: string | null
                    notes?: string | null
                    created_at?: string
                }
            }
            payments: {
                Row: {
                    id: string
                    gym_id: string
                    member_id: string
                    amount: number
                    payment_method: PaymentMethod
                    payment_status: PaymentStatus
                    payment_date: string
                    invoice_number: string | null
                    razorpay_order_id: string | null
                    razorpay_payment_id: string | null
                    membership_start_date: string | null
                    membership_end_date: string | null
                    notes: string | null
                    processed_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id?: string
                    member_id: string
                    amount: number
                    payment_method: PaymentMethod
                    payment_status?: PaymentStatus
                    payment_date?: string
                    invoice_number?: string | null
                    razorpay_order_id?: string | null
                    razorpay_payment_id?: string | null
                    membership_start_date?: string | null
                    membership_end_date?: string | null
                    notes?: string | null
                    processed_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    member_id?: string
                    amount?: number
                    payment_method?: PaymentMethod
                    payment_status?: PaymentStatus
                    payment_date?: string
                    invoice_number?: string | null
                    razorpay_order_id?: string | null
                    razorpay_payment_id?: string | null
                    membership_start_date?: string | null
                    membership_end_date?: string | null
                    notes?: string | null
                    processed_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            expenses: {
                Row: {
                    id: string
                    gym_id: string
                    category: ExpenseCategory
                    amount: number
                    description: string
                    expense_date: string
                    added_by: string | null
                    receipt_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id?: string
                    category: ExpenseCategory
                    amount: number
                    description: string
                    expense_date?: string
                    added_by?: string | null
                    receipt_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    category?: ExpenseCategory
                    amount?: number
                    description?: string
                    expense_date?: string
                    added_by?: string | null
                    receipt_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            referrals: {
                Row: {
                    id: string
                    gym_id: string
                    referrer_id: string
                    referred_id: string
                    referral_code: string | null
                    status: ReferralStatus
                    created_at: string
                    applied_at: string | null
                }
                Insert: {
                    id?: string
                    gym_id?: string
                    referrer_id: string
                    referred_id: string
                    referral_code?: string | null
                    status?: ReferralStatus
                    created_at?: string
                    applied_at?: string | null
                }
                Update: {
                    id?: string
                    gym_id?: string
                    referrer_id?: string
                    referred_id?: string
                    referral_code?: string | null
                    status?: ReferralStatus
                    created_at?: string
                    applied_at?: string | null
                }
            }
            notification_logs: {
                Row: {
                    id: string
                    gym_id: string
                    member_id: string
                    notification_type: NotificationType
                    message: string
                    status: NotificationStatus
                    sent_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    gym_id?: string
                    member_id: string
                    notification_type: NotificationType
                    message: string
                    status: NotificationStatus
                    sent_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    member_id?: string
                    notification_type?: NotificationType
                    message?: string
                    status?: NotificationStatus
                    sent_at?: string
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
