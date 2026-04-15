import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dumbbell, Users, CreditCard, TrendingUp, CheckCircle } from 'lucide-react'
import DarkVeil from '@/components/DarkVeil'

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* DarkVeil full-screen background */}
      <div className="fixed inset-0 -z-10">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.08}
          scanlineIntensity={0.08}
          speed={0.4}
          scanlineFrequency={80}
          warpAmount={0.1}
          resolutionScale={1}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Dumbbell className="h-7 w-7 text-blue-400 sm:h-8 sm:w-8" />
            <span className="text-lg font-bold text-white sm:text-xl">FitGymSoftware</span>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link href="/login" className="flex-1 sm:flex-none">
              <Button
                variant="ghost"
                className="w-full text-white/80 hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Login
              </Button>
            </Link>
            <Link href="/admin/register" className="flex-1 sm:flex-none">
              <Button className="w-full border-0 bg-blue-600 text-white hover:bg-blue-500 sm:w-auto">
                Start a Gym
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center sm:py-20 md:py-24">
        <h1 className="mb-5 bg-gradient-to-r from-blue-300 via-blue-100 to-white bg-clip-text text-4xl font-bold leading-[1.1] text-transparent drop-shadow-lg sm:mb-6 sm:text-5xl md:text-6xl">
          Manage Your Gym
          <br />
          with Ease
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-white/70 sm:mb-10 sm:text-lg md:text-xl">
          Complete solution for membership management, check-ins, payments, and analytics.
          Built for mid-size gyms to streamline operations.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link href="/admin/register" className="sm:flex-none">
            <Button
              size="lg"
              className="w-full border-0 bg-blue-600 px-6 text-base text-white shadow-lg shadow-blue-900/50 hover:bg-blue-500 sm:w-auto sm:px-8 sm:text-lg"
            >
              Create Gym Workspace
            </Button>
          </Link>
          <Link href="/login" className="sm:flex-none">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/30 bg-white/5 px-6 text-base text-white backdrop-blur-sm hover:bg-white/15 sm:w-auto sm:px-8 sm:text-lg"
            >
              Admin Login
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <h2 className="mb-10 text-center text-2xl font-bold text-white sm:mb-12 sm:text-3xl">
          Everything You Need
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Users className="h-10 w-10 text-blue-400" />}
            title="Member Management"
            description="Track members, memberships, and attendance all in one place"
          />
          <FeatureCard
            icon={<CheckCircle className="h-10 w-10 text-green-400" />}
            title="Smart Check-ins"
            description="QR code scanning, manual entry, and attendance tracking"
          />
          <FeatureCard
            icon={<CreditCard className="h-10 w-10 text-purple-400" />}
            title="Payment Processing"
            description="Record payments, generate invoices, track overdue amounts"
          />
          <FeatureCard
            icon={<TrendingUp className="h-10 w-10 text-orange-400" />}
            title="Financial Analytics"
            description="Revenue tracking, expense management, and detailed reports"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl rounded-2xl border border-blue-500/30 bg-blue-600/20 px-5 py-10 backdrop-blur-md sm:px-8 sm:py-16">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Ready to Get Started?</h2>
            <p className="mb-8 text-base text-blue-200/80 sm:text-xl">
              Sign in to manage members, payments, and daily operations
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="w-full bg-white px-6 text-base font-semibold text-blue-700 shadow-xl hover:bg-blue-50 sm:w-auto sm:px-8 sm:text-lg"
              >
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 py-8 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-white/40">
          <p>&copy; 2026 FitGym. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 sm:p-6">
      <div className="mb-4 opacity-90 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/55">{description}</p>
    </div>
  )
}
