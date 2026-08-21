import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMemberContext } from '@/lib/auth/member-server'

/**
 * Single read model for the member portal.
 *
 * Everything the mobile screens render comes from here so a screen never has to
 * think about Supabase shapes, and so every screen degrades the same way when a
 * table is missing or a member record has not been provisioned yet.
 *
 * Tables that are part of the AI-coach feature set (`fitness_profiles`,
 * `workout_plans`, `nutrition_plans`) are not in the generated Database types,
 * so they are read through a loosened client and always guarded.
 */

export type MembershipState = 'active' | 'expiring' | 'expired' | 'frozen' | 'inactive'

export interface MemberIdentity {
    id: string
    memberCode: string
    fullName: string
    firstName: string
    photoUrl: string | null
    email: string | null
    phone: string | null
    joinedAt: string | null
}

export interface GymIdentity {
    name: string
    city: string | null
    phone: string | null
}

export interface MembershipSummary {
    planName: string | null
    planPrice: number | null
    durationDays: number | null
    startDate: string | null
    expiryDate: string | null
    state: MembershipState
    daysRemaining: number | null
    /** 0..1, how much of the current term has been consumed. */
    elapsed: number
}

export interface CheckInRecord {
    id: string
    checkInTime: string
    checkOutTime: string | null
    entryMethod: string
}

export interface ActivitySummary {
    streak: number
    thisMonth: number
    thisWeek: number
    allTime: number
    lastCheckIn: string | null
    /** ISO yyyy-mm-dd for every day with at least one visit, newest first. */
    activeDays: string[]
    recent: CheckInRecord[]
}

export interface PaymentRecord {
    id: string
    amount: number
    date: string
    method: string
    status: string
    invoiceNumber: string | null
    receiptNumber: string | null
    periodStart: string | null
    periodEnd: string | null
}

export interface PlanOption {
    id: string
    name: string
    price: number
    durationDays: number
    description: string | null
    features: string[]
}

export interface TrainingExercise {
    name: string
    sets: number
    reps: string
    restSeconds: number
    notes?: string
}

export interface TrainingSession {
    day: string
    focus: string
    exercises: TrainingExercise[]
}

export interface TrainingSummary {
    /** True when the member has generated a plan; false drives the empty state. */
    hasPlan: boolean
    hasProfile: boolean
    summary: string | null
    sessions: TrainingSession[]
    today: TrainingSession | null
    nutrition: {
        hasPlan: boolean
        calories: number | null
        protein: number | null
        carbs: number | null
        fat: number | null
    }
}

export interface MemberPortalData {
    member: MemberIdentity
    gym: GymIdentity
    membership: MembershipSummary
    activity: ActivitySummary
    payments: {
        last: PaymentRecord | null
        history: PaymentRecord[]
    }
    plans: PlanOption[]
    training: TrainingSummary
    credits: number
}

/* Rows as they come back from Supabase, before mapping into the read model. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

interface MemberRow {
    id: string
    member_id: string
    full_name: string | null
    email: string | null
    phone: string | null
    photo_url: string | null
    created_at: string | null
    status: string | null
    membership_start_date: string | null
    membership_expiry_date: string | null
    referral_coins_balance: number | null
    membership_plan: { name: string; price: number; duration_days: number } | null
}

interface CheckInRow {
    id: string
    check_in_time: string
    check_out_time: string | null
    entry_method: string | null
}

interface PaymentRow {
    id: string
    amount: number | null
    payment_date: string
    payment_method: string | null
    payment_status: string | null
    invoice_number: string | null
    receipt_number: string | null
    membership_start_date: string | null
    membership_end_date: string | null
}

interface PlanRow {
    id: string
    name: string
    price: number | null
    duration_days: number | null
    description: string | null
    features: Json
}

interface WorkoutPlanRow {
    plan_data: {
        summary?: string
        days?: {
            day?: string
            focus?: string
            exercises?: {
                name?: string
                sets?: number
                reps?: string
                rest_seconds?: number
                notes?: string
            }[]
        }[]
    } | null
}

interface NutritionPlanRow {
    plan_data: {
        daily_calories?: number
        calories?: number
        protein_g?: number
        protein?: number
        carbs_g?: number
        carbs?: number
        fat_g?: number
        fat?: number
    } | null
}

/**
 * `fitness_profiles`, `workout_plans` and `nutrition_plans` are not in the
 * generated Database types, so they are reached through a minimal structural
 * client rather than the typed one.
 */
