import Link from 'next/link'
import { getOnboardingProgress } from '@/lib/gym/features'
import { getSubscriptionView } from '@/lib/billing/subscription'

/**
 * At most one account-level notice above the admin content.
 *
 * Deliberately singular. A lapsed subscription and unfinished onboarding are
 * both real, but stacking two amber bars above every page trains people to
 * scroll past both, so the more urgent one wins and the other waits its turn.
 *
 * Nothing renders in the healthy case - the dashboard stays uncluttered, which
 * is the point.
 */

type Severity = 'critical' | 'warning'

const STYLES: Record<Severity, { wrap: string; title: string; body: string; cta: string }> = {
    critical: {
        wrap: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
        title: 'text-red-900 dark:text-red-200',
        body: 'text-red-800/80 dark:text-red-200/70',
        cta: 'bg-red-700 text-red-50 dark:bg-red-300 dark:text-red-950',
    },
    warning: {
        wrap: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        title: 'text-amber-900 dark:text-amber-200',
        body: 'text-amber-800/80 dark:text-amber-200/70',
        cta: 'bg-amber-900 text-amber-50 dark:bg-amber-200 dark:text-amber-950',
    },
}

export default async function AccountNotice({ gymId }: { gymId: string }) {
    const [subscription, onboarding] = await Promise.all([
        getSubscriptionView(gymId),
        getOnboardingProgress(gymId),
    ])

    let notice: {
        severity: Severity
        title: string
        body: string
        href: string
        cta: string
    } | null = null

    if (subscription.requiresAction) {
        notice = {
            severity: subscription.tone === 'danger' ? 'critical' : 'warning',
            title: subscription.headline,
            body: subscription.detail,
            href: '/admin/settings/subscription',
            cta: subscription.isLapsed ? 'Renew plan' : 'View billing',
        }
    } else if (!onboarding.complete) {
        notice = {
            severity: 'warning',
            title:
                onboarding.remaining === 0
                    ? 'One step left to unlock your full plan.'
                    : `${onboarding.remaining} ${onboarding.remaining === 1 ? 'detail' : 'details'} left to unlock your full plan.`,
            body: 'Members, check-ins and payments already work.',
            href: '/admin/setup',
            cta: 'Finish setup',
        }
    }

    if (!notice) return null

    const style = STYLES[notice.severity]

    return (
        <div
            className={`mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${style.wrap}`}
        >
            <div className="min-w-0">
                <p className={`text-sm font-semibold ${style.title}`}>{notice.title}</p>
                <p className={`mt-0.5 text-sm ${style.body}`}>{notice.body}</p>
            </div>
            <Link
                href={notice.href}
                className={`shrink-0 rounded-full px-4 py-2 text-center text-sm font-medium transition-opacity hover:opacity-90 ${style.cta}`}
            >
                {notice.cta}
            </Link>
        </div>
    )
}
