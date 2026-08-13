import { Content } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import type { TUpdateContentPayloadType } from './content.validations'

const updateContent = async (payload: TUpdateContentPayloadType) => {
  const { contentType, content } = payload

  const result = await Content.findOneAndUpdate(
    {
      contentType,
    },
    {
      content,
    },
    {
      returnDocument: 'after',
      upsert: true,
    }
  )

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found')
  }

  return result
}

const getContentByContentType = async (contentType: string) => {
  const result = await Content.findOne({ contentType })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found')
  }

  return result
}

export const contentServices = {
  updateContent,
  getContentByContentType,
}
