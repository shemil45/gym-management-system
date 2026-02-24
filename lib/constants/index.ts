// App constants
export const APP_NAME = 'Gym Management System'
export const APP_DESCRIPTION = 'Complete gym management solution for mid-size gyms'

// Pagination
export const ITEMS_PER_PAGE = 20
export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

// Member statuses
export const MEMBER_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    FROZEN: 'frozen',
    EXPIRED: 'expired',
} as const

export const MEMBER_STATUS_LABELS = {
    active: 'Active',
    inactive: 'Inactive',
    frozen: 'Frozen',
    expired: 'Expired',
}

export const MEMBER_STATUS_COLORS = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    frozen: 'bg-blue-100 text-blue-800',
    expired: 'bg-red-100 text-red-800',
}

// Payment methods
export const PAYMENT_METHODS = {
    CASH: 'cash',
    CARD: 'card',
    UPI: 'upi',
    BANK_TRANSFER: 'bank_transfer',
    ONLINE: 'online',
} as const

export const PAYMENT_METHOD_LABELS = {
    cash: 'Cash',
    card: 'Card',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    online: 'Online',
}

// Payment statuses
export const PAYMENT_STATUSES = {
    PAID: 'paid',
    PENDING: 'pending',
    FAILED: 'failed',
    REFUNDED: 'refunded',
} as const

export const PAYMENT_STATUS_LABELS = {
    paid: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
    refunded: 'Refunded',
}

export const PAYMENT_STATUS_COLORS = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
}

// Expense categories
export const EXPENSE_CATEGORIES = {
    UTILITIES: 'utilities',
    SALARY: 'salary',
    EQUIPMENT: 'equipment',
    MAINTENANCE: 'maintenance',
    MARKETING: 'marketing',
    RENT: 'rent',
    OTHER: 'other',
} as const

export const EXPENSE_CATEGORY_LABELS = {
    utilities: 'Utilities',
    salary: 'Salary',
    equipment: 'Equipment',
    maintenance: 'Maintenance',
    marketing: 'Marketing',
    rent: 'Rent',
    other: 'Other',
}

// Entry methods
export const ENTRY_METHODS = {
    MANUAL: 'manual',
    QR: 'qr',
    KIOSK: 'kiosk',
    FINGERPRINT: 'fingerprint',
} as const

export const ENTRY_METHOD_LABELS = {
    manual: 'Manual',
    qr: 'QR Code',
    kiosk: 'Kiosk',
    fingerprint: 'Fingerprint',
}

// Gender options
export const GENDERS = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
} as const

export const GENDER_LABELS = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
}

// Referral statuses
export const REFERRAL_STATUSES = {
    PENDING: 'pending',
    APPLIED: 'applied',
    EXPIRED: 'expired',
} as const

export const REFERRAL_STATUS_LABELS = {
    pending: 'Pending',
    applied: 'Applied',
    expired: 'Expired',
}

// Reward types
export const REWARD_TYPES = {
    DISCOUNT: 'discount',
    FREE_DAYS: 'free_days',
    CASH: 'cash',
} as const

export const REWARD_TYPE_LABELS = {
    discount: 'Discount',
    free_days: 'Free Days',
    cash: 'Cash',
}

// Date ranges
export const DATE_RANGES = {
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    LAST_7_DAYS: 'last_7_days',
    LAST_30_DAYS: 'last_30_days',
    THIS_MONTH: 'this_month',
    LAST_MONTH: 'last_month',
    THIS_YEAR: 'this_year',
    CUSTOM: 'custom',
} as const

// Chart colors
export const CHART_COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
}

// Expiry warning threshold (days)
export const EXPIRY_WARNING_DAYS = 7
