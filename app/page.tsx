import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dumbbell, Users, CreditCard, TrendingUp, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">Gym Management</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Manage Your Gym with Ease
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Complete solution for membership management, check-ins, payments, and analytics.
          Built for mid-size gyms to streamline operations.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Admin Login
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Users className="h-10 w-10 text-blue-600" />}
            title="Member Management"
            description="Track members, memberships, and attendance all in one place"
          />
          <FeatureCard
            icon={<CheckCircle className="h-10 w-10 text-green-600" />}
            title="Smart Check-ins"
            description="QR code scanning, manual entry, and attendance tracking"
          />
          <FeatureCard
            icon={<CreditCard className="h-10 w-10 text-purple-600" />}
            title="Payment Processing"
            description="Record payments, generate invoices, track overdue amounts"
          />
          <FeatureCard
            icon={<TrendingUp className="h-10 w-10 text-orange-600" />}
            title="Financial Analytics"
            description="Revenue tracking, expense management, and detailed reports"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of gyms already using our platform
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-gray-50">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 Gym Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
