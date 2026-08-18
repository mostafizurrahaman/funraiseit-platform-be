import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { brandBuilderServices } from './brand-builder.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import type { IMulterFile } from 'packages/media-hub/src'

interface IFilePayloadForBrandBuilder {
  brandImage: IMulterFile[]
  brandLogo: IMulterFile[]
}

const createBrandBuilder = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const files = req.files as unknown as IFilePayloadForBrandBuilder
  const result = await brandBuilderServices.createBrandBuilder(user, req.body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The brand builder created successfully!',
    data: result,
  })
})

const getAllBrandBuilder = catchAsync(async (req, res) => {
  const result = await brandBuilderServices.getAllBrandBuilder(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The brand builder retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getCustomerBrandBuilders = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await brandBuilderServices.getCustomerBrandBuilders(user, req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The customer brand building request retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const completeBrandBuilder = catchAsync(async (req, res) => {
  const result = await brandBuilderServices.completeBrandBuilder(req?.params?.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Brand builder completion successful.',
    data: result,
  })
})

export const brandBuilderControllers = {
  createBrandBuilder,
  getCustomerBrandBuilders,
  getAllBrandBuilder,
  completeBrandBuilder,
}
