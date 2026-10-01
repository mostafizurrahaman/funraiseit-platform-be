export const waitlistStatus = {
  REGISTERED: 'registered',
  VIP: 'vip',
  SKIPPED_VIP: 'skipped_vip',
} as const

export const waitlistStatusValues = Object.values(waitlistStatus)
export type TWaitlistStatus = (typeof waitlistStatus)[keyof typeof waitlistStatus]

export const waitlistSearchableFields = [
  'email',
  'phoneNumber',
  'formattedMemberNumber',
] as const

export const waitlistSortableFields = [
  'createdAt',
  'memberNumber',
  'email',
  'status',
  'vipClaimedAt',
  'updatedAt',
] as const

export type TWaitlistSearchableField = (typeof waitlistSearchableFields)[number]
export type TWaitlistSortableField = (typeof waitlistSortableFields)[number]
