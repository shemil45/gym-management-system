import Link from 'next/link'
import { requirePlatformContext } from '@/lib/platform/server'
import PlatformNav from '@/components/platform/PlatformNav'
import { PlatformBadge, PlatformButton } from '@/components/platform/PortalUI'
import { signOutPlatform, stopImpersonation } from '@/app/platform/actions'
import { formatRoleLabel } from '@/lib/auth/roles'

export default async function PlatformLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const context = await requirePlatformContext()

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <div className="flex min-h-screen">
                <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-900/60 bg-[#0f1117] px-4 py-5 text-white lg:flex">
                    <div className="border-b border-white/10 pb-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">GymOS Admin</p>
                        <h1 className="mt-2 text-xl font-semibold tracking-tight">Platform Portal</h1>
                        <p className="mt-2 text-sm text-slate-400">
                            {context.platformAdmin.full_name} · {formatRoleLabel(context.platformAdmin.role)}
                        </p>
                    </div>

                    <div className="mt-5 flex-1">
                        <PlatformNav />
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-4">
                        <Link href="/admin/dashboard" className="block rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
                            Open Tenant Workspace
                        </Link>
                        <form action={signOutPlatform}>
                            <button className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500">
                                Sign out
                            </button>
                        </form>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col">
                    <header className="border-b border-slate-200 bg-white">
                        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-5 py-4 sm:px-6 xl:px-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Operations Workspace</p>
                                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">GymOS platform command center</h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        SaaS billing, support, audits, and rollout controls for every gym on the network.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <PlatformBadge tone="accent">{context.user.email}</PlatformBadge>
                                </div>
                            </div>

                            {context.activeImpersonation ? (
                                <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-amber-900">
                                            Impersonation mode is active for {context.activeImpersonation.gym?.name ?? 'a gym'}.
                                        </p>
                                        <p className="text-sm text-amber-800">
                                            Tenant-side access is currently pinned to this gym until the session is stopped.
                                        </p>
                                    </div>
                                    <form action={stopImpersonation}>
                                        <PlatformButton tone="secondary">Stop impersonation</PlatformButton>
                                    </form>
                                </div>
                            ) : null}
                        </div>
                    </header>

                    <main className="mx-auto w-full max-w-[1600px] flex-1 px-5 py-6 sm:px-6 xl:px-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
