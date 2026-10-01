import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { waitlistServices } from './waitlist.services'

const submitEmail = catchAsync(async (req, res) => {
  const result = await waitlistServices.submitEmail(req.body)

  sendResponse(res, {
    success: true,
    statusCode: result.isNew ? httpStatus.CREATED : httpStatus.OK,
    message: result.message,
    data: result.waitlist,
  })
})

const claimVip = catchAsync(async (req, res) => {
  const result = await waitlistServices.claimVip(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: result.waitlist,
  })
})

const skipVip = catchAsync(async (req, res) => {
  const result = await waitlistServices.skipVip(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: result.waitlist,
  })
})

const getAllWaitlist = catchAsync(async (req, res) => {
  const result = await waitlistServices.getAllWaitlist(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Waitlist entries retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const exportWaitlistCsv = catchAsync(async (req, res) => {
  const result = await waitlistServices.exportWaitlistCsv(req.query)

  if (req.query.format === 'json') {
    return sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Waitlist export data retrieved successfully!',
      data: result.records,
      meta: {
        page: 1,
        limit: result.count,
        total: result.count,
        totalPages: 1,
      },
    })
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  return res.status(httpStatus.OK).send(result.csvContent)
})

const exportWaitlistExcel = catchAsync(async (req, res) => {
  const result = await waitlistServices.exportWaitlistExcel(req.query)

  if (req.query.format === 'json') {
    return sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Waitlist export data retrieved successfully!',
      data: result.records,
      meta: {
        page: 1,
        limit: result.count,
        total: result.count,
        totalPages: 1,
      },
    })
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  return res.status(httpStatus.OK).send(result.buffer)
})

export const waitlistControllers = {
  submitEmail,
  claimVip,
  skipVip,
  getAllWaitlist,
  exportWaitlistCsv,
  exportWaitlistExcel,
}