type LooseQuery = {
    select(columns: string): LooseQuery
    eq(column: string, value: unknown): LooseQuery
    order(column: string, options: { ascending: boolean }): LooseQuery
    limit(count: number): Promise<{ data: unknown[] | null }>
}

type LooseClient = { from(table: string): LooseQuery }

const DAY_MS = 86_400_000

function toDayKey(value: string | Date): string {
    const d = typeof value === 'string' ? new Date(value) : value
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfToday(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export function daysBetween(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

function resolveMembershipState(
    rawStatus: string,
    daysRemaining: number | null,
): MembershipState {
    if (rawStatus === 'frozen') return 'frozen'
    if (rawStatus === 'expired') return 'expired'
    if (daysRemaining !== null && daysRemaining < 0) return 'expired'
    if (rawStatus === 'inactive') return 'inactive'
    if (daysRemaining !== null && daysRemaining <= 7) return 'expiring'
    if (rawStatus === 'active') return 'active'
    return 'inactive'
}

/** Consecutive days ending today or yesterday. */
function computeStreak(activeDays: string[]): number {
    if (activeDays.length === 0) return 0

    const today = toDayKey(new Date())
    const yesterday = toDayKey(new Date(Date.now() - DAY_MS))
    if (activeDays[0] !== today && activeDays[0] !== yesterday) return 0

    let streak = 1
    for (let i = 0; i < activeDays.length - 1; i++) {
        const gap = daysBetween(new Date(activeDays[i + 1]), new Date(activeDays[i]))
        if (gap === 1) streak++
        else break
    }
    return streak
}

function normaliseFeatures(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter((f): f is string => typeof f === 'string')
    return []
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pickTodaysSession(sessions: TrainingSession[]): TrainingSession | null {
    if (sessions.length === 0) return null
    const todayName = WEEKDAYS[new Date().getDay()].toLowerCase()
    const named = sessions.find((s) => s.day?.toLowerCase().includes(todayName))
    if (named) return named
    // Plans stored as "Day 1..Day N" rotate through the week instead.
    return sessions[new Date().getDay() % sessions.length]
}

export const getMemberPortalData = cache(async (): Promise<MemberPortalData | null> => {
    const context = await getCurrentMemberContext()
    if (!context.user || !context.gym) return null

    const supabase = await createClient()
    const loose = supabase as unknown as LooseClient

    const { data: memberRow } = (await supabase
        .from('members')
        .select(
            'id, member_id, full_name, email, phone, photo_url, created_at, status, membership_start_date, membership_expiry_date, referral_coins_balance, membership_plan:membership_plans(name, price, duration_days)',
        )
        .eq('user_id', context.user.id)
        .maybeSingle()) as { data: MemberRow | null }

    if (!memberRow) return null

    const memberId: string = memberRow.id
    const today = startOfToday()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const weekStart = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY_MS)

    const [checkInsRes, paymentsRes, plansRes, workoutRes, nutritionRes, profileRes] =
        await Promise.all([
            supabase
                .from('check_ins')
                .select('id, check_in_time, check_out_time, entry_method')
                .eq('member_id', memberId)
                .order('check_in_time', { ascending: false })
                .limit(400),
            supabase
                .from('payments')
                .select(
                    'id, amount, payment_date, payment_method, payment_status, invoice_number, receipt_number, membership_start_date, membership_end_date',
                )
                .eq('member_id', memberId)
                .order('payment_date', { ascending: false })
                .limit(24),
            supabase
                .from('membership_plans')
                .select('id, name, price, duration_days, description, features')
                .eq('is_active', true)
                .order('price', { ascending: true }),
            loose
                .from('workout_plans')
                .select('plan_data, version')
                .eq('user_id', context.user.id)
                .order('version', { ascending: false })
                .limit(1),
            loose
                .from('nutrition_plans')
                .select('plan_data, version')
                .eq('user_id', context.user.id)
                .order('version', { ascending: false })
                .limit(1),
            loose
                .from('fitness_profiles')
                .select('user_id')
                .eq('user_id', context.user.id)
                .limit(1),
        ])

    // ---- activity ------------------------------------------------------
    const checkInRows = (checkInsRes.data ?? []) as unknown as CheckInRow[]
    const recent: CheckInRecord[] = checkInRows.map((row) => ({
        id: row.id,
        checkInTime: row.check_in_time,
        checkOutTime: row.check_out_time,
        entryMethod: row.entry_method ?? 'manual',
    }))

    const activeDays = [...new Set(recent.map((c) => toDayKey(c.checkInTime)))].sort().reverse()

    const activity: ActivitySummary = {
        streak: computeStreak(activeDays),
        thisMonth: recent.filter((c) => new Date(c.checkInTime) >= monthStart).length,
        thisWeek: recent.filter((c) => new Date(c.checkInTime) >= weekStart).length,
        allTime: recent.length,
        lastCheckIn: recent[0]?.checkInTime ?? null,
        activeDays,
        recent,
    }

    // ---- payments ------------------------------------------------------
    const paymentRows = (paymentsRes.data ?? []) as unknown as PaymentRow[]
    const history: PaymentRecord[] = paymentRows.map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        date: row.payment_date,
        method: row.payment_method ?? 'cash',
        status: row.payment_status ?? 'paid',
        invoiceNumber: row.invoice_number,
        receiptNumber: row.receipt_number,
        periodStart: row.membership_start_date,
        periodEnd: row.membership_end_date,
    }))

    // ---- membership ----------------------------------------------------
    const expiryDate: string | null = memberRow.membership_expiry_date
    const startDate: string | null = memberRow.membership_start_date
    const daysRemaining = expiryDate ? daysBetween(today, new Date(expiryDate)) : null

    let elapsed = 0
    if (startDate && expiryDate) {
        const total = daysBetween(new Date(startDate), new Date(expiryDate))
        const used = daysBetween(new Date(startDate), today)
        elapsed = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0
    }

    const membership: MembershipSummary = {
        planName: memberRow.membership_plan?.name ?? null,
        planPrice: memberRow.membership_plan?.price ?? null,
        durationDays: memberRow.membership_plan?.duration_days ?? null,
        startDate,
        expiryDate,
        state: resolveMembershipState(memberRow.status ?? 'inactive', daysRemaining),
        daysRemaining,
        elapsed,
    }

    // ---- training ------------------------------------------------------
    const workoutPlan = (workoutRes.data as WorkoutPlanRow[] | null)?.[0]?.plan_data ?? null
    const nutritionPlan =
        (nutritionRes.data as NutritionPlanRow[] | null)?.[0]?.plan_data ?? null

    const sessions: TrainingSession[] = Array.isArray(workoutPlan?.days)
        ? workoutPlan.days.map((d) => ({
              day: String(d.day ?? ''),
              focus: String(d.focus ?? ''),
              exercises: Array.isArray(d.exercises)
                  ? d.exercises.map((e) => ({
                        name: String(e.name ?? ''),
                        sets: Number(e.sets ?? 0),
                        reps: String(e.reps ?? ''),
                        restSeconds: Number(e.rest_seconds ?? 0),
                        notes: e.notes ? String(e.notes) : undefined,
                    }))
                  : [],
          }))
        : []

    const training: TrainingSummary = {
        hasPlan: sessions.length > 0,
        hasProfile: ((profileRes.data as unknown[] | null)?.length ?? 0) > 0,
        summary: workoutPlan?.summary ? String(workoutPlan.summary) : null,
        sessions,
        today: pickTodaysSession(sessions),
        nutrition: {
            hasPlan: Boolean(nutritionPlan),
            calories: nutritionPlan?.daily_calories ?? nutritionPlan?.calories ?? null,
            protein: nutritionPlan?.protein_g ?? nutritionPlan?.protein ?? null,
            carbs: nutritionPlan?.carbs_g ?? nutritionPlan?.carbs ?? null,
            fat: nutritionPlan?.fat_g ?? nutritionPlan?.fat ?? null,
        },
    }

    const fullName: string = memberRow.full_name ?? context.profile?.full_name ?? 'Member'

    return {
        member: {
            id: memberId,
            memberCode: memberRow.member_id,
            fullName,
            firstName: fullName.trim().split(/\s+/)[0] ?? fullName,
            photoUrl: memberRow.photo_url ?? context.profile?.photo_url ?? null,
            email: memberRow.email ?? context.user.email ?? null,
            phone: memberRow.phone ?? null,
            joinedAt: memberRow.created_at ?? null,
        },
        gym: {
            name: context.gym.name,
            city: null,
            phone: null,
        },
        membership,
        activity,
        payments: { last: history.find((p) => p.status === 'paid') ?? null, history },
        plans: ((plansRes.data ?? []) as unknown as PlanRow[]).map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price ?? 0),
            durationDays: Number(p.duration_days ?? 0),
            description: p.description,
            features: normaliseFeatures(p.features),
        })),
        training,
        credits: Number(memberRow.referral_coins_balance ?? 0),
    }
})
