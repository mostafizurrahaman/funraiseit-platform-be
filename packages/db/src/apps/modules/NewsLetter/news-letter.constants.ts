export const newsLetterSearchableFields = ['email'] as const

export const newsLetterSortableFields = ['email', 'subscribedAt'] as const

// Types (optional but recommended)
export type TNewsLetterSearchableField = (typeof newsLetterSearchableFields)[number]

export type TNewsLetterSortableField = (typeof newsLetterSortableFields)[number]
