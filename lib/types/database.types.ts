export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    role: 'admin' | 'member'
                    full_name: string
                    phone: string | null
                    photo_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    role: 'admin' | 'member'
                    full_name: string
                    phone?: string | null
                    photo_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    role?: 'admin' | 'member'
                    full_name?: string
                    phone?: string | null
                    photo_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            membership_plans: {
                Row: {
                    id: string
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
                    member_id: string
                    full_name: string
                    email: string | null
                    phone: string
                    date_of_birth: string | null
                    gender: 'male' | 'female' | 'other' | null
                    photo_url: string | null
                    address: string | null
                    emergency_contact_name: string | null
                    emergency_contact_phone: string | null
                    membership_plan_id: string | null
                    membership_start_date: string | null
                    membership_expiry_date: string | null
                    status: 'active' | 'inactive' | 'frozen' | 'expired'
                    referred_by: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    member_id: string
                    full_name: string
                    email?: string | null
                    phone: string
                    date_of_birth?: string | null
                    gender?: 'male' | 'female' | 'other' | null
                    photo_url?: string | null
                    address?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    membership_plan_id?: string | null
                    membership_start_date?: string | null
                    membership_expiry_date?: string | null
                    status?: 'active' | 'inactive' | 'frozen' | 'expired'
                    referred_by?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    member_id?: string
                    full_name?: string
                    email?: string | null
                    phone?: string
                    date_of_birth?: string | null
                    gender?: 'male' | 'female' | 'other' | null
                    photo_url?: string | null
                    address?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    membership_plan_id?: string | null
                    membership_start_date?: string | null
                    membership_expiry_date?: string | null
                    status?: 'active' | 'inactive' | 'frozen' | 'expired'
                    referred_by?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            check_ins: {
                Row: {
                    id: string
                    member_id: string
                    check_in_time: string
                    check_out_time: string | null
                    entry_method: 'manual' | 'qr' | 'kiosk' | 'fingerprint'
                    entered_by: string | null
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    member_id: string
                    check_in_time?: string
                    check_out_time?: string | null
                    entry_method?: 'manual' | 'qr' | 'kiosk' | 'fingerprint'
                    entered_by?: string | null
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    member_id?: string
                    check_in_time?: string
                    check_out_time?: string | null
                    entry_method?: 'manual' | 'qr' | 'kiosk' | 'fingerprint'
                    entered_by?: string | null
                    notes?: string | null
                    created_at?: string
                }
            }
            payments: {
                Row: {
                    id: string
                    member_id: string
                    amount: number
                    payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
                    payment_status: 'paid' | 'pending' | 'failed' | 'refunded'
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
                    member_id: string
                    amount: number
                    payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
                    payment_status?: 'paid' | 'pending' | 'failed' | 'refunded'
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
                    member_id?: string
                    amount?: number
                    payment_method?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
                    payment_status?: 'paid' | 'pending' | 'failed' | 'refunded'
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
                    category: 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
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
                    category: 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
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
                    category?: 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
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
                    referrer_id: string
                    referred_id: string
                    referral_code: string | null
                    reward_type: 'discount' | 'free_days' | 'cash' | null
                    reward_amount: number | null
                    status: 'pending' | 'applied' | 'expired'
                    created_at: string
                    applied_at: string | null
                }
                Insert: {
                    id?: string
                    referrer_id: string
                    referred_id: string
                    referral_code?: string | null
                    reward_type?: 'discount' | 'free_days' | 'cash' | null
                    reward_amount?: number | null
                    status?: 'pending' | 'applied' | 'expired'
                    created_at?: string
                    applied_at?: string | null
                }
                Update: {
                    id?: string
                    referrer_id?: string
                    referred_id?: string
                    referral_code?: string | null
                    reward_type?: 'discount' | 'free_days' | 'cash' | null
                    reward_amount?: number | null
                    status?: 'pending' | 'applied' | 'expired'
                    created_at?: string
                    applied_at?: string | null
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
