export const STAFF_ROLES = ['admin', 'owner', 'manager', 'receptionist', 'trainer', 'house_keeper'] as const

export const PROFILE_ROLES = [...STAFF_ROLES, 'member'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]
export type ProfileRole = (typeof PROFILE_ROLES)[number]

export function isStaffRole(role: string | null | undefined): role is StaffRole {
    return typeof role === 'string' && STAFF_ROLES.includes(role as StaffRole)
}

export function formatRoleLabel(role: string) {
    return role.replace(/_/g, ' ')
}
