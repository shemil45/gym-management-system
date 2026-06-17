import { Database } from './database.types'
import type {
    GymFeatureFlag as PlatformGymFeatureFlag,
    ImpersonationSession as PlatformImpersonationSessionRecord,
    PlatformAdmin as PlatformAdminRecord,
    PlatformAnnouncement as PlatformAnnouncementRecord,
    PlatformAuditLog as PlatformAuditLogRecord,
    SaaSInvoice as GymSubscriptionInvoiceRecord,
    SaaSPlan as PlatformSubscriptionPlanRecord,
    SaaSSubscription as GymSubscriptionRecord,
    SupportTicket as SupportTicketRecord,
    SupportTicketMessage as SupportTicketMessageRecord,
} from '@/lib/platform/types'

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type QueryResult<T> = { data: T; error: unknown }

// Entity types
export type Gym = Tables<'gyms'>
export type Profile = Tables<'profiles'>
export type AdminMembership = Tables<'admins'>
export type MembershipPlan = Tables<'membership_plans'>
export type Member = Tables<'members'>
export type CheckIn = Tables<'check_ins'>
export type Payment = Tables<'payments'>
export type Expense = Tables<'expenses'>
export type Referral = Tables<'referrals'>
export type NotificationLog = Tables<'notification_logs'>
export type PlatformAdmin = PlatformAdminRecord
export type PlatformSubscriptionPlan = PlatformSubscriptionPlanRecord
export type GymSubscription = GymSubscriptionRecord
export type GymSubscriptionInvoice = GymSubscriptionInvoiceRecord
export type SupportTicket = SupportTicketRecord
export type SupportTicketMessage = SupportTicketMessageRecord
export type PlatformAnnouncement = PlatformAnnouncementRecord
export type PlatformAuditLog = PlatformAuditLogRecord
export type PlatformFeatureFlag = PlatformGymFeatureFlag
export type GymFeatureOverride = PlatformGymFeatureFlag
export type PlatformImpersonationSession = PlatformImpersonationSessionRecord
export type BackgroundJobRun = never
export type SystemEvent = never

// Extended types with relations
export type MemberWithPlan = Member & {
    membership_plan: MembershipPlan | null
}

export type CheckInWithMember = CheckIn & {
    member: Member
}

export type PaymentWithMember = Payment & {
    member: Member
}

export type ReferralWithMembers = Referral & {
    referrer: Member
    referred: Member
}

// Form types
export type MemberFormData = Omit<InsertTables<'members'>, 'id' | 'created_at' | 'updated_at'>
export type PaymentFormData = Omit<InsertTables<'payments'>, 'id' | 'created_at' | 'updated_at' | 'invoice_number'>
export type ExpenseFormData = Omit<InsertTables<'expenses'>, 'id' | 'created_at' | 'updated_at'>

// Dashboard stats
export interface DashboardStats {
    totalMembers: number
    activeMembers: number
    expiredMembers: number
    todayRevenue: number
    todayCheckIns: number
    expiringThisWeek: number
}

// Chart data
export interface RevenueChartData {
    date: string
    revenue: number
}

export interface AttendanceChartData {
    date: string
    checkIns: number
}
