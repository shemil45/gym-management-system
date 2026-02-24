import { Database } from './database.types'

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Entity types
export type Profile = Tables<'profiles'>
export type MembershipPlan = Tables<'membership_plans'>
export type Member = Tables<'members'>
export type CheckIn = Tables<'check_ins'>
export type Payment = Tables<'payments'>
export type Expense = Tables<'expenses'>
export type Referral = Tables<'referrals'>

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
