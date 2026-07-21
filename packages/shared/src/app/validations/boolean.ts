import z from 'zod'

export const requiredStrBoolean = (fieldName: string) =>
  z
    .union([z.boolean(), z.string().trim()])
    .transform((value) => {
      if (typeof value === 'boolean') return value

      return value === 'true'
    })
    .refine((value) => value !== undefined && value !== null, {
      message: `${fieldName} is required`,
    })
