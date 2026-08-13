import z from 'zod'
import { requiredString, enumString } from '@repo/shared'
import { contentTypeValues } from '@repo/db'

const updateContentSchema = z.object({
  body: z.object({
    contentType: enumString(contentTypeValues, 'Content type'),
    content: requiredString('Content'),
  }),
})

const getContentByIdSchema = z.object({
  params: z.object({
    contentType: enumString(contentTypeValues, 'Content type'),
  }),
})

export const contentValidations = {
  updateContentSchema,

  getContentByIdSchema,
}

export type TUpdateContentPayloadType = z.infer<typeof updateContentSchema.shape.body>

export type TGetContentByIdParamsType = z.infer<typeof getContentByIdSchema.shape.params>
