'use client'

import { useAdminTheme } from '@/components/layout/AdminThemeContext'

/**
 * Chart colours for the reports area.
 *
 * Recharts writes colours as SVG presentation attributes, which do not resolve
 * `var(--token)`, so the values have to be concrete. This module is the one
 * place they are written down: it mirrors the admin UI's own palette rather
 * than inventing a second system — greys match the `gray-*` / `neutral-*`
 * classes the report tables already use, the delta colours match DeltaBadge's
 * emerald/rose, and series colour 1 is the admin dashboard's accent in each
 * mode (blue in light, green in dark).
 *
 * The active mode comes from `useAdminTheme`, the same source the rest of
 * /admin reads, so charts flip with the theme toggle without a reload.
 */
export type ChartPalette = {
    /** Categorical series, in the order charts should consume them. */
    series: string[]
    /** Muted line/bar for a comparison period. */
    comparison: string
    positive: string
    negative: string
    grid: string
    axis: string
    axisLine: string
    /** Tooltip surface. */
    surface: string
    surfaceBorder: string
    ink: string
    inkMuted: string
}

const LIGHT: ChartPalette = {
    series: ['#0f5be1', '#0d9488', '#7c3aed', '#d97706', '#0891b2', '#be185d', '#4d7c0f'],
    comparison: '#9ca3af',
    positive: '#059669',
    negative: '#e11d48',
    grid: '#e5e7eb',
    axis: '#6b7280',
    axisLine: '#e5e7eb',
    surface: '#ffffff',
    surfaceBorder: '#e5e7eb',
    ink: '#111827',
    inkMuted: '#6b7280',
}

const DARK: ChartPalette = {
    series: ['#10b981', '#60a5fa', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#a3e635'],
    comparison: '#71717a',
    positive: '#34d399',
    negative: '#fb7185',
    grid: '#2a2a2a',
    axis: '#a1a1aa',
    axisLine: '#2a2a2a',
    surface: '#171717',
    surfaceBorder: '#404040',
    ink: '#ffffff',
    inkMuted: '#a1a1aa',
}

export function useChartPalette(): ChartPalette {
    const { isDark } = useAdminTheme()
    return isDark ? DARK : LIGHT
}

/** Series colour by index, wrapping once the palette runs out. */
export function seriesColor(palette: ChartPalette, index: number): string {
    return palette.series[index % palette.series.length]
}
