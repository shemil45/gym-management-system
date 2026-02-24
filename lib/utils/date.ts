import { format, formatDistance, formatRelative, differenceInDays, addDays, subDays, startOfDay, endOfDay, isAfter, isBefore, parseISO } from 'date-fns'

/**
 * Format date to readable string
 * @param date - Date string or Date object
 * @param formatStr - Format string (default: 'MMM dd, yyyy')
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr)
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
export function formatRelativeDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistance(dateObj, new Date(), { addSuffix: true })
}

/**
 * Get days remaining until expiry
 */
export function getDaysRemaining(expiryDate: string | Date): number {
    const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate
    return differenceInDays(expiry, new Date())
}

/**
 * Check if membership is expired
 */
export function isExpired(expiryDate: string | Date): boolean {
    const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate
    return isBefore(expiry, new Date())
}

/**
 * Check if membership is expiring soon (within days)
 */
export function isExpiringSoon(expiryDate: string | Date, days: number = 7): boolean {
    const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate
    const threshold = addDays(new Date(), days)
    return isBefore(expiry, threshold) && !isExpired(expiryDate)
}

/**
 * Calculate new expiry date based on plan duration
 */
export function calculateExpiryDate(startDate: string | Date, durationDays: number): Date {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
    return addDays(start, durationDays)
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'yyyy-MM-dd')
}

/**
 * Get today's date at start of day
 */
export function getTodayStart(): Date {
    return startOfDay(new Date())
}

/**
 * Get today's date at end of day
 */
export function getTodayEnd(): Date {
    return endOfDay(new Date())
}
