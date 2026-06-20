'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { applyTheme, getPreferredTheme, persistTheme, type AppTheme } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Icon helper — renders Material Symbols Outlined glyphs by name, matching
// the reference markup's <span class="material-symbols-outlined"> usage.
// ---------------------------------------------------------------------------

function Icon({
  name,
  className = '',
  filled = false,
}: {
  name: string
  className?: string
  filled?: boolean
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [theme, setTheme] = useState<AppTheme>(() => getPreferredTheme('light'))
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const isDark = theme === 'dark'
  const isYearly = billing === 'yearly'

  useEffect(() => {
    applyTheme(theme)
    persistTheme(theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const basicPrice = isYearly ? '\u20B91,990' : '\u20B9199'
  const growthPrice = isYearly ? '\u20B94,990' : '\u20B9499'
  const duration = isYearly ? '/year' : '/month'

  return (
    <div className={isDark ? 'dark' : ''}>
      <style>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-right { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-fade-in-right { animation: fade-in-right 0.8s ease-out forwards; }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <div className={isDark ? 'bg-[#0e0e11] text-slate-50' : 'bg-[#f7f9fb] text-[#191c1e]'}>
        {/* ============================= Header ============================= */}
        <header
          className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md ${
            isDark
              ? 'border-slate-500/10 bg-[#131316]/80'
              : 'border-slate-300/30 bg-[#f7f9fb]/80 shadow-sm'
          }`}
        >
          <nav className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-6">
              <span
                className={`text-2xl font-semibold ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                GMS Cloud
              </span>

              <div className="hidden items-center gap-6 md:flex">
                <a
                  href="#"
                  className={`border-b-2 pb-1 text-sm font-semibold tracking-wide ${
                    isDark
                      ? 'border-white text-white'
                      : 'border-[#9d4300] text-black'
                  }`}
                >
                  Solutions
                </a>

                <a
                  href="#"
                  className="text-sm font-semibold tracking-wide text-[#45464d] transition-colors dark:text-slate-300"
                >
                  Pricing
                </a>

                <a
                  href="#"
                  className="text-sm font-semibold tracking-wide text-[#45464d] transition-colors dark:text-slate-300"
                >
                  Guide
                </a>

                <a
                  href="#"
                  className="text-sm font-semibold tracking-wide text-[#45464d] transition-colors dark:text-slate-300"
                >
                  Support
                </a>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <AnimatedThemeToggler
                type="button"
                isDark={isDark}
                onClick={toggleTheme}
                className="rounded-lg p-2 text-[#45464d] transition-all dark:text-slate-300 [&_svg]:h-5 [&_svg]:w-5"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              />

              <Link
                href="/login"
                className="hidden rounded-lg px-4 py-2 text-sm font-semibold tracking-wide text-[#45464d] transition-all dark:text-slate-300 sm:block"
              >
                Log in
              </Link>

              <Link
                href="/admin/register"
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold tracking-wide shadow-md transition-all duration-150 active:scale-95 ${
                  isDark
                    ? 'bg-white text-black'
                    : 'bg-black text-white'
                }`}
              >
                Sign up
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* ============================= Hero ============================= */}
          <section className="relative overflow-hidden pt-16 pb-32 px-4">
            <div className="relative z-10 mx-auto max-w-7xl text-center">
              <div
                className={`animate-fade-in mt-8 mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${
                  isDark
                    ? 'bg-white/5 text-slate-50 border border-white/10'
                    : 'bg-[#9d4300]/10 text-[#9d4300]'
                }`}
              >
                <Icon name="verified" className='text-[18px]!'/>
                <span className="text-xs leading-[1.4] font-medium">
                  Automatic WhatsApp receipts &amp; reminders
                </span>
              </div>

              <h1
                className={`mx-auto mb-2 max-w-4xl text-3xl md:text-5xl leading-[1.1] tracking-[-0.02em] font-bold ${
                  isDark ? 'text-white' : ''
                }`}
              >
                Stop Managing Your Gym <br />
                <span
                  className={`animate-fade-in-right inline-block pb-1.5 bg-clip-text text-transparent ${
                    isDark
                      ? 'bg-linear-to-r from-[#0363FF] to-[#001F5C]'
                      : 'bg-linear-to-r from-[#B65A00] to-[#301301]'
                  }`}
                >
                  on Registers and Excel Sheets
                </span>
              </h1>

              <p className="mx-auto mb-10 max-w-2xl text-md leading-[1.6] font-normal text-[#45464d] dark:text-slate-300">
                GMS Cloud helps gym owners track members, record payments, send WhatsApp reminders,
                and manage daily operations from one dashboard.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/admin/register"
                  className={`flex items-center gap-2 rounded-lg px-8 py-4 text-sm font-semibold tracking-wide shadow-xl transition-all active:scale-95 ${
                    isDark
                      ? 'bg-white text-black'
                      : 'bg-[#9d4300] text-white'
                  }`}
                >
                  Get Started for Free
                  <Icon name="arrow_forward" />
                </Link>

                <Link
                  href="/admin/register"
                  className={`rounded-lg px-8 py-4 text-sm font-semibold tracking-wide transition-all ${
                    isDark
                      ? 'bg-[#0e0e11] text-slate-50 border border-slate-300/30'
                      : 'bg-white text-[#191c1e] border border-[#c6c6cd]'
                  }`}
                >
                  Book a Demo
                </Link>
              </div>

              <p
                className={`mt-6 text-xs leading-[1.4] font-medium text-[#45464d] dark:text-slate-300 ${
                  isDark ? 'opacity-60' : 'opacity-80'
                }`}
              >
                Built for gym owners who want less paperwork and more time to grow their business.
              </p>

              {/* <div
                className={`group relative mx-auto mt-20 max-w-[1024px] overflow-hidden rounded-xl shadow-2xl ${
                  isDark
                    ? 'border border-slate-300/30'
                    : 'border border-[#c6c6cd]'
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-[#f7f9fb] to-transparent ${
                    isDark ? 'opacity-30' : 'opacity-10'
                  }`}
                />
                <img
                  className={`h-auto w-full object-cover transition-transform duration-700 ${
                    isDark
                      ? 'group-hover:scale-[1.01] grayscale-[0.2]'
                      : 'group-hover:scale-[1.02]'
                  }`}
                  alt="GMS Cloud dashboard interface showing membership and revenue analytics"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDusjAfh-4GTK0sSCU_0ogtx-kMch41bvcJlnW7Op-36TJ1M8h5x2AEr64Zn3MQ1JON6TxRrA-i1P300KJTnE90T_49PiL5xHc3X35-MHJhgAN2UgDLocpZTfa_lkg7UudLaEe7kGWP5vNpjbv5ZkguAvMeXu0XJxjZvCSFhg3XQKcldapTxw9nbuIw2suWWhqs_W49dMMiijIcFvGm5-SesFg2wPBaXjPmPixL9P5jhO9aEpn621kVPHIgmMN_Xd-KXE6JK0IpRpUA"
                />
              </div> */}
            </div>

            {/* Background atmosphere blobs */}
            {isDark ? (
              <>
                <div className="absolute right-0 top-0 -z-10 opacity-10 blur-[120px]">
                  <div className="h-125 w-125 rounded-full bg-white/10" />
                </div>

                <div className="absolute bottom-0 left-0 -z-10 opacity-10 blur-[140px]">
                  <div className="h-100 w-100 rounded-full bg-white/5" />
                </div>
              </>
            ) : (
              <>
                <div className="absolute right-0 top-0 -z-10 opacity-40 blur-[100px]">
                  <div className="h-125 w-125 rounded-full bg-[#9d4300]/10" />
                </div>

                <div className="absolute bottom-0 left-0 -z-10 opacity-30 blur-[120px]">
                  <div className="h-100 w-100 rounded-full bg-black/10" />
                </div>
              </>
            )}
          </section>

          {/* ============================= Features ============================= */}
          <section className={isDark ? 'bg-[#1b1b1e] py-16 lg:py-20' : 'py-16 lg:py-20'}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-10 text-center md:mb-12">
                <h2
                  className={`mb-2 text-3xl font-bold md:text-5xl ${
                    isDark ? 'text-slate-50' : 'text-[#191c1e]'
                  }`}
                >
                  Everything You Need to
                  <br />
                  <span
                    className={`animate-fade-in-right inline-block bg-clip-text pb-1.5 text-transparent ${
                      isDark
                        ? 'bg-linear-to-r from-[#0363FF] to-[#001F5C]'
                        : 'bg-linear-to-r from-[#B65A00] to-[#301301]'
                    }`}
                  >
                    Manage Your Gym in One Platform
                  </span>
                </h2>

                <p
                  className={`mx-auto max-w-2xl text-sm leading-7 ${
                    isDark
                      ? 'text-slate-300 opacity-80'
                      : 'text-[#45464d]'
                  }`}
                >
                  Save time, reduce manual work, and grow your gym with confidence.
                </p>
              </div>

              <div className="mx-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: 'event_upcoming',
                    title: 'Never Miss a Renewal',
                    body:
                      'Members automatically receive WhatsApp reminders before their membership expires, helping you improve renewals without manual follow-ups.',
                  },
                  {
                    icon: 'account_balance_wallet',
                    title: 'Track Every Payment',
                    body:
                      'Know who paid, how much they paid, and when they paid with complete payment history for every member.',
                  },
                  {
                    icon: 'how_to_reg',
                    title: 'Attendance Without Registers',
                    body:
                      'Replace paper registers with digital attendance tracking and instant member check-ins.',
                  },
                  {
                    icon: 'dashboard',
                    title: 'Complete Visibility',
                    body:
                      'Monitor memberships, collections, renewals, and staff activity from anywhere through one dashboard.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className={`group rounded-xl border p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:p-6 ${
                      isDark
                        ? 'border-white/10 bg-slate-800/40'
                        : 'border-slate-200/80 bg-white/70'
                    }`}
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-neutral-700 dark:bg-neutral-700 dark:group-hover:bg-white">
                      <span
                        className="material-symbols-outlined transition-colors group-hover:text-white dark:group-hover:text-black"
                        style={{
                          fontVariationSettings:
                            "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
                        }}
                      >
                        {card.icon}
                      </span>
                    </div>

                    <h3
                      className={`mb-3 text-xl font-semibold md:text-2xl ${
                        isDark ? 'text-slate-50' : 'text-[#191c1e]'
                      }`}
                    >
                      {card.title}
                    </h3>

                    <p
                      className={`text-sm leading-7 md:text-base ${
                        isDark
                          ? 'text-slate-300 opacity-70'
                          : 'text-[#45464d]'
                      }`}
                    >
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================= Comparison ============================= */}
          <section
            className={`py-12 lg:py-16 border-y ${
              isDark
                ? 'bg-[#1b1b1e] border-slate-500/10'
                : 'bg-[#f7f9fb] border-slate-300/30'
            }`}
          >
            <div className="mx-auto max-w-6xl px-6 lg:px-10">
              <div className="mb-8 text-center">
                <h2
                  className={`text-2xl font-bold md:text-3xl lg:text-4xl ${
                    isDark ? 'text-slate-50' : 'text-[#191c1e]'
                  }`}
                >
                  Still Running Your Gym Like This?
                </h2>
              </div>

              <div className="mx-5 flex flex-col gap-5 md:flex-row">
                {/* Problem column */}
                <div className="flex-1 rounded-xl border border-red-400/30 bg-red-300/10 p-5 shadow-sm dark:border-red-400/50 md:p-6">
                  <ul className="space-y-4">
                    {[
                      'Paper Attendance Registers',
                      'Excel Payment Records',
                      'Manual Renewal Tracking',
                      'Calling Members Individually',
                      'No Revenue Visibility',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            isDark
                              ? 'bg-white/5 text-slate-400'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          <Icon name="close" className="text-base" />
                        </div>

                        <span className="text-sm leading-6 md:text-base">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Solution column */}
                <div className="flex-1 rounded-xl border border-green-500/30 bg-green-400/10 p-5 shadow-sm dark:border-green-500/50 md:p-6">
                  <ul className="space-y-4">
                    {[
                      'Digital Attendance Tracking',
                      'Automatic Payment Records',
                      'WhatsApp Renewal Reminders',
                      'Instant Receipts',
                      'Real-Time Revenue Dashboard',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            isDark
                              ? 'bg-white/10 text-white'
                              : 'bg-[#9d4300]/10 text-[#9d4300]'
                          }`}
                        >
                          <Icon name="check" className="text-base" />
                        </div>

                        <span
                          className={`text-sm font-medium leading-6 md:text-base ${
                            isDark ? 'text-slate-50' : 'text-[#191c1e]'
                          }`}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p
                className={`mt-8 text-center text-sm md:text-base ${
                  isDark
                    ? 'text-slate-300 opacity-70'
                    : 'text-[#45464d]'
                }`}
              >
                Everything your gym needs, managed from one simple platform.
              </p>
            </div>
          </section>

          {/* ============================= Staff Transparency ============================= */}
          <section
            className={`px-6 md:px-12 py-16 ${
              isDark ? 'bg-[#0e0e11]' : 'bg-[#eceef0]'
            }`}
          >
          
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 md:flex-row">
              <div className="flex-1">
                <div
                  className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${
                    isDark
                      ? 'border border-white/10 bg-white/5 text-slate-50'
                      : 'bg-[#3980f4]/10 text-[#3980f4]'
                  }`}
                >
                      <Icon name="verified_user" className="text-lg" />
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Staff Transparency
                      </span>
                </div>

                <h2
                  className={`mb-6 text-[1.63rem] font-bold leading-tight tracking-tight md:text-[1.78rem] lg:text-4xl ${
                    isDark ? 'text-slate-50' : 'text-[#191c1e]'
                  }`}
                >
                  Your staff can&apos;t hide a single payment from you
                </h2>

                <p
                  className={`mb-8 text-md leading-relaxed ${
                    isDark
                      ? 'text-slate-300 opacity-70'
                      : 'text-[#45464d]'
                  }`}
                >
                  Every payment, membership renewal, and check-in is recorded instantly.
                  Whether you&apos;re at the gym or away, you&apos;ll always know what&apos;s
                  happening in your business.
                </p>

                <ul className="space-y-4">
                  {[
                    {
                      title: 'Every staff action is logged',
                      body: 'Detailed timestamps for every check-in, renewal, and payment.',
                    },
                    {
                      title: 'Instant WhatsApp alert to you',
                      body: 'Get notified the second a member joins or pays.',
                    },
                    {
                      title: 'Staff portal, separate access',
                      body: 'Restrict sensitive data and financial reports to owners only.',
                    },
                  ].map((row) => (
                    <li key={row.title} className="flex items-start gap-4">
                      <div
                        className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full ${
                          isDark
                            ? 'bg-white/10 text-slate-50'
                            : 'bg-[#9d4300]/10 text-[#9d4300]'
                        }`}
                      >
                        <Icon name="done_all" className="text-base" />
                      </div>

                      <div>
                        <span
                          className={`block text-md font-semibold tracking-wide ${
                            isDark ? 'text-slate-50' : 'text-[#191c1e]'
                          }`}
                        >
                          {row.title}
                        </span>

                        <span
                          className={`text-xs leading-relaxed ${
                            isDark
                              ? 'text-slate-300 opacity-60'
                              : 'text-[#45464d]'
                          }`}
                        >
                          {row.body}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="order-1 flex-1 lg:order-2">
                <div className="relative mx-auto max-w-md">
                  <div
                    className={`absolute -inset-4 -z-10 rounded-3xl blur-3xl ${
                      isDark
                        ? 'bg-white/5'
                        : 'bg-[#9d4300]/5'
                    }`}
                  />

                  <img
                    className={`h-auto w-full rounded-3xl border shadow-2xl ${
                      isDark
                        ? 'border-slate-500/20 grayscale-[0.3]'
                        : 'border-[#c6c6cd]'
                    }`}
                    alt="Smartphone showing a GMS Cloud WhatsApp payment confirmation notification"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnH8fDLXXbEE7nguWkNqpjZy7_evkLoTPXN_gux05bKjlhs8Faml9wyLDhe4Km-2apO5u2p-gSHXNC4fBdD48SC7LFDv7OXHgi3eFQ9ngHb1s7hpZltPQzdZFZioYbNvLO5Kiq1oxUA3C1C39gE75ndokVVYflGPgITg1ZKhLfzAVKICJ0ZZtbL1arOOkxweqVKclqTkcv5qEOwbXl-XjVlx0q7EMhuinmrCH_at0erWqjLVFieHXR0CjHyqLFDPQWLcogLObrLWwg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ============================= Value Proposition ============================= */}
          <section
            className={`px-6 md:px-12 py-16 border-b ${
              isDark
                ? 'bg-[#1b1b1e] border-slate-500/10'
                : 'border-slate-300/30'
            }`}
          >
            <div className="mx-auto max-w-7xl text-center">
              <h2
                className={`mb-6 text-3xl font-bold leading-tight tracking-tight md:text-4xl ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                Built For The Way Indian Gyms Operate
              </h2>

              <p
                className={`mx-auto mb-12 max-w-3xl text-md leading-relaxed ${
                  isDark
                    ? 'text-slate-300 opacity-80'
                    : 'text-[#45464d]'
                }`}
              >
                Most gym software is expensive, complicated, and built for large fitness
                chains. GMS Cloud is designed specifically for independent gym owners who
                need something simple, affordable, and reliable.
              </p>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
                {[
                  {
                    icon: 'currency_rupee',
                    title: 'Affordable monthly pricing',
                  },
                  {
                    icon: 'forum',
                    title: 'WhatsApp-first communication',
                  },
                  {
                    icon: 'bolt',
                    title: 'Quick setup without technical knowledge',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col items-center p-2 text-center sm:p-6"
                  >
                    <div
                      className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                        isDark
                          ? 'border border-white/10 bg-white/5 text-white'
                          : 'bg-black/5 text-black'
                      }`}
                    >
                      <Icon name={item.icon} />
                    </div>

                    <h3
                      className={`mx-auto max-w-[180px] text-sm font-semibold leading-snug sm:text-base ${
                        isDark ? 'text-slate-50' : 'text-[#191c1e]'
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================= Pricing ============================= */}
          <section
            className={`px-6 md:px-12 py-16 ${
              isDark
                ? 'bg-[#0e0e11] border-b border-slate-500/10'
                : 'bg-[#f2f4f6]'
            }`}
          >
            <div className="mx-auto max-w-7xl text-center">
              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${
                  isDark
                    ? 'border border-white/10 bg-white/5 text-slate-50'
                    : 'bg-[#9d4300]/10 text-[#9d4300]'
                }`}
              >
                <Icon name="verified" className="text-[18px]!" />

                <span className="text-xs font-medium uppercase tracking-wider">
                  Built Specifically for Indian Gym Owners
                </span>
              </div>

              <h2
                className={`mb-6 text-3xl font-bold leading-tight tracking-tight md:text-4xl ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                Simple Pricing Built for Independent Gym Owners
              </h2>

              <p
                className={`mx-auto mb-10 max-w-3xl text-lg leading-relaxed ${
                  isDark
                    ? 'text-slate-300 opacity-70'
                    : 'text-[#45464d]'
                }`}
              >
                Everything you need to manage memberships, attendance, payments, and
                renewals without expensive software or hidden charges.
              </p>

              <div className="mb-16 overflow-hidden">
                <div className="flex w-max animate-marquee gap-8">
                  {[
                    'WhatsApp Receipts & Reminders',
                    'Attendance Tracking',
                    'Payment Records',
                    'Renewal Tracking',
                    'Revenue Dashboard',
                    'WhatsApp Receipts & Reminders',
                    'Attendance Tracking',
                    'Payment Records',
                    'Renewal Tracking',
                    'Revenue Dashboard',
                  ].map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <Icon
                        name="check_circle"
                        filled
                        className={`text-xl ${
                          isDark ? 'text-white' : 'text-[#9d4300]'
                        }`}
                      />

                      <span
                        className={`whitespace-nowrap text-sm font-semibold tracking-wide ${
                          isDark ? 'text-slate-50' : 'text-[#191c1e]'
                        }`}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle */}
              <div className="mb-8 flex flex-col items-center justify-center">
                <div
                  className={`relative mx-auto flex w-max items-center rounded-full border p-1 shadow-inner ${
                    isDark
                      ? 'border-slate-500/20 bg-slate-700'
                      : 'border-slate-300/20 bg-slate-200'
                  }`}
                >
                  <div
                    className="absolute rounded-full shadow-sm transition-transform duration-300 ease-in-out"
                    style={{
                      left: '4px',
                      width: isYearly ? 'calc(56% - 4px)' : 'calc(44% - 4px)',
                      height: 'calc(100% - 8px)',
                      background: isDark ? '#f8fafc' : '#ffffff',
                      transform: isYearly ? 'translateX(79%)' : 'translateX(0)',
                    }}
                  />

                  <button
                    onClick={() => setBilling('monthly')}
                    className={`relative z-10 w-32 rounded-full px-6 py-2.5 text-sm tracking-wide transition-colors ${
                      isYearly
                        ? 'font-semibold text-slate-500'
                        : isDark
                        ? 'font-bold text-black'
                        : 'font-bold text-[#191c1e]'
                    }`}
                  >
                    Monthly
                  </button>

                  <button
                    onClick={() => setBilling('yearly')}
                    className={`relative z-10 flex w-44 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm tracking-wide transition-colors ${
                      isYearly
                        ? isDark
                          ? 'font-bold text-black'
                          : 'font-bold text-[#191c1e]'
                        : 'font-semibold text-slate-500'
                    }`}
                  >
                    <span>Yearly</span>

                    <span className="whitespace-nowrap rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      Save 17%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan cards */}
              <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                {/* Basic */}
                <div
                  className={`flex flex-col rounded-2xl border p-4 md:p-5 ${
                    isDark
                      ? 'border-slate-500/30 bg-slate-800 shadow-sm'
                      : 'border-[#c6c6cd] bg-white'
                  }`}
                >
                  <div className="mb-4">
                    <h3
                      className={`mb-1 text-2xl font-semibold ${
                        isDark ? 'text-slate-50' : 'text-[#191c1e]'
                      }`}
                    >
                      Basic
                    </h3>

                    <div className="flex items-end gap-1">
                      <span
                        className={`text-4xl font-bold leading-none md:text-5xl ${
                          isDark ? 'text-slate-50' : 'text-[#191c1e]'
                        }`}
                      >
                        {basicPrice}
                      </span>

                      <span className="mb-1 text-sm text-[#45464d] dark:text-slate-300">
                        {duration}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-1.5">
                    {[
                      'Up to 100 members',
                      'Up to 10 membership plans',
                      'WhatsApp receipts & reminders',
                      'Attendance tracking',
                      'Payment records',
                      'Renewal tracking',
                      '2 staff accounts',
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 text-sm text-[#45464d] dark:text-slate-300"
                      >
                        <Icon
                          name="check"
                          className={`shrink-0 text-base ${
                            isDark ? 'text-slate-400' : 'text-[#9d4300]'
                          }`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/admin/register"
                    className={`mt-5 block w-full rounded-lg border py-3 text-center font-semibold transition-all ${
                      isDark
                        ? 'border-slate-500/50 text-slate-50'
                        : 'border-[#c6c6cd]'
                    }`}
                  >
                    Get Started
                  </Link>
                </div>

                {/* Growth */}
                <div
                  className={`relative flex flex-col rounded-2xl border-2 p-4 md:p-5 ${
                    isDark
                      ? 'border-white bg-slate-800'
                      : 'border-[#9d4300] bg-white'
                  }`}
                >
                  <div
                    className={`absolute right-5 top-0 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-medium ${
                      isDark
                        ? 'bg-white text-black'
                        : 'bg-[#9d4300] text-white'
                    }`}
                  >
                    Most Popular
                  </div>

                  <div className="mb-4">
                    <h3
                      className={`mb-1 text-2xl font-semibold ${
                        isDark ? 'text-slate-50' : 'text-[#191c1e]'
                      }`}
                    >
                      Growth
                    </h3>

                    <div className="flex items-end gap-1">
                      <span
                        className={`text-4xl font-bold leading-none md:text-5xl ${
                          isDark ? 'text-slate-50' : 'text-[#191c1e]'
                        }`}
                      >
                        {growthPrice}
                      </span>

                      <span className="mb-1 text-sm text-[#45464d] dark:text-slate-300">
                        {duration}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-1.5">
                    {[
                      'Unlimited members',
                      'Unlimited plans',
                      'WhatsApp receipts & reminders',
                      'Attendance tracking',
                      'Payment records',
                      'Renewal tracking',
                      'Unlimited staff accounts',
                      'Priority support',
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 text-sm text-[#45464d] dark:text-slate-300"
                      >
                        <Icon
                          name="check"
                          className={`shrink-0 text-base ${
                            isDark ? 'text-white' : 'text-[#9d4300]'
                          }`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/admin/register"
                    className={`mt-5 block w-full rounded-lg py-3 text-center font-semibold shadow-md transition-all ${
                      isDark
                        ? 'bg-white text-black'
                        : 'bg-[#9d4300] text-white'
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              </div>

              <p
                className={`mt-12 text-sm ${
                  isDark
                    ? 'text-slate-300 opacity-40'
                    : 'text-[#45464d] opacity-80'
                }`}
              >
                Setup takes less than 2 minutes • No technical knowledge required • Built
                for gym owners, not enterprises
              </p>
            </div>
          </section>

        {/* ============================= Ready to Get Started ============================= */}
        <section
          className={`px-4 py-16 ${
            isDark ? 'bg-[#1b1b1e]' : ''
          }`}
        >
          <div className="mx-auto max-w-7xl">
            <div
              className={`relative overflow-hidden rounded-xl p-12 text-center shadow-lg md:p-20 ${
                isDark
                  ? 'border border-slate-500/30 bg-slate-800'
                  : 'border border-[#c6c6cd] bg-white'
              }`}
            >
              <div className="relative z-10">
                <h2
                  className={`mb-6 text-3xl font-bold leading-tight tracking-tight md:text-4xl ${
                    isDark ? 'text-slate-50' : 'text-[#191c1e]'
                  }`}
                >
                  Stop Wasting Time on Registers
                </h2>

                <p
                  className={`mx-auto mb-10 max-w-2xl text-lg leading-relaxed ${
                    isDark
                      ? 'text-slate-300 opacity-80'
                      : 'text-[#45464d]'
                  }`}
                >
                  Create your workspace in under 2 minutes and start managing your gym
                  the smarter way.
                </p>

                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Link
                    href="/admin/register"
                    className={`rounded-lg px-10 py-4 text-sm font-semibold tracking-wide shadow-md transition-all ${
                      isDark
                        ? 'bg-white text-black'
                        : 'bg-[#9d4300] text-white'
                    }`}
                  >
                    Start Free Trial
                  </Link>

                  <Link
                    href="/admin/register"
                    className={`rounded-lg border px-10 py-4 text-sm font-semibold tracking-wide transition-all ${
                      isDark
                        ? 'border-slate-500/50 text-slate-50'
                        : 'border-[#c6c6cd] text-[#191c1e]'
                    }`}
                  >
                    Book a Demo
                  </Link>
                </div>

                <p
                  className={`mt-8 text-xs ${
                    isDark
                      ? 'text-slate-300 opacity-60'
                      : 'text-[#45464d] opacity-80'
                  }`}
                >
                  No credit card required • 30-day free trial • Setup in minutes
                </p>
              </div>
            </div>
          </div>
        </section>
        </main>

        {/* ============================= Footer ============================= */}
        <footer
          className={`mt-16 border-t ${
            isDark
              ? 'border-slate-500/10 bg-[#0e0e11]'
              : 'border-slate-300/50 bg-white'
          }`}
        >
          <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-6 px-4 pt-12 pb-5 md:grid-cols-4">
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <span
                className={`mb-4 block text-2xl font-semibold ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                GMS Cloud
              </span>

              <p
                className={`mb-6 text-xs font-medium ${
                  isDark
                    ? 'text-slate-300 opacity-60'
                    : 'text-[#45464d]'
                }`}
              >
                GMS Cloud helps gym owners replace registers and spreadsheets with a
                modern platform for memberships, attendance, payments, and renewals.
              </p>

              <div className="flex gap-4">
                {['public', 'mail'].map((icon) => (
                  <a
                    key={icon}
                    href="#"
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-[#9d4300] hover:text-white ${
                      isDark
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-200 text-[#191c1e]'
                    }`}
                  >
                    <Icon name={icon} className="text-lg" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4
                className={`mb-6 text-sm font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                Product
              </h4>

              <ul className="space-y-3">
                {['Features', 'Pricing'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className={`text-xs font-medium transition-all hover:underline ${
                        isDark
                          ? 'text-slate-300 opacity-70'
                          : 'text-[#45464d]'
                      }`}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4
                className={`mb-6 text-sm font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                Support
              </h4>

              <ul className="space-y-3">
                {['FAQ', 'Contact'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className={`text-xs font-medium transition-all hover:underline ${
                        isDark
                          ? 'text-slate-300 opacity-70'
                          : 'text-[#45464d]'
                      }`}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4
                className={`mb-6 text-sm font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-50' : 'text-[#191c1e]'
                }`}
              >
                Legal
              </h4>

              <ul className="space-y-3">
                {['Privacy Policy', 'Terms of Service'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className={`text-xs font-medium transition-all hover:underline ${
                        isDark
                          ? 'text-slate-300 opacity-70'
                          : 'text-[#45464d]'
                      }`}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={`col-span-1 flex flex-col items-center justify-between gap-4 border-t pt-8 md:col-span-4 md:flex-row ${
                isDark
                  ? 'border-slate-500/10'
                  : 'border-slate-300/30'
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isDark
                    ? 'text-slate-300 opacity-50'
                    : 'text-[#45464d]'
                }`}
              >
                © 2024 GMS Cloud. All rights reserved. Built for high-performance
                fitness operations.
              </p>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${
                    isDark
                      ? 'text-slate-300 opacity-50'
                      : 'text-[#45464d]'
                  }`}
                >
                  Made with
                </span>

                <Icon
                  name="favorite"
                  filled
                  className={`text-base ${
                    isDark ? 'text-slate-400' : 'text-red-600'
                  }`}
                />

                <span
                  className={`text-xs font-medium ${
                    isDark
                      ? 'text-slate-300 opacity-50'
                      : 'text-[#45464d]'
                  }`}
                >
                  for Indian gym owners
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
