import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { newsLetterServices } from './news-letter.services'

const createNewsLetter = catchAsync(async (req, res) => {
  const result = await newsLetterServices.createNewsLetter(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Successfully subscribed to the newsletter.',
    data: result,
  })
})

const getAllNewsLetter = catchAsync(async (req, res) => {
  const result = await newsLetterServices.getAllNewsLetter(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The news letter retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const newsLetterControllers = {
  createNewsLetter,
  getAllNewsLetter,
}
