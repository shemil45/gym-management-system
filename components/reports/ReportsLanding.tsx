import Link from 'next/link'
import { ArrowRight, BarChart2, CreditCard, Receipt, UserCheck, Users, Gift } from 'lucide-react'

export type ReportAreaCard = { id: string; title: string; blurb: string; href?: string }

export const REPORT_AREAS: ReportAreaCard[] = [
    { id: 'payments', title: 'Payments', blurb: 'Track collections, revenue trends, plan and staff performance, and pending or failed payments.', href: '/admin/reports/payments' },
    { id: 'expenses', title: 'Expenses & P&L', blurb: 'Analyse expenses, revenue, operating result and financial trends across any period.', href: '/admin/reports/expenses' },
    { id: 'members', title: 'Members', blurb: 'Understand member growth, renewals, retention, churn and plan distribution.', href: '/admin/reports/members' },
    { id: 'attendance', title: 'Attendance', blurb: 'Analyse footfall trends, member engagement and peak hours across the week.', href: '/admin/reports/attendance' },
    { id: 'referrals', title: 'Referrals', blurb: 'Measure referral performance, conversion rates, coin rewards and member acquisition.', href: '/admin/reports/referrals' },
]

const ICONS: Record<string, React.ReactNode> = {
    payments: <CreditCard className="h-5 w-5" aria-hidden="true" />,
    expenses: <Receipt className="h-5 w-5" aria-hidden="true" />,
    members: <Users className="h-5 w-5" aria-hidden="true" />,
    attendance: <UserCheck className="h-5 w-5" aria-hidden="true" />,
    referrals: <Gift className="h-5 w-5" aria-hidden="true" />,
}

/**
 * `stats` holds one node per area id — the metadata line at the foot of a card.
 * The page passes Suspense-wrapped server components so the cards paint before
 * the counts land; omitting it renders the cards with an empty footer.
 */
export default function ReportsLanding({ stats }: { stats?: Record<string, React.ReactNode> }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <BarChart2 className="h-5 w-5 text-gray-500 dark:text-neutral-400" aria-hidden="true" />
                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reports</h1>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-neutral-400">Understand your gym&apos;s performance with detailed analytics, trends and actionable insights.</p>
                </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_AREAS.map((area) => {
                    const body = (
                        <>
                            <div className="flex items-start justify-between gap-3">
                                <span className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors group-hover:bg-gray-900 group-hover:text-white dark:bg-neutral-800 dark:text-neutral-200 dark:group-hover:bg-white dark:group-hover:text-neutral-900">{ICONS[area.id]}</span>
                                {area.href
                                    ? <ArrowRight className="mt-1 h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-900 dark:text-neutral-600 dark:group-hover:text-white" aria-hidden="true" />
                                    : <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:border-neutral-700 dark:text-neutral-400">Coming soon</span>}
                            </div>
                            <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{area.title}</h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-pretty text-gray-600 dark:text-neutral-400">{area.blurb}</p>
                            {/* Pinned to the foot by mt-auto so every card ends on the
                                same line however long its description wraps. */}
                            <div className="mt-auto flex min-h-4 items-end pt-4 text-xs font-medium tabular-nums text-gray-500 dark:text-neutral-500">
                                {stats?.[area.id]}
                            </div>
                        </>
                    )
                    const className = 'flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900'
                    return (
                        <li key={area.id}>
                            {area.href
                                ? <Link href={area.href} className={`group ${className} transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-neutral-500 dark:hover:border-neutral-500`}>{body}</Link>
                                : <div aria-disabled="true" className={`${className} cursor-default opacity-70`}>{body}</div>}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
