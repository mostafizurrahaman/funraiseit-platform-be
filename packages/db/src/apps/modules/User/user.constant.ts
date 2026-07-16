// Auth Status
export const AuthStatus = {
  ACTIVE: 'active', // can use the system
  PENDING: 'pending', // signup completed, waiting for next step
  IN_REVIEW: 'in_review', // admin/manual verification in progress
  BLOCKED: 'blocked', // admin restricted
  DELETED: 'deleted', // soft-deleted (no login)
} as const

export const AuthPermission: Record<TAuthRole, number> = {
  super_admin: 4,
  admin: 3,
  support_admin: 2,
  organizer: 2,
}

export const AuthStatusValues = Object.values(AuthStatus)

export type TAuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus]

// Auth Roles:
export const AuthRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  SUPPORT_ADMIN: 'support_admin',
} as const

export const AuthRolesValues = Object.values(AuthRoles)

export type TAuthRole = (typeof AuthRoles)[keyof typeof AuthRoles]

export const usersSortableFields: string[] = [
  'name',
  'email',
  'phoneNumber',
  'createdAt',
  'updatedAt',
]
export const usersSearchableFields: string[] = ['name', 'email', 'phoneNumber', 'role', 'status']
