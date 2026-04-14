import { redirect } from 'next/navigation'
import { chooseGym } from '@/app/select-gym/actions'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function SelectGymPage() {
    const context = await getCurrentGymContext()

    if (!context.user) {
        redirect('/login')
    }

    if (context.accessibleGyms.length === 0) {
        return (
            <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
                <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">FitGym</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">No gym access found</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Your account is signed in, but it is not linked to any gym yet. Ask a gym admin to add you to a location and then try again.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_42%,#eef2ff_100%)] px-6 py-12">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Tenant Context</p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Choose your gym</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        {context.accessibleGyms.length > 1
                            ? 'Your account belongs to multiple gyms. Pick the gym you want to work in for this session.'
                            : 'Your account is linked to one gym. You can continue directly or re-open this page later to switch if more gyms are added.'}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {context.accessibleGyms.map(({ gym, role, accessType }) => {
                        const isActive = context.gym?.id === gym.id

                        return (
                            <form
                                key={gym.id}
                                action={chooseGym}
                                className={`rounded-[1.75rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-colors ${
                                    isActive
                                        ? 'border-blue-200 bg-blue-50/80'
                                        : 'border-white/70 bg-white/90'
                                }`}
                            >
                                <input type="hidden" name="gym_id" value={gym.id} />

                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                            {accessType === 'admin' ? 'Staff Access' : 'Member Access'}
                                        </p>
                                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{gym.name}</h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {gym.subdomain ? `${gym.subdomain}.fitgym.com` : 'Subdomain not configured yet'}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant="outline" className="border-slate-200 bg-white/80 text-slate-700">
                                            {role.replace(/_/g, ' ')}
                                        </Badge>
                                        {isActive ? (
                                            <Badge className="bg-blue-600 text-white hover:bg-blue-600">Current</Badge>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-5">
                                    <p className="text-sm text-slate-600">
                                        {accessType === 'admin'
                                            ? 'Manage members, plans, reports, and finances in this gym.'
                                            : 'View your membership, payments, check-ins, and plans for this gym.'}
                                    </p>
                                    <Button type="submit" className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800">
                                        {isActive ? 'Continue' : 'Switch'}
                                    </Button>
                                </div>
                            </form>
                        )
                    })}
                </div>
            </div>
        </main>
    )
}
