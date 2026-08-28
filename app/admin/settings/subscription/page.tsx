import { redirect } from 'next/navigation'
import SubscriptionSettings from '@/components/settings/SubscriptionSettings'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { isStaffRole } from '@/lib/auth/roles'
import {
    getSelectablePlans,
    getSubscriptionView,
    getTenantInvoices,
} from '@/lib/billing/subscription'
import { normalizeFeatureKeys } from '@/lib/platform/types'

export const metadata = { title: 'Billing & Subscription' }
/** Never cached: this page states what someone currently owes. */
export const dynamic = 'force-dynamic'

const BILLING_ROLES = new Set(['owner', 'admin'])

export default async function SubscriptionSettingsPage() {
    const context = await getCurrentGymContext()

    if (!context.user) redirect('/admin/login')
    if (!context.profile || !isStaffRole(context.profile.role) || !context.gym) redirect('/member')

    const gymId = context.gym.id

    const [view, plans, invoices] = await Promise.all([
        getSubscriptionView(gymId),
        getSelectablePlans(),
        getTenantInvoices(gymId),
    ])

    // Everyone on staff can see what the gym is paying; only owners and admins
    // can change it. The same check runs again inside every action.
    const canManage = Boolean(context.role && BILLING_ROLES.has(context.role))

    return (
        <SubscriptionSettings
            canManage={canManage}
            state={view.state}
            tone={view.tone}
            label={view.label}
            headline={view.headline}
            detail={view.detail}
            requiresAction={view.requiresAction}
            isLapsedState={view.isLapsed}
            hasSubscription={Boolean(view.subscription)}
            currentPlanId={view.plan?.id ?? null}
            currentPlanName={view.plan?.name ?? null}
            currentPlanSortOrder={view.plan?.sort_order ?? null}
            billingInterval={view.subscription?.billing_interval ?? 'monthly'}
            currentPrice={view.currentPrice}
            currency={view.subscription?.currency_code ?? 'INR'}
            effectiveUntil={view.effectiveUntil}
            daysRemaining={view.daysRemaining}
            cancelAtPeriodEnd={view.subscription?.cancel_at_period_end ?? false}
            pendingPlanName={view.pendingPlan?.name ?? null}
            pendingEffectiveAt={view.subscription?.pending_effective_at ?? null}
            usage={view.usage}
            plans={plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                code: plan.code,
                description: plan.description,
                price_monthly: Number(plan.price_monthly),
                price_annual: Number(plan.price_annual),
                max_members: plan.max_members,
                max_staff: plan.max_staff,
                sort_order: plan.sort_order,
                features: normalizeFeatureKeys(plan.features),
            }))}
            invoices={invoices.map((invoice) => {
                const plan = Array.isArray(invoice.plan) ? invoice.plan[0] : invoice.plan
                return {
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    status: invoice.status,
                    amount_due: Number(invoice.amount_due),
                    amount_paid: Number(invoice.amount_paid),
                    issued_at: invoice.issued_at,
                    paid_at: invoice.paid_at,
                    planName: plan?.name ?? null,
                    billing_interval: invoice.billing_interval,
                    payment_method: invoice.payment_method,
                    razorpay_payment_id: invoice.razorpay_payment_id,
                }
            })}
        />
    )
}
