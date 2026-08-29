import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { recordBackgroundJobRun, recordSystemEvent } from '@/lib/platform/auth'
import {
    PLAN_ENTITLEMENT_COLUMNS,
    buildEntitlementSnapshot,
    type PlanEntitlementSource,
} from '@/lib/billing/plan-entitlements'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily subscription lifecycle transitions.
 *
 * Nothing in the product writes these transitions on read - a page load must
 * never mutate billing state, or the same tenant would transition differently
 * depending on who happened to look at them. This job is the only writer.
 *
 * Order matters: scheduled downgrades are applied before expiry checks, so a
 * tenant who downgraded at renewal is judged against the plan they actually
 * moved onto.
 */
export async function GET(request: Request) {
    // Same shared-secret scheme as the existing expiry-reminder cron.
    const secret = process.env.CRON_SECRET
    const provided =
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
        new URL(request.url).searchParams.get('secret')

    if (secret && provided !== secret) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const startedAt = new Date().toISOString()
    const db = getSupabaseAdmin()
    const now = new Date()
    const nowIso = now.toISOString()

    const summary = {
        downgradesApplied: 0,
        trialsExpired: 0,
        periodsLapsed: 0,
        graceExpired: 0,
        cancellationsCompleted: 0,
    }

    try {
        // 1. Apply scheduled downgrades that have come due -------------------
        const pendingResult = await db
            .from('gym_subscriptions')
            .select('id, gym_id, pending_plan_id, pending_billing_interval, pending_effective_at')
            .not('pending_plan_id', 'is', null)
            .lte('pending_effective_at', nowIso)

        for (const row of (pendingResult.data ?? []) as Array<{
            id: string
            gym_id: string
            pending_plan_id: string
            pending_billing_interval: 'monthly' | 'annual' | null
            pending_effective_at: string
        }>) {
            const planResult = await db
                .from('platform_subscription_plans')
                .select(`price_monthly, price_annual, ${PLAN_ENTITLEMENT_COLUMNS}`)
                .eq('id', row.pending_plan_id)
                .maybeSingle()

            const plan = planResult.data as
                | ({ price_monthly: number; price_annual: number } & PlanEntitlementSource)
                | null
            if (!plan) continue

            const interval = row.pending_billing_interval ?? 'monthly'
            const periodStart = new Date(row.pending_effective_at)
            const periodEnd = new Date(periodStart)
            if (interval === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            else periodEnd.setMonth(periodEnd.getMonth() + 1)

            await db
                .from('gym_subscriptions')
                .update({
                    plan_id: row.pending_plan_id,
                    billing_interval: interval,
                    monthly_price: plan.price_monthly,
                    annual_price: plan.price_annual,
                    // A scheduled downgrade landing is an assignment: it takes
                    // the plan's entitlements as they stand on the day it applies.
                    plan_entitlements: buildEntitlementSnapshot(plan),
                    plan_entitlements_set_at: new Date().toISOString(),
                    current_period_start: periodStart.toISOString(),
                    current_period_end: periodEnd.toISOString(),
                    next_invoice_at: periodEnd.toISOString(),
                    pending_plan_id: null,
                    pending_billing_interval: null,
                    pending_effective_at: null,
                } as never)
                .eq('id', row.id)

            summary.downgradesApplied += 1
        }

        // 2. Trials whose window has closed ----------------------------------
        const expiredTrials = await db
            .from('gym_subscriptions')
            .select('id, gym_id')
            .eq('status', 'trialing')
            .lt('trial_ends_at', nowIso)

        for (const row of (expiredTrials.data ?? []) as Array<{ id: string; gym_id: string }>) {
            await db
                .from('gym_subscriptions')
                .update({ status: 'past_due', grace_ends_at: nowIso } as never)
                .eq('id', row.id)
            summary.trialsExpired += 1
        }

        // 3. Active periods that ran out without a renewal payment -----------
        //    A cancellation that reached its end date closes cleanly; anything
        //    else opens the grace window instead.
        const lapsed = await db
            .from('gym_subscriptions')
            .select('id, gym_id, cancel_at_period_end, current_period_end, plan:platform_subscription_plans(grace_period_days)')
            .eq('status', 'active')
            .lt('current_period_end', nowIso)

        for (const row of (lapsed.data ?? []) as Array<{
            id: string
            gym_id: string
            cancel_at_period_end: boolean
            current_period_end: string
            plan: { grace_period_days: number } | { grace_period_days: number }[] | null
        }>) {
            if (row.cancel_at_period_end) {
                await db
                    .from('gym_subscriptions')
                    .update({ status: 'cancelled', cancelled_at: nowIso } as never)
                    .eq('id', row.id)
                summary.cancellationsCompleted += 1
                continue
            }

            const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan
            const graceDays = plan?.grace_period_days ?? 7
            const graceEnd = new Date(new Date(row.current_period_end).getTime() + graceDays * 86_400_000)

            await db
                .from('gym_subscriptions')
                .update({ status: 'past_due', grace_ends_at: graceEnd.toISOString() } as never)
                .eq('id', row.id)
            summary.periodsLapsed += 1
        }

        // 4. Grace windows that have closed ----------------------------------
        //    The subscription lapses, and the gym drops to `trialing` at the
        //    platform level rather than `suspended`: suspension is a decision a
        //    platform admin makes, not something a missed payment does on its
        //    own. Feature entitlements already collapse via the lapsed state.
        const graceOver = await db
            .from('gym_subscriptions')
            .select('id, gym_id')
            .eq('status', 'past_due')
            .not('grace_ends_at', 'is', null)
            .lt('grace_ends_at', nowIso)

        for (const row of (graceOver.data ?? []) as Array<{ id: string; gym_id: string }>) {
            await db
                .from('gym_subscriptions')
                .update({ status: 'cancelled', cancelled_at: nowIso } as never)
                .eq('id', row.id)

            await db
                .from('gyms')
                .update({ platform_status: 'trialing' } as never)
                .eq('id', row.gym_id)
                .eq('platform_status', 'active')

            summary.graceExpired += 1
        }

        await recordBackgroundJobRun({
            jobName: 'cron.billing-lifecycle',
            status: 'completed',
            startedAt,
            finishedAt: new Date().toISOString(),
            details: summary,
        })

        return NextResponse.json({ success: true, processedAt: nowIso, ...summary })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Billing lifecycle run failed.'

        await Promise.all([
            recordBackgroundJobRun({
                jobName: 'cron.billing-lifecycle',
                status: 'failed',
                startedAt,
                finishedAt: new Date().toISOString(),
                details: { error: message, ...summary },
            }),
            recordSystemEvent('cron.billing-lifecycle', 'error', message, summary),
        ])

        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
