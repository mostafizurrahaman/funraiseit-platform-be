import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { donationServices } from './donation.services'
import type { TGetAllDonationQueryParamsType } from './donation.validations'

const createDonation = catchAsync(async (req, res) => {
  const result = await donationServices.createDonation(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The donation created successfully!',
    data: result,
  })
})

const getAllDonation = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAllDonationQueryParamsType
  const result = await donationServices.getAllDonation(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The donation retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getDonationById = catchAsync(async (req, res) => {
  const result = await donationServices.getDonationById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The donation retrieved successfully!',
    data: result,
  })
})

const deleteDonationById = catchAsync(async (req, res) => {
  const result = await donationServices.deleteDonationById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The donation deleted successfully!',
    data: result,
  })
})

export const donationControllers = {
  createDonation,
  getAllDonation,
  getDonationById,
  deleteDonationById,
}
