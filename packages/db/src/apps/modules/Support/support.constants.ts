export const supportSearchableFields = [
  'ticketNo',
  'email',
  'userName',
  'userEmail',
  'campaignName',
  'campaignCode',
  'organizerName',
  'organizerEmail',
  'subject',
  'message',
] as const

export const supportSortableFields = [
  'ticketNo',
  'userName',
  'campaignName',
  'campaignCode',
  'subject',
  'status',
  'createdAt',
  'updatedAt',
] as const

export const supportStatus = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  IN_PROGRESS: 'in_progress',
} as const

// Types (optional but recommended)
export type TSupportSearchableField = (typeof supportSearchableFields)[number]

export type TSupportSortableField = (typeof supportSortableFields)[number]

export type TSupportStatusType = (typeof supportStatus)[keyof typeof supportStatus]

export const supportStatusValues = Object.values(supportStatus)
