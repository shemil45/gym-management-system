'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link';

/**
 * GMS Cloud — Gym Management Software landing page.
 *
 * This implementation is a direct port of the provided reference files:
 *   - stitch-light.html  (light theme, source of truth)
 *   - stitch-dark.html   (dark theme, source of truth)
 *
 * Both references share the same Tailwind config (custom Material-You-style
 * color tokens, custom spacing tokens, custom type tokens). Since this
 * project's own tailwind.config may not define those tokens, every value is
 * inlined here as CSS variables + Tailwind arbitrary-value syntax so the
 * output is pixel-identical regardless of the consuming app's config.
 *
 * Theme switching (light <-> dark) only swaps the CSS variable values via
 * the `.dark` class on the root wrapper — exactly mirroring how the two
 * reference files only differ in their `tailwind.config` color block and a
 * handful of class overrides (never in layout, spacing, or content).
 */

// ---------------------------------------------------------------------------
// Color tokens, lifted 1:1 from each reference file's tailwind.config script.
// ---------------------------------------------------------------------------

const lightVars: Record<string, string> = {
  '--inverse-surface': '#2d3133',
  '--on-tertiary-fixed': '#001a42',
  '--primary-fixed-dim': '#bec6e0',
  '--primary': '#000000',
  '--on-secondary': '#ffffff',
  '--on-primary': '#ffffff',
  '--background': '#f7f9fb',
  '--primary-container': '#131b2e',
  '--secondary': '#9d4300',
  '--on-error': '#ffffff',
  '--on-secondary-container': '#5c2400',
  '--on-tertiary': '#ffffff',
  '--outline': '#76777d',
  '--surface-variant': '#e0e3e5',
  '--surface-bright': '#f7f9fb',
  '--on-tertiary-container': '#3980f4',
  '--surface-container-highest': '#e0e3e5',
  '--primary-fixed': '#dae2fd',
  '--tertiary': '#000000',
  '--on-surface': '#191c1e',
  '--secondary-fixed-dim': '#ffb690',
  '--secondary-fixed': '#ffdbca',
  '--error-container': '#ffdad6',
  '--surface-container-lowest': '#ffffff',
  '--surface-container': '#eceef0',
  '--surface-container-low': '#f2f4f6',
  '--error': '#ba1a1a',
  '--on-primary-fixed-variant': '#3f465c',
  '--tertiary-fixed-dim': '#adc6ff',
  '--secondary-container': '#fd761a',
  '--on-error-container': '#93000a',
  '--surface-tint': '#565e74',
  '--surface': '#f7f9fb',
  '--surface-container-high': '#e6e8ea',
  '--inverse-primary': '#bec6e0',
  '--on-surface-variant': '#45464d',
  '--on-secondary-fixed-variant': '#783200',
  '--on-tertiary-fixed-variant': '#004395',
  '--outline-variant': '#c6c6cd',
  '--inverse-on-surface': '#eff1f3',
  '--on-primary-fixed': '#131b2e',
  '--tertiary-fixed': '#d8e2ff',
  '--tertiary-container': '#001a42',
  '--on-secondary-fixed': '#341100',
  '--surface-dim': '#d8dadc',
  '--on-primary-container': '#7c839b',
  '--on-background': '#191c1e',
  '--glass-card-bg': 'rgba(255, 255, 255, 0.7)',
  '--glass-card-border': 'rgba(226, 232, 240, 0.8)',
}

const darkVars: Record<string, string> = {
  '--on-secondary-fixed': '#341100',
  '--tertiary-fixed-dim': '#adc6ff',
  '--on-secondary-container': '#5c2400',
  '--error-container': '#ffdad6',
  '--surface-dim': '#131316',
  '--on-tertiary-container': '#3980f4',
  '--secondary-container': '#000000',
  '--tertiary': '#000000',
  '--secondary': '#ffffff',
  '--on-primary-fixed-variant': '#3f465c',
  '--on-tertiary-fixed': '#001a42',
  '--secondary-fixed': '#ffdbca',
  '--surface-bright': '#39393c',
  '--outline-variant': '#c6c6cd',
  '--surface-variant': '#e0e3e5',
  '--surface-container': '#1e293b',
  '--inverse-surface': '#2d3133',
  '--error': '#ba1a1a',
  '--on-surface-variant': '#cbd5e1',
  '--primary-fixed-dim': '#bec6e0',
  '--inverse-primary': '#bec6e0',
  '--on-primary': '#000000',
  '--on-secondary-fixed-variant': '#783200',
  '--surface-container-lowest': '#0e0e11',
  '--on-primary-fixed': '#131b2e',
  '--on-surface': '#f8fafc',
  '--surface-tint': '#ffffff',
  '--on-background': '#f8fafc',
  '--primary': '#ffffff',
  '--surface-container-high': '#334155',
  '--on-error': '#ffffff',
  '--surface': '#131316',
  '--background': '#0e0e11',
  '--surface-container-low': '#1b1b1e',
  // Tokens that are unchanged from light theme in stitch-dark.html's config
  '--on-tertiary-fixed-variant': '#004395',
  '--on-tertiary': '#ffffff',
  '--outline': '#76777d',
  '--surface-container-highest': '#e0e3e5',
  '--primary-fixed': '#dae2fd',
  '--primary-container': '#131b2e',
  '--on-error-container': '#93000a',
  '--inverse-on-surface': '#eff1f3',
  '--tertiary-fixed': '#d8e2ff',
  '--tertiary-container': '#001a42',
  '--on-primary-container': '#7c839b',
  '--on-secondary': '#ffffff',
  '--glass-card-bg': 'rgba(30, 41, 59, 0.4)',
  '--glass-card-border': 'rgba(255, 255, 255, 0.1)',
}

