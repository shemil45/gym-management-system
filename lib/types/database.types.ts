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
type PlatformRole = 'owner' | 'billing_admin' | 'support_agent' | 'analyst'
type GymOnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'stalled'
type GymPlatformStatus = 'active' | 'trialing' | 'suspended' | 'cancelled'
type GymSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused'
type PlatformBillingInterval = 'monthly' | 'annual'
type PlatformInvoiceStatus = 'draft' | 'open' | 'paid' | 'failed' | 'void'
type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_on_gym' | 'resolved' | 'closed'
type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent'
type SupportActorType = 'gym' | 'platform'
type AnnouncementAudienceType = 'all' | 'gym' | 'plan_segment'
type BackgroundJobStatus = 'queued' | 'running' | 'completed' | 'failed'
type SystemEventSeverity = 'info' | 'warning' | 'error' | 'critical'

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
                    business_name: string | null
                    contact_email: string | null
                    contact_phone: string | null
                    platform_status: GymPlatformStatus
                    onboarding_status: GymOnboardingStatus
                    trial_ends_at: string | null
                    onboarding_completed_at: string | null
                    suspended_at: string | null
                    suspension_reason: string | null
                    platform_notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug?: string | null
                    subdomain?: string | null
                    is_active?: boolean
                    business_name?: string | null
                    contact_email?: string | null
                    contact_phone?: string | null
                    platform_status?: GymPlatformStatus
                    onboarding_status?: GymOnboardingStatus
                    trial_ends_at?: string | null
                    onboarding_completed_at?: string | null
                    suspended_at?: string | null
                    suspension_reason?: string | null
                    platform_notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string | null
                    subdomain?: string | null
                    is_active?: boolean
                    business_name?: string | null
                    contact_email?: string | null
                    contact_phone?: string | null
                    platform_status?: GymPlatformStatus
                    onboarding_status?: GymOnboardingStatus
                    trial_ends_at?: string | null
                    onboarding_completed_at?: string | null
                    suspended_at?: string | null
                    suspension_reason?: string | null
                    platform_notes?: string | null
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
            platform_admins: {
                Row: {
                    id: string
                    user_id: string
                    role: PlatformRole
                    is_active: boolean
                    last_login_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    role: PlatformRole
                    is_active?: boolean
                    last_login_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    role?: PlatformRole
                    is_active?: boolean
                    last_login_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            platform_subscription_plans: {
                Row: {
                    id: string
                    name: string
                    code: string
                    description: string | null
                    price_monthly: number
                    price_annual: number
                    trial_days: number
                    is_active: boolean
                    features: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    code: string
                    description?: string | null
                    price_monthly?: number
                    price_annual?: number
                    trial_days?: number
                    is_active?: boolean
                    features?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    code?: string
                    description?: string | null
                    price_monthly?: number
                    price_annual?: number
                    trial_days?: number
                    is_active?: boolean
                    features?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            gym_subscriptions: {
                Row: {
                    id: string
                    gym_id: string
                    plan_id: string | null
                    status: GymSubscriptionStatus
                    billing_interval: PlatformBillingInterval
                    currency_code: string
                    monthly_price: number
                    annual_price: number
                    discount_percentage: number
                    discount_amount: number
                    free_extension_days: number
                    trial_ends_at: string | null
                    current_period_start: string | null
                    current_period_end: string | null
                    next_invoice_at: string | null
                    cancelled_at: string | null
                    failed_payment_count: number
                    notes: string | null
                    metadata: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id: string
                    plan_id?: string | null
                    status?: GymSubscriptionStatus
                    billing_interval?: PlatformBillingInterval
                    currency_code?: string
                    monthly_price?: number
                    annual_price?: number
                    discount_percentage?: number
                    discount_amount?: number
                    free_extension_days?: number
                    trial_ends_at?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    next_invoice_at?: string | null
                    cancelled_at?: string | null
                    failed_payment_count?: number
                    notes?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    plan_id?: string | null
                    status?: GymSubscriptionStatus
                    billing_interval?: PlatformBillingInterval
                    currency_code?: string
                    monthly_price?: number
                    annual_price?: number
                    discount_percentage?: number
                    discount_amount?: number
                    free_extension_days?: number
                    trial_ends_at?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    next_invoice_at?: string | null
                    cancelled_at?: string | null
                    failed_payment_count?: number
                    notes?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            gym_subscription_invoices: {
                Row: {
                    id: string
                    gym_id: string
                    subscription_id: string | null
                    invoice_number: string
                    status: PlatformInvoiceStatus
                    currency_code: string
                    amount_due: number
                    amount_paid: number
                    due_at: string | null
                    issued_at: string
                    paid_at: string | null
                    failed_at: string | null
                    period_start: string | null
                    period_end: string | null
                    external_reference: string | null
                    metadata: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id: string
                    subscription_id?: string | null
                    invoice_number: string
                    status?: PlatformInvoiceStatus
                    currency_code?: string
                    amount_due?: number
                    amount_paid?: number
                    due_at?: string | null
                    issued_at?: string
                    paid_at?: string | null
                    failed_at?: string | null
                    period_start?: string | null
                    period_end?: string | null
                    external_reference?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    subscription_id?: string | null
                    invoice_number?: string
                    status?: PlatformInvoiceStatus
                    currency_code?: string
                    amount_due?: number
                    amount_paid?: number
                    due_at?: string | null
                    issued_at?: string
                    paid_at?: string | null
                    failed_at?: string | null
                    period_start?: string | null
                    period_end?: string | null
                    external_reference?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            support_tickets: {
                Row: {
                    id: string
                    gym_id: string
                    created_by: string | null
                    assigned_to: string | null
                    subject: string
                    status: SupportTicketStatus
                    priority: SupportTicketPriority
                    summary: string | null
                    tags: string[]
                    last_message_at: string | null
                    resolved_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id: string
                    created_by?: string | null
                    assigned_to?: string | null
                    subject: string
                    status?: SupportTicketStatus
                    priority?: SupportTicketPriority
                    summary?: string | null
                    tags?: string[]
                    last_message_at?: string | null
                    resolved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    created_by?: string | null
                    assigned_to?: string | null
                    subject?: string
                    status?: SupportTicketStatus
                    priority?: SupportTicketPriority
                    summary?: string | null
                    tags?: string[]
                    last_message_at?: string | null
                    resolved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            support_ticket_messages: {
                Row: {
                    id: string
                    ticket_id: string
                    gym_id: string
                    sender_user_id: string | null
                    sender_platform_admin_id: string | null
                    sender_type: SupportActorType
                    message: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    ticket_id: string
                    gym_id: string
                    sender_user_id?: string | null
                    sender_platform_admin_id?: string | null
                    sender_type: SupportActorType
                    message: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    ticket_id?: string
                    gym_id?: string
                    sender_user_id?: string | null
                    sender_platform_admin_id?: string | null
                    sender_type?: SupportActorType
                    message?: string
                    created_at?: string
                }
            }
            platform_announcements: {
                Row: {
                    id: string
                    title: string
                    body: string
                    created_by: string | null
                    published_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    body: string
                    created_by?: string | null
                    published_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    body?: string
                    created_by?: string | null
                    published_at?: string
                    created_at?: string
                }
            }
            platform_announcement_targets: {
                Row: {
                    id: string
                    announcement_id: string
                    audience_type: AnnouncementAudienceType
                    gym_id: string | null
                    plan_id: string | null
                    segment_key: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    announcement_id: string
                    audience_type: AnnouncementAudienceType
                    gym_id?: string | null
                    plan_id?: string | null
                    segment_key?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    announcement_id?: string
                    audience_type?: AnnouncementAudienceType
                    gym_id?: string | null
                    plan_id?: string | null
                    segment_key?: string | null
                    created_at?: string
                }
            }
            platform_audit_logs: {
                Row: {
                    id: string
                    actor_user_id: string | null
                    actor_platform_admin_id: string | null
                    action: string
                    entity_type: string
                    entity_id: string | null
                    gym_id: string | null
                    metadata: Json
                    ip_address: unknown
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    actor_user_id?: string | null
                    actor_platform_admin_id?: string | null
                    action: string
                    entity_type: string
                    entity_id?: string | null
                    gym_id?: string | null
                    metadata?: Json
                    ip_address?: unknown
                    user_agent?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    actor_user_id?: string | null
                    actor_platform_admin_id?: string | null
                    action?: string
                    entity_type?: string
                    entity_id?: string | null
                    gym_id?: string | null
                    metadata?: Json
                    ip_address?: unknown
                    user_agent?: string | null
                    created_at?: string
                }
            }
            platform_feature_flags: {
                Row: {
                    id: string
                    key: string
                    description: string | null
                    is_enabled: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    key: string
                    description?: string | null
                    is_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    key?: string
                    description?: string | null
                    is_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            gym_feature_overrides: {
                Row: {
                    id: string
                    gym_id: string
                    feature_flag_id: string
                    is_enabled: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    gym_id: string
                    feature_flag_id: string
                    is_enabled: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    gym_id?: string
                    feature_flag_id?: string
                    is_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            platform_impersonation_sessions: {
                Row: {
                    id: string
                    platform_admin_id: string
                    gym_id: string
                    started_by_user_id: string
                    reason: string | null
                    banner_note: string | null
                    started_at: string
                    expires_at: string
                    ended_at: string | null
                }
                Insert: {
                    id?: string
                    platform_admin_id: string
                    gym_id: string
                    started_by_user_id: string
                    reason?: string | null
                    banner_note?: string | null
                    started_at?: string
                    expires_at?: string
                    ended_at?: string | null
                }
                Update: {
                    id?: string
                    platform_admin_id?: string
                    gym_id?: string
                    started_by_user_id?: string
                    reason?: string | null
                    banner_note?: string | null
                    started_at?: string
                    expires_at?: string
                    ended_at?: string | null
                }
            }
            background_job_runs: {
                Row: {
                    id: string
                    job_name: string
                    status: BackgroundJobStatus
                    started_at: string
                    finished_at: string | null
                    details: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    job_name: string
                    status?: BackgroundJobStatus
                    started_at?: string
                    finished_at?: string | null
                    details?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    job_name?: string
                    status?: BackgroundJobStatus
                    started_at?: string
                    finished_at?: string | null
                    details?: Json
                    created_at?: string
                }
            }
            system_events: {
                Row: {
                    id: string
                    source: string
                    severity: SystemEventSeverity
                    message: string
                    details: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    source: string
                    severity?: SystemEventSeverity
                    message: string
                    details?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    source?: string
                    severity?: SystemEventSeverity
                    message?: string
                    details?: Json
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            current_gym_id: {
                Args: never
                Returns: string
            }
            current_membership_business_date: {
                Args: never
                Returns: string
            }
            current_platform_impersonation_gym_id: {
                Args: never
                Returns: string
            }
            default_gym_id: {
                Args: never
                Returns: string
            }
            is_platform_admin: {
                Args: never
                Returns: boolean
            }
            is_staff_user: {
                Args: never
                Returns: boolean
            }
            profile_role_for_gym: {
                Args: {
                    profile_id: string
                    target_gym_id: string
                }
                Returns: string
            }
            sync_member_statuses: {
                Args: {
                    reference_date?: string
                }
                Returns: number
            }
            user_has_gym_access: {
                Args: {
                    target_gym_id: string
                }
                Returns: boolean
            }
        }
        Enums: {
            announcement_audience_type: AnnouncementAudienceType
            background_job_status: BackgroundJobStatus
            gym_onboarding_status: GymOnboardingStatus
            gym_platform_status: GymPlatformStatus
            gym_subscription_status: GymSubscriptionStatus
            platform_billing_interval: PlatformBillingInterval
            platform_invoice_status: PlatformInvoiceStatus
            platform_role: PlatformRole
            support_actor_type: SupportActorType
            support_ticket_priority: SupportTicketPriority
            support_ticket_status: SupportTicketStatus
            system_event_severity: SystemEventSeverity
        }
    }
}
