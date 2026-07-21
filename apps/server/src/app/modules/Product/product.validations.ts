import z from "zod"
import { requiredString, optionalNumber, optionalEnumString, optionalString, optionalDate, sortingOrderValues, sortOrder } from '@repo/shared'
import { productSortableFields } from "@repo/db"



const createProductSchema = z.object({
  body: z.object({})
})

const updateProductSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  }),
  body: z.object({})
})

const getAllProductSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortingOrderValues, "Sort order"),
    sortBy: optionalEnumString(productSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date")
  })
})

const getProductByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

const deleteProductByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID")
  })
})

export const productValidations = {
  createProductSchema,
  updateProductSchema,
  getAllProductSchema,
  getProductByIdSchema,
  deleteProductByIdSchema
}

export type TCreateProductPayloadType = z.infer<typeof createProductSchema.shape.body>
export type TUpdateProductPayloadType = z.infer<typeof updateProductSchema.shape.body>
export type TGetAllProductQueryParamsType = z.infer<typeof getAllProductSchema.shape.query>
export type TGetProductByIdParamsType = z.infer<typeof getProductByIdSchema.shape.params>
export type TDeleteProductByIdParamsType = z.infer<typeof deleteProductByIdSchema.shape.params>