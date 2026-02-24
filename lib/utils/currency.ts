/**
 * Format number as Indian currency (₹)
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount)
}

/**
 * Format number as compact currency (e.g., ₹1.5K, ₹2.3M)
 */
export function formatCompactCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    }).format(amount)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
    return parseFloat(value.replace(/[^0-9.-]+/g, ''))
}
