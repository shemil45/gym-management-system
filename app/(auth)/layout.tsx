import { Dumbbell } from 'lucide-react'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#121212] text-white">
            <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
                <div className="relative hidden overflow-hidden border-r border-white/6 bg-[#0c0d16] lg:flex">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_78%_64%,rgba(109,40,217,0.14),transparent_24%)]" />
                    <div className="absolute -left-[22%] bottom-[-20%] h-[84%] w-[112%] rounded-[50%] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
                    <div className="absolute left-[30%] bottom-[-14%] h-[74%] w-[66%] rotate-[24deg] rounded-[3rem] border border-white/4 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0))]" />
                    <div className="absolute left-[48%] bottom-[-22%] h-[88%] w-[28%] rotate-[28deg] rounded-[2.5rem] border border-white/4 bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0))]" />

                    <div className="relative z-10 flex w-full flex-col justify-between p-14 xl:p-20">
                        <div className="flex items-center gap-4 text-white">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-blue-400/20 bg-blue-500/12 shadow-[0_12px_40px_rgba(23,156,232,0.2)]">
                                <Dumbbell className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-4xl font-semibold tracking-tight">GymFit Software</p>
                            </div>
                        </div>

                        <div className="max-w-xl">
                            <h1 className="text-5xl font-semibold tracking-tight text-white xl:text-6xl">
                                Everything your gym needs.
                            </h1>
                            <p className="mt-5 max-w-md text-lg leading-8 text-white/58">
                                From check-ins to payments — manage it all seamlessly.
                            </p>
                        </div>

                        <p className="text-sm text-white/35">© 2026 GymFit Software</p>
                    </div>
                </div>

                <div className="flex min-h-screen items-center justify-center bg-[#171717] px-6 py-10 sm:px-10">
                    <div className="w-full max-w-[460px]">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
