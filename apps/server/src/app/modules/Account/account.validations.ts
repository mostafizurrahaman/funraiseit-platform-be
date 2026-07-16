import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { accountSortableFields } from "@repo/db"



const createAccountSchema = z.object({
  body: z.object({})
})

const updateAccountSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllAccountSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(accountSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getAccountByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteAccountByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const accountValidations = {
  createAccountSchema,
  updateAccountSchema,
  getAllAccountSchema,
  getAccountByIdSchema,
  deleteAccountByIdSchema
}

export type TCreateAccountPayloadType = z.infer<typeof createAccountSchema.shape.body>
export type TUpdateAccountPayloadType = z.infer<typeof updateAccountSchema.shape.body>
export type TGetAllAccountQueryParamsType = z.infer<typeof getAllAccountSchema.shape.query>
export type TGetAccountByIdParamsType = z.infer<typeof getAccountByIdSchema.shape.params>
export type TDeleteAccountByIdParamsType = z.infer<typeof deleteAccountByIdSchema.shape.params>