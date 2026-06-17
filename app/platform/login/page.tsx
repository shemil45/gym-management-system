import { redirect } from 'next/navigation'
import { loginPlatform } from '@/app/platform/actions'
import { getCurrentPlatformContext } from '@/lib/platform/server'

export default async function PlatformLoginPage() {
    const context = await getCurrentPlatformContext()

    if (context.user && context.platformAdmin) {
        redirect('/platform')
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa]">
            <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
                <div className="hidden border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] lg:block">
                    <div className="flex h-full flex-col justify-between p-16">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">GymOS Admin</p>
                            <h1 className="mt-5 max-w-xl text-6xl font-semibold tracking-tight text-slate-950">
                                Dense, fast controls for the full gym network.
                            </h1>
                            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                                Oversee subscriptions, tenant health, support operations, announcements, and audited access from one shared workspace.
                            </p>
                        </div>

                        <div className="grid max-w-2xl grid-cols-2 gap-4 text-sm">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-slate-500">Billing operations</p>
                                <p className="mt-2 text-xl font-semibold text-slate-950">Plans, invoices, churn, and MRR</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-slate-500">Support & governance</p>
                                <p className="mt-2 text-xl font-semibold text-slate-950">Tickets, flags, announcements, and audit trails</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center px-6 py-12 sm:px-10">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Platform Access</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Sign in</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                            Only active platform admins can enter this workspace.
                        </p>

                        <form action={loginPlatform} className="mt-8 space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <button className="h-11 w-full rounded-md bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-500">
                                Continue to portal
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
