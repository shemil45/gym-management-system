/**
 * Generate referral code from member name and phone
 * Format: FIRSTNAME + last 4 digits of phone
 */
export function generateReferralCode(fullName: string, phone: string): string {
    const firstName = fullName.split(' ')[0].toUpperCase()
    const last4Digits = phone.slice(-4)
    return `${firstName}${last4Digits}`
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
    return /^[A-Z]+\d{4}$/.test(code)
}
