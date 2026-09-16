import Link from 'next/link'
import { ArrowRight, BarChart2, CreditCard, Receipt, UserCheck, Users, Gift } from 'lucide-react'

export type ReportArea = { id: string; title: string; blurb: string; href?: string }

export const REPORT_AREAS: ReportArea[] = [
    { id: 'payments', title: 'Payments', blurb: 'Day book, period summary, collections by plan and staff, pending follow-ups, CSV export.', href: '/admin/reports/payments' },
    { id: 'expenses', title: 'Expenses & P&L', blurb: 'Expenses by category and a profit and loss statement by day, week or month.', href: '/admin/reports/expenses' },
    { id: 'members', title: 'Members', blurb: 'New joins, expiring and lapsed members, churn and retention, plan distribution.', href: '/admin/reports/members' },
    { id: 'attendance', title: 'Attendance', blurb: 'Daily footfall, per-member attendance, hour × weekday heat table.', href: '/admin/reports/attendance' },
    { id: 'referrals', title: 'Referrals', blurb: 'Referrer leaderboard, conversions, coins issued and redeemed.' },
]

const ICONS: Record<string, React.ReactNode> = {
    payments: <CreditCard className="h-5 w-5" aria-hidden="true" />,
    expenses: <Receipt className="h-5 w-5" aria-hidden="true" />,
    members: <Users className="h-5 w-5" aria-hidden="true" />,
    attendance: <UserCheck className="h-5 w-5" aria-hidden="true" />,
    referrals: <Gift className="h-5 w-5" aria-hidden="true" />,
}

export default function ReportsLanding() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <BarChart2 className="h-5 w-5 text-gray-500 dark:text-neutral-400" aria-hidden="true" />
                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reports</h1>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-neutral-400">Detailed, exportable views of your gym&apos;s data.</p>
                </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_AREAS.map((area) => {
                    const body = (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">{ICONS[area.id]}</span>
                                {area.href
                                    ? <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-700 dark:group-hover:text-white" aria-hidden="true" />
                                    : <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:border-neutral-700 dark:text-neutral-400">Coming soon</span>}
                            </div>
                            <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{area.title}</h2>
                            <p className="mt-1 text-sm text-pretty text-gray-600 dark:text-neutral-400">{area.blurb}</p>
                        </>
                    )
                    const className = 'block h-full rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900'
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
