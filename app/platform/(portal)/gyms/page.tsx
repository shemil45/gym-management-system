import Link from 'next/link'
import {
    EmptyState,
    PlatformBadge,
    PlatformButton,
    PlatformCardHeader,
    PlatformInput,
    PlatformShellCard,
} from '@/components/platform/PortalUI'
import { getPlatformGyms } from '@/lib/platform/server'
import { formatCurrency } from '@/lib/utils/currency'

function toneForStatus(status: string) {
    if (status === 'active' || status === 'completed') return 'success'
    if (status === 'trialing' || status === 'in_progress') return 'accent'
    if (status === 'suspended' || status === 'cancelled' || status === 'stalled') return 'warning'
    return 'neutral'
}

export default async function PlatformGymsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q } = await searchParams
    const gyms = await getPlatformGyms(q)

    return (
        <div className="space-y-6">
            <PlatformShellCard>
                <PlatformCardHeader
                    eyebrow="Gyms"
                    title="Tenant directory"
                    description="Search by location, contact details, subdomain, or business name."
                    action={
                        <form className="flex w-full gap-3 sm:w-auto">
                            <PlatformInput name="q" defaultValue={q} placeholder="Search gyms, subdomain, city, or contact" className="min-w-[280px]" />
                            <PlatformButton>Search</PlatformButton>
                        </form>
                    }
                />
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th className="px-5 py-3 font-medium">Gym</th>
                                <th className="px-5 py-3 font-medium">Location</th>
                                <th className="px-5 py-3 font-medium">Platform status</th>
                                <th className="px-5 py-3 font-medium">Onboarding</th>
                                <th className="px-5 py-3 font-medium">Members</th>
                                <th className="px-5 py-3 font-medium">Subscription</th>
                                <th className="px-5 py-3 font-medium">Open tickets</th>
                                <th className="px-5 py-3 font-medium">MRR</th>
                                <th className="px-5 py-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gyms.length ? gyms.map((gym) => (
                                <tr key={gym.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-950">{gym.name}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{gym.subdomain || gym.slug || 'No subdomain'}</p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {[gym.city, gym.state, gym.country].filter(Boolean).join(', ') || 'Not set'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <PlatformBadge tone={toneForStatus(gym.platform_status) as never}>
                                            {gym.platform_status.replace(/_/g, ' ')}
                                        </PlatformBadge>
                                    </td>
                                    <td className="px-5 py-4">
                                        <PlatformBadge tone={toneForStatus(gym.onboarding_status) as never}>
                                            {gym.onboarding_status.replace(/_/g, ' ')}
                                        </PlatformBadge>
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">{gym.memberCount}</td>
                                    <td className="px-5 py-4 text-slate-700">
                                        {gym.subscription?.plan?.name || 'Unassigned'}
                                        <p className="mt-1 text-xs text-slate-500">{gym.subscription?.status?.replace(/_/g, ' ') || 'No subscription'}</p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">{gym.openTickets}</td>
                                    <td className="px-5 py-4 font-medium text-slate-900">{formatCurrency(gym.mrr)}</td>
                                    <td className="px-5 py-4 text-right">
                                        <Link href={`/platform/gyms/${gym.id}`} className="text-sm font-medium text-indigo-700 hover:text-indigo-600">
                                            Open profile
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} className="px-5 py-8">
                                        <EmptyState message="No gyms matched that search." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </PlatformShellCard>
        </div>
    )
}