// Spacing tokens (identical across both reference files).
const spacingVars: Record<string, string> = {
  '--sp-sm': '16px',
  '--sp-margin-desktop': '32px',
  '--sp-xl': '64px',
  '--sp-gutter': '24px',
  '--sp-lg': '40px',
  '--sp-xs': '8px',
  '--sp-base': '4px',
  '--sp-margin-mobile': '16px',
  '--sp-md': '24px',
}

function cssVars(theme: 'light' | 'dark') {
  return { ...(theme === 'light' ? lightVars : darkVars), ...spacingVars } as React.CSSProperties
}

// ---------------------------------------------------------------------------
// Icon helper — renders Material Symbols Outlined glyphs by name, matching
// the reference markup's <span class="material-symbols-outlined"> usage.
// ---------------------------------------------------------------------------

function Icon({
  name,
  className = '',
  filled = false,
  style,
}: {
  name: string
  className?: string
  filled?: boolean
  style?: React.CSSProperties
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...style,
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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const isDark = theme === 'dark'
  const isYearly = billing === 'yearly'

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('gms-theme')

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('gms-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const basicPrice = isYearly ? '\u20B91,990' : '\u20B9199'
  const growthPrice = isYearly ? '\u20B94,990' : '\u20B9499'
  const duration = isYearly ? '/year' : '/month'

  return (
    <div
      className={isDark ? 'dark' : ''}
      style={cssVars(theme)}
    >
      <style>{`
        .gms-root {
          background: var(--background);
          color: var(--on-surface);
          font-family: Inter, sans-serif;
          overflow-x: hidden;
        }
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
        .glass-card {
          background: var(--glass-card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-card-border);
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

      <div className="gms-root">
        {/* ============================= Header ============================= */}
        <header
          className="fixed inset-x-0 top-0 z-50 backdrop-blur-md"
          style={{
            background: isDark ? 'color-mix(in srgb, var(--surface) 80%, transparent)' : 'color-mix(in srgb, var(--surface) 80%, transparent)',
            borderBottom: isDark
              ? '1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent)'
              : '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
            boxShadow: isDark ? 'none' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <nav
            className="mx-auto flex w-full items-center justify-between"
            style={{
              maxWidth: '1536px',
              padding: '10px var(--sp-margin-mobile)',
            }}
          >
            <div className="flex items-center" style={{ gap: 'var(--sp-md)' }}>
              <span
                className="font-bold"
                style={{ fontSize: '24px', lineHeight: 1.3, fontWeight: 600, color: 'var(--on-surface)' }}
              >
                GMS Cloud
              </span>
              <div className="hidden items-center md:flex" style={{ gap: '24px' }}>
                <a
                  href="#"
                  className="font-bold"
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.4,
                    letterSpacing: '0.01em',
                    fontWeight: 600,
                    color: isDark ? 'var(--primary)' : 'var(--primary)',
                    borderBottom: `2px solid ${isDark ? 'var(--primary)' : 'var(--secondary)'}`,
                  }}
                >
                  Solutions
                </a>
                <a
                  href="#"
                  className="transition-colors"
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.4,
                    letterSpacing: '0.01em',
                    fontWeight: 600,
                    color: isDark ? 'var(--on-surface-variant)' : 'var(--on-surface-variant)',
                  }}
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="transition-colors"
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.4,
                    letterSpacing: '0.01em',
                    fontWeight: 600,
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  Guide
                </a>
                <a
                  href="#"
                  className="transition-colors"
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.4,
                    letterSpacing: '0.01em',
                    fontWeight: 600,
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  Support
                </a>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--sp-md)' }}>
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 transition-all"
                style={{ color: isDark ? 'var(--on-surface-variant)' : 'inherit' }}
                aria-label="Toggle theme"
              >
                <Icon name={isDark ? 'light_mode' : 'dark_mode'} />
              </button>
              <Link
                href="/login"
                className="hidden rounded-lg px-4 py-2 transition-all sm:block"
                style={{
                  fontSize: '14px',
                  lineHeight: 1.4,
                  letterSpacing: '0.01em',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                }}
              >
                Log in
              </Link>
              <Link
                href="/admin/register"
                className="rounded-lg shadow-md transition-all duration-150 active:scale-95"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                  padding: '10px 24px',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  letterSpacing: '0.01em',
                  fontWeight: 600,
                }}
              >
                Sign up
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* ============================= Hero ============================= */}
          <section
            className="relative overflow-hidden"
            style={{
              paddingTop: '68px',
              paddingBottom: '128px',
              paddingLeft: 'var(--sp-margin-mobile)',
              paddingRight: 'var(--sp-margin-mobile)',
            }}
          >
            <div className="relative z-10 mx-auto text-center" style={{ maxWidth: '1280px' }}>
              <div
                className="animate-fade-in mt-8 mb-8 inline-flex items-center gap-2 rounded-full"
                style={{
                  padding: '6px 16px',
                  background: isDark
                    ? 'color-mix(in srgb, var(--on-surface) 5%, transparent)'
                    : 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                  color: isDark ? 'var(--on-surface)' : 'var(--secondary)',
                  border: isDark ? '1px solid color-mix(in srgb, var(--on-surface) 10%, transparent)' : 'none',
                }}
              >
                <Icon name="verified" style={{ fontSize: '18px' }} />
                <span style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500 }}>
                  Automatic WhatsApp receipts &amp; reminders
                </span>
              </div>

              <h1
                className="mx-auto mb-6 leading-tight"
                style={{
                  maxWidth: '896px',
                  fontSize: '48px',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  fontWeight: 700,
                  color: isDark ? '#ffffff' : 'inherit',
                }}
              >
                Stop Managing Your Gym <br />
                <span
                  className="animate-fade-in-right inline-block bg-clip-text text-transparent pb-0.5"
                  style={{
                    backgroundImage: isDark
                      ? 'linear-gradient(to right, #0363FF, #001F5C)'
                      : 'linear-gradient(to right, #B65A00, #301301)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  on Registers and Excel Sheets
                </span>
              </h1>

              <p
                className="mx-auto mb-10"
                style={{
                  maxWidth: '672px',
                  fontSize: '18px',
                  lineHeight: 1.6,
                  fontWeight: 400,
                  color: 'var(--on-surface-variant)',
                }}
              >
                GMS Cloud helps gym owners track members, record payments, send WhatsApp reminders,
                and manage daily operations from one dashboard.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/admin/register"
                  className="flex items-center gap-2 rounded-lg px-8 py-4 text-sm font-semibold tracking-wide shadow-xl transition-all active:scale-95"
                  style={{
                    background: isDark ? 'var(--primary)' : 'var(--secondary)',
                    color: isDark ? 'var(--on-primary)' : '#ffffff',
                  }}
                >
                  Get Started for Free
                  <Icon name="arrow_forward" />
                </Link>

                <Link
                  href="/admin/register"
                  className="rounded-lg px-8 py-4 text-sm font-semibold tracking-wide transition-all"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--on-surface)',
                    border: `1px solid ${
                      isDark
                        ? 'color-mix(in srgb, var(--outline-variant) 30%, transparent)'
                        : 'var(--outline-variant)'
                    }`,
                  }}
                >
                  Book a Demo
                </Link>
              </div>

              <p
                className="mt-6"
                style={{
                  fontSize: '12px',
                  lineHeight: 1.4,
                  fontWeight: 500,
                  color: 'var(--on-surface-variant)',
                  opacity: isDark ? 0.6 : 0.8,
                }}
              >
                Built for gym owners who want less paperwork and more time to grow their business.
              </p>

              {/* <div
                className="group relative mx-auto mt-20 overflow-hidden rounded-xl shadow-2xl"
                style={{
                  maxWidth: '1024px',
                  border: `1px solid ${
                    isDark ? 'color-mix(in srgb, var(--outline-variant) 30%, transparent)' : 'var(--outline-variant)'
                  }`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, var(--surface), transparent)',
                    opacity: isDark ? 0.3 : 0.1,
                  }}
                />
                <img
                  className={`h-auto w-full object-cover transition-transform duration-700 ${
                    isDark ? 'group-hover:scale-[1.01]' : 'group-hover:scale-[1.02]'
                  }`}
                  style={isDark ? { filter: 'grayscale(0.2)' } : undefined}
                  alt="GMS Cloud dashboard interface showing membership and revenue analytics"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDusjAfh-4GTK0sSCU_0ogtx-kMch41bvcJlnW7Op-36TJ1M8h5x2AEr64Zn3MQ1JON6TxRrA-i1P300KJTnE90T_49PiL5xHc3X35-MHJhgAN2UgDLocpZTfa_lkg7UudLaEe7kGWP5vNpjbv5ZkguAvMeXu0XJxjZvCSFhg3XQKcldapTxw9nbuIw2suWWhqs_W49dMMiijIcFvGm5-SesFg2wPBaXjPmPixL9P5jhO9aEpn621kVPHIgmMN_Xd-KXE6JK0IpRpUA"
                />
              </div> */}
            </div>

            {/* Background atmosphere blobs */}
            {isDark ? (
              <>
                <div className="absolute -z-10 right-0 top-0" style={{ opacity: 0.1, filter: 'blur(120px)' }}>
                  <div className="rounded-full bg-white/10" style={{ width: '500px', height: '500px' }} />
                </div>
                <div className="absolute -z-10 bottom-0 left-0" style={{ opacity: 0.1, filter: 'blur(140px)' }}>
                  <div className="rounded-full bg-white/5" style={{ width: '400px', height: '400px' }} />
                </div>
              </>
            ) : (
              <>
                <div className="absolute -z-10 right-0 top-0" style={{ opacity: 0.4, filter: 'blur(100px)' }}>
                  <div
                    className="rounded-full"
                    style={{ width: '500px', height: '500px', background: 'color-mix(in srgb, var(--secondary) 10%, transparent)' }}
                  />
                </div>
                <div className="absolute -z-10 bottom-0 left-0" style={{ opacity: 0.3, filter: 'blur(120px)' }}>
                  <div
                    className="rounded-full"
                    style={{ width: '400px', height: '400px', background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
                  />
                </div>
              </>
            )}
          </section>

          {/* ============================= Features ============================= */}
          <section
            style={{
              padding: 'var(--sp-xl) var(--sp-margin-mobile)',
              background: isDark ? 'var(--surface-container-low)' : 'transparent',
            }}
          >
            <div className="mx-auto" style={{ maxWidth: '1280px' }}>
              <div className="mb-16 text-center">
                <h2
                  className="mb-4"
                  style={{
                    fontSize: '32px',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    fontWeight: 700,
                    color: 'var(--on-surface)',
                  }}
                >
                  Everything You Need to Manage Your Gym in One Platform
                </h2>
                <p
                  className="mx-auto"
                  style={{
                    maxWidth: '576px',
                    color: 'var(--on-surface-variant)',
                    opacity: isDark ? 0.8 : 1,
                  }}
                >
                  Manage memberships, track attendance, record payments, automate WhatsApp reminders,
                  and monitor your gym&apos;s performance from a single dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: 'event_upcoming', title: 'Never Miss a Renewal', body: 'Members automatically receive WhatsApp reminders before their membership expires, helping you improve renewals without manual follow-ups.' },
                  { icon: 'account_balance_wallet', title: 'Track Every Payment', body: 'Know who paid, how much they paid, and when they paid with complete payment history for every member.' },
                  { icon: 'how_to_reg', title: 'Attendance Without Registers', body: 'Replace paper registers with digital attendance tracking and instant member check-ins.' },
                  { icon: 'dashboard', title: 'Complete Visibility', body: 'Monitor memberships, collections, renewals, and staff activity from anywhere through one dashboard.' },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="glass-card group rounded-xl p-8 shadow-sm transition-all duration-700 hover:shadow-lg"
                  >
                    <div
                      className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg transition-colors group-hover:bg-[var(--primary)]"
                      style={{
                        background: isDark
                          ? 'color-mix(in srgb, var(--on-surface) 10%, transparent)'
                          : 'color-mix(in srgb, var(--primary) 5%, transparent)',
                        color: 'var(--primary)',
                      }}
                    >
                      <span
                        className="material-symbols-outlined transition-colors group-hover:!text-[var(--on-primary)]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                      >
                        {card.icon}
                      </span>
                    </div>
                    <h3
                      className="mb-3"
                      style={{ fontSize: '24px', lineHeight: 1.3, fontWeight: 600, color: 'var(--on-surface)' }}
                    >
                      {card.title}
                    </h3>
                    <p style={{ color: 'var(--on-surface-variant)', opacity: isDark ? 0.7 : 1 }}>{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================= Comparison ============================= */}
          <section
            style={{
              padding: 'var(--sp-xl) var(--sp-margin-mobile)',
              background: isDark ? 'var(--surface-container-low)' : 'var(--surface)',
              borderTop: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '10%' : '30%'}, transparent)`,
              borderBottom: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '10%' : '30%'}, transparent)`,
            }}
          >
            <div className="mx-auto" style={{ maxWidth: '1280px' }}>
              <div className="mb-12 text-center">
                <h2 style={{ fontSize: '32px', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 700, color: 'var(--on-surface)' }}>
                  Still Running Your Gym Like This?
                </h2>
              </div>

              <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                {/* Problem column */}
                <div
                  className="flex-1 rounded-2xl p-8"
                  style={{
                    background: isDark ? 'var(--surface-container-low)' : 'color-mix(in srgb, var(--error-container) 20%, transparent)',
                    border: `1px solid ${
                      isDark ? 'color-mix(in srgb, var(--outline-variant) 10%, transparent)' : 'color-mix(in srgb, var(--error) 20%, transparent)'
                    }`,
                  }}
                >
                  <ul className="space-y-6">
                    {['Attendance Registers', 'Excel Payment Records', 'Manual Renewal Tracking', 'Calling Members One by One', 'No Visibility Into Collections'].map(
                      (item) => (
                        <li key={item} className="flex items-center gap-4">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.05)' : 'color-mix(in srgb, var(--error) 10%, transparent)',
                              color: isDark ? 'var(--on-surface-variant)' : 'var(--error)',
                            }}
                          >
                            <Icon name="close" style={{ fontSize: '20px' }} />
                          </div>
                          <span
                            style={{
                              fontSize: '18px',
                              lineHeight: 1.6,
                              color: isDark ? 'color-mix(in srgb, var(--on-surface) 60%, transparent)' : 'var(--on-surface)',
                            }}
                          >
                            {item}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* Solution column */}
                <div
                  className="flex-1 rounded-2xl p-8 shadow-sm"
                  style={{
                    background: 'var(--surface-container)',
                    border: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '30%' : '50%'}, transparent)`,
                  }}
                >
                  <ul className="space-y-6">
                    {['Digital Attendance Tracking', 'Automatic Payment Records', 'WhatsApp Renewal Reminders', 'Instant Receipts', 'Real-Time Business Dashboard'].map(
                      (item) => (
                        <li key={item} className="flex items-center gap-4">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: isDark
                                ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                                : 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                              color: isDark ? 'var(--primary)' : 'var(--secondary)',
                            }}
                          >
                            <Icon name="check" style={{ fontSize: '20px' }} />
                          </div>
                          <span className="font-medium" style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--on-surface)' }}>
                            {item}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              <p
                className="mt-12 text-center"
                style={{
                  fontSize: '18px',
                  lineHeight: 1.6,
                  color: 'var(--on-surface-variant)',
                  opacity: isDark ? 0.6 : 1,
                }}
              >
                Everything your gym needs, managed from one simple platform.
              </p>
            </div>
          </section>

          {/* ============================= Staff Transparency ============================= */}
          <section
            style={{
              padding: 'var(--sp-xl) var(--sp-margin-mobile)',
              background: isDark ? 'var(--background)' : 'var(--surface-container)',
            }}
          >
            <div className="mx-auto flex flex-col items-center gap-16 lg:flex-row" style={{ maxWidth: '1280px' }}>
              <div className="order-2 flex-1 lg:order-1">
                <div
                  className="mb-6 inline-flex items-center gap-2 rounded-full"
                  style={{
                    padding: '6px 16px',
                    background: isDark
                      ? 'color-mix(in srgb, var(--on-surface) 5%, transparent)'
                      : 'color-mix(in srgb, var(--on-tertiary-container) 10%, transparent)',
                    color: isDark ? 'var(--on-surface)' : 'var(--on-tertiary-container)',
                    border: isDark ? '1px solid color-mix(in srgb, var(--on-surface) 10%, transparent)' : 'none',
                  }}
                >
                  <Icon name="verified_user" style={{ fontSize: '18px' }} />
                  <span className="uppercase tracking-wider" style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500 }}>
                    Staff Transparency
                  </span>
                </div>
                <h2
                  className="mb-6"
                  style={{ fontSize: '32px', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 700, color: 'var(--on-surface)' }}
                >
                  Your staff can&apos;t hide a single payment from you
                </h2>
                <p
                  className="mb-8"
                  style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--on-surface-variant)', opacity: isDark ? 0.7 : 1 }}
                >
                  Every payment, membership renewal, and check-in is recorded instantly. Whether you&apos;re
                  at the gym or away, you&apos;ll always know what&apos;s happening in your business.
                </p>
                <ul className="space-y-4">
                  {[
                    { title: 'Every staff action is logged', body: 'Detailed timestamps for every check-in, renewal, and payment.' },
                    { title: 'Instant WhatsApp alert to you', body: 'Get notified the second a member joins or pays.' },
                    { title: 'Staff portal, separate access', body: 'Restrict sensitive data and financial reports to owners only.' },
                  ].map((row) => (
                    <li key={row.title} className="flex items-start gap-4">
                      <div
                        className="mt-1 flex h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          background: isDark
                            ? 'color-mix(in srgb, var(--on-surface) 10%, transparent)'
                            : 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                          color: isDark ? 'var(--on-surface)' : 'var(--secondary)',
                        }}
                      >
                        <Icon name="done_all" style={{ fontSize: '16px' }} />
                      </div>
                      <div>
                        <span
                          className="block"
                          style={{ fontSize: '14px', lineHeight: 1.4, letterSpacing: '0.01em', fontWeight: 600, color: 'var(--on-surface)' }}
                        >
                          {row.title}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            lineHeight: 1.4,
                            color: 'var(--on-surface-variant)',
                            opacity: isDark ? 0.6 : 1,
                          }}
                        >
                          {row.body}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 flex-1 lg:order-2">
                <div className="relative">
                  <div
                    className="absolute -inset-4 -z-10 rounded-3xl blur-3xl"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'color-mix(in srgb, var(--secondary) 5%, transparent)' }}
                  />
                  <img
                    className="h-auto w-full rounded-3xl shadow-2xl"
                    style={{
                      border: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '20%' : '100%'}, transparent)`,
                      filter: isDark ? 'grayscale(0.3)' : undefined,
                    }}
                    alt="Smartphone showing a GMS Cloud WhatsApp payment confirmation notification"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnH8fDLXXbEE7nguWkNqpjZy7_evkLoTPXN_gux05bKjlhs8Faml9wyLDhe4Km-2apO5u2p-gSHXNC4fBdD48SC7LFDv7OXHgi3eFQ9ngHb1s7hpZltPQzdZFZioYbNvLO5Kiq1oxUA3C1C39gE75ndokVVYflGPgITg1ZKhLfzAVKICJ0ZZtbL1arOOkxweqVKclqTkcv5qEOwbXl-XjVlx0q7EMhuinmrCH_at0erWqjLVFieHXR0CjHyqLFDPQWLcogLObrLWwg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ============================= Value Proposition ============================= */}
          <section
            style={{
              padding: 'var(--sp-xl) var(--sp-margin-mobile)',
              background: isDark ? 'var(--surface-container-low)' : 'transparent',
              borderBottom: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '10%' : '30%'}, transparent)`,
            }}
          >
            <div className="mx-auto text-center" style={{ maxWidth: '1280px' }}>
              <h2
                className="mb-6"
                style={{ fontSize: '32px', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 700, color: 'var(--on-surface)' }}
              >
                Built For The Way Indian Gyms Operate
              </h2>
              <p
                className="mx-auto mb-12"
                style={{
                  maxWidth: '768px',
                  fontSize: '18px',
                  lineHeight: 1.6,
                  color: 'var(--on-surface-variant)',
                  opacity: isDark ? 0.8 : 1,
                }}
              >
                Most gym software is expensive, complicated, and built for large fitness chains. GMS
                Cloud is designed specifically for independent gym owners who need something simple,
                affordable, and reliable.
              </p>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {[
                  { icon: 'currency_rupee', title: 'Affordable monthly pricing' },
                  { icon: 'forum', title: 'WhatsApp-first communication' },
                  { icon: 'bolt', title: 'Quick setup without technical knowledge' },
                ].map((item) => (
                  <div key={item.title} className="p-6">
                    <div
                      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: isDark
                          ? 'color-mix(in srgb, var(--on-surface) 5%, transparent)'
                          : 'color-mix(in srgb, var(--primary) 5%, transparent)',
                        color: 'var(--primary)',
                        border: isDark ? '1px solid color-mix(in srgb, var(--on-surface) 10%, transparent)' : 'none',
                      }}
                    >
                      <Icon name={item.icon} />
                    </div>
                    <h3 style={{ fontSize: '24px', lineHeight: 1.3, fontWeight: 600, color: 'var(--on-surface)' }}>{item.title}</h3>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================= Pricing ============================= */}
          <section
            style={{
              padding: 'var(--sp-xl) var(--sp-margin-mobile)',
              background: isDark ? 'var(--background)' : 'var(--surface-container-low)',
              borderBottom: isDark ? '1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent)' : 'none',
            }}
          >
            <div className="mx-auto text-center" style={{ maxWidth: '1280px' }}>
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full"
                style={{
                  padding: '6px 16px',
                  background: isDark
                    ? 'color-mix(in srgb, var(--on-surface) 5%, transparent)'
                    : 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                  color: isDark ? 'var(--on-surface)' : 'var(--secondary)',
                  border: isDark ? '1px solid color-mix(in srgb, var(--on-surface) 10%, transparent)' : 'none',
                }}
              >
                <Icon name="verified" style={{ fontSize: '18px' }} />
                <span className="uppercase tracking-wider" style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500 }}>
                  Built Specifically for Indian Gym Owners
                </span>
              </div>
              <h2
                className="mb-6"
                style={{ fontSize: '32px', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 700, color: 'var(--on-surface)' }}
              >
                Simple Pricing Built for Independent Gym Owners
              </h2>
              <p
                className="mx-auto mb-10"
                style={{
                  maxWidth: '768px',
                  fontSize: '18px',
                  lineHeight: 1.6,
                  color: 'var(--on-surface-variant)',
                  opacity: isDark ? 0.7 : 1,
                }}
              >
                Everything you need to manage memberships, attendance, payments, and renewals without
                expensive software or hidden charges.
              </p>

              <div className="mb-16 flex flex-wrap justify-center gap-x-8 gap-y-4">
                {['WhatsApp Receipts & Reminders', 'Attendance Tracking', 'Payment Records', 'Renewal Tracking', 'Revenue Dashboard'].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Icon
                        name="check_circle"
                        filled
                        style={{ fontSize: '20px', color: isDark ? 'var(--primary)' : 'var(--secondary)' }}
                      />
                      <span style={{ fontSize: '14px', lineHeight: 1.4, letterSpacing: '0.01em', fontWeight: 600, color: 'var(--on-surface)' }}>
                        {item}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Toggle */}
              <div className="mb-12 flex flex-col items-center justify-center">
                <div
                  className="relative mx-auto flex w-max items-center rounded-full p-1 shadow-inner"
                  style={{
                    background: 'var(--surface-container-high)',
                    border: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
                  }}
                >
                  {/* Sliding Background */}
                  <div
                    className="absolute rounded-full shadow-sm transition-transform duration-300 ease-in-out"
                    style={{
                      left: '4px',
                      width: isYearly ? 'calc(56% - 4px)' : 'calc(44% - 4px)',
                      height: 'calc(100% - 8px)',
                      background: isDark ? 'var(--on-surface)' : 'var(--surface-container-lowest)',
                      transform: isYearly ? 'translateX(79%)' : 'translateX(0)',
                    }}
                  />

                  {/* Monthly */}
                  <button
                    onClick={() => setBilling('monthly')}
                    className="relative z-10 w-32 rounded-full px-6 py-2.5 transition-colors"
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      letterSpacing: '0.01em',
                      fontWeight: isYearly ? 600 : 700,
                      color: isYearly
                        ? 'var(--on-surface-variant)'
                        : isDark
                        ? 'var(--on-primary)'
                        : 'var(--on-surface)',
                    }}
                  >
                    Monthly
                  </button>

                  {/* Yearly */}
                  <button
                    onClick={() => setBilling('yearly')}
                    className="relative z-10 flex w-44 items-center justify-center gap-2 rounded-full px-6 py-2.5 transition-colors"
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.4,
                      letterSpacing: '0.01em',
                      fontWeight: isYearly ? 700 : 600,
                      color: isYearly
                        ? isDark
                          ? 'var(--on-primary)'
                          : 'var(--on-surface)'
                        : 'var(--on-surface-variant)',
                    }}
                  >
                    <span>Yearly</span>

                    <span
                      className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: 'rgba(16,185,129,0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.25)',
                      }}
                    >
                      Save 17%
                    </span>
                  </button>
                </div>

                <p
                  className="mt-4"
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.4,
                    fontWeight: 500,
                    color: 'var(--on-surface-variant)',
                    opacity: isDark ? 0.6 : 1,
                  }}
                >
                  Choose yearly billing and save 17% compared to monthly pricing.
                </p>
              </div>

              {/* Plan cards */}
              <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Basic */}
                <div
                  className="flex flex-col rounded-2xl p-5 md:p-6"
                  style={{
                    background: isDark
                      ? 'var(--surface-container)'
                      : 'var(--surface-container-lowest)',
                    border: `1px solid color-mix(in srgb, var(--outline-variant) ${
                      isDark ? '30%' : '100%'
                    }, transparent)`,
                    boxShadow: isDark ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none',
                  }}
                >
                  <div className="mb-4">
                    <h3
                      className="mb-1 text-2xl font-semibold"
                      style={{ color: 'var(--on-surface)' }}
                    >
                      Basic
                    </h3>

                    <div className="flex items-end gap-1">
                      <span
                        className="text-4xl font-bold leading-none md:text-5xl"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        {basicPrice}
                      </span>

                      <span
                        className="mb-1 text-sm"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        {duration}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3">
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
                        className="flex items-center gap-3 text-sm md:text-md"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        <Icon
                          name="check"
                          className="shrink-0"
                          style={{
                            fontSize: '16px',
                            color: isDark
                              ? 'color-mix(in srgb, var(--on-surface) 60%, transparent)'
                              : 'var(--secondary)',
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <button>
                    <Link
                      href="/admin/register"
                      className="mt-5 block w-full rounded-lg py-3 text-center font-semibold transition-all"
                      style={{
                        border: `1px solid color-mix(in srgb, var(--outline-variant) ${
                          isDark ? '50%' : '100%'
                        }, transparent)`,
                        color: isDark ? 'var(--on-surface)' : 'inherit',
                      }}
                    >
                      Get Started
                    </Link>
                  </button>
                </div>

                {/* Growth */}
                <div
                  className="relative flex flex-col rounded-2xl p-5 md:p-6"
                  style={{
                    background: isDark
                      ? 'var(--surface-container)'
                      : 'var(--surface-container-lowest)',
                    border: `2px solid ${
                      isDark ? 'var(--primary)' : 'var(--secondary)'
                    }`,
                  }}
                >
                  <div
                    className="absolute right-5 top-0 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: isDark ? 'var(--primary)' : 'var(--secondary)',
                      color: isDark ? 'var(--on-primary)' : '#fff',
                    }}
                  >
                    Most Popular
                  </div>

                  <div className="mb-4">
                    <h3
                      className="mb-1 text-2xl font-semibold"
                      style={{ color: 'var(--on-surface)' }}
                    >
                      Growth
                    </h3>

                    <div className="flex items-end gap-1">
                      <span
                        className="text-4xl font-bold leading-none md:text-5xl"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        {growthPrice}
                      </span>

                      <span
                        className="mb-1 text-sm"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        {duration}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3">
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
                        className="flex items-center gap-3 text-sm md:text-md"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        <Icon
                          name="check"
                          className="shrink-0"
                          style={{
                            fontSize: '16px',
                            color: isDark
                              ? 'var(--primary)'
                              : 'var(--secondary)',
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <button>
                    <Link
                      href="/admin/register"
                      className="mt-5 block w-full rounded-lg py-3 text-center font-semibold shadow-md transition-all"
                      style={{
                        background: isDark ? 'var(--primary)' : 'var(--secondary)',
                        color: isDark ? 'var(--on-primary)' : '#fff',
                      }}
                    >
                      Get Started
                    </Link>
                  </button>
                </div>
              </div>

              <p
                className="mt-12"
                style={{ fontSize: '14px', lineHeight: 1.4, color: 'var(--on-surface-variant)', opacity: isDark ? 0.4 : 0.8 }}
              >
                Setup takes less than 2 minutes • No technical knowledge required • Built for gym owners, not enterprises
              </p>
            </div>
          </section>

          {/* ============================= Ready to Get Started ============================= */}
          <section
            style={{
              padding: 'var(--sp-xl) var(--sp-margin-mobile)',
              background: isDark ? 'var(--surface-container-low)' : 'transparent',
            }}
          >
            <div className="mx-auto" style={{ maxWidth: '1280px' }}>
              <div
                className="relative overflow-hidden p-12 text-center shadow-lg md:p-20"
                style={{
                  borderRadius: '2rem',
                  background: isDark ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
                  border: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '30%' : '100%'}, transparent)`,
                }}
              >
                <div className="relative z-10">
                  <h2 className="mb-6" style={{ fontSize: '32px', lineHeight: 1.2, letterSpacing: '-0.01em', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Stop Wasting Time on Registers
                  </h2>
                  <p
                    className="mx-auto mb-10"
                    style={{ maxWidth: '672px', fontSize: '18px', lineHeight: 1.6, color: 'var(--on-surface-variant)', opacity: isDark ? 0.8 : 1 }}
                  >
                    Create your workspace in under 2 minutes and start managing your gym the smarter way.
                  </p>
                  <div className="flex flex-col justify-center gap-4 sm:flex-row">
                    <Link
                      href="/admin/register"
                      className="rounded-lg px-10 py-4 text-sm font-semibold tracking-wide shadow-md transition-all"
                      style={{
                        background: isDark ? 'var(--primary)' : 'var(--secondary)',
                        color: isDark ? 'var(--on-primary)' : '#ffffff',
                      }}
                    >
                      Start Free Trial
                    </Link>

                    <Link
                      href="/admin/register"
                      className="rounded-lg bg-transparent px-10 py-4 text-sm font-semibold tracking-wide transition-all"
                      style={{
                        color: 'var(--on-surface)',
                        border: `1px solid color-mix(in srgb, var(--outline-variant) ${
                          isDark ? '50%' : '100%'
                        }, transparent)`,
                      }}
                    >
                      Book a Demo
                    </Link>
                  </div>
                  <p
                    className="mt-8"
                    style={{ fontSize: '12px', lineHeight: 1.4, color: 'var(--on-surface-variant)', opacity: isDark ? 0.6 : 0.8 }}
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
          style={{
            background: isDark ? 'var(--background)' : 'var(--surface-container-lowest)',
            borderTop: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '10%' : '50%'}, transparent)`,
            marginTop: 'var(--sp-xl)',
          }}
        >
          <div
            className="mx-auto grid grid-cols-1 gap-[24px] md:grid-cols-4"
            style={{ maxWidth: '1536px', padding: 'var(--sp-xl) var(--sp-margin-mobile)' }}
          >
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <span className="mb-4 block font-bold" style={{ fontSize: '24px', lineHeight: 1.3, fontWeight: 600, color: 'var(--on-surface)' }}>
                GMS Cloud
              </span>
              <p className="mb-6" style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.6 : 1 }}>
                GMS Cloud helps gym owners replace registers and spreadsheets with a modern platform
                for memberships, attendance, payments, and renewals.
              </p>
              <div className="flex gap-4">
                {['public', 'mail'].map((icon) => (
                  <a
                    key={icon}
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:!bg-[var(--secondary)] hover:!text-white"
                    style={{
                      background: 'var(--surface-container-high)',
                      color: isDark ? 'var(--on-surface-variant)' : 'inherit',
                    }}
                  >
                    <Icon name={icon} style={{ fontSize: '18px' }} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-6 uppercase tracking-wider" style={{ fontSize: '14px', lineHeight: 1.4, letterSpacing: '0.01em', fontWeight: 600, color: 'var(--on-surface)' }}>
                Product
              </h4>
              <ul className="space-y-3">
                {['Features', 'Pricing'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="transition-all hover:underline"
                      style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.7 : 1 }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-6 uppercase tracking-wider" style={{ fontSize: '14px', lineHeight: 1.4, letterSpacing: '0.01em', fontWeight: 600, color: 'var(--on-surface)' }}>
                Support
              </h4>
              <ul className="space-y-3">
                {['FAQ', 'Contact'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="transition-all hover:underline"
                      style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.7 : 1 }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-6 uppercase tracking-wider" style={{ fontSize: '14px', lineHeight: 1.4, letterSpacing: '0.01em', fontWeight: 600, color: 'var(--on-surface)' }}>
                Legal
              </h4>
              <ul className="space-y-3">
                {['Privacy Policy', 'Terms of Service'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="transition-all hover:underline"
                      style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.7 : 1 }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="col-span-1 flex flex-col items-center justify-between gap-4 md:col-span-4 md:flex-row"
              style={{
                marginTop: '64px',
                paddingTop: '32px',
                borderTop: `1px solid color-mix(in srgb, var(--outline-variant) ${isDark ? '10%' : '30%'}, transparent)`,
              }}
            >
              <p style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.5 : 1 }}>
                © 2024 GMS Cloud. All rights reserved. Built for high-performance fitness operations.
              </p>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.5 : 1 }}>
                  Made with
                </span>
                <Icon
                  name="favorite"
                  filled
                  style={{ fontSize: '16px', color: isDark ? 'color-mix(in srgb, var(--on-surface) 40%, transparent)' : 'var(--error)' }}
                />
                <span style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: isDark ? 0.5 : 1 }}>
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
