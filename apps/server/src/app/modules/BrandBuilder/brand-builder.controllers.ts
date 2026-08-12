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

const updateBrandBuilder = catchAsync(async (req, res) => {
  const result = await brandBuilderServices.updateBrandBuilder(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The brand builder updated successfully!',
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

const getBrandBuilderById = catchAsync(async (req, res) => {
  const result = await brandBuilderServices.getBrandBuilderById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The brand builder retrieved successfully!',
    data: result,
  })
})

const deleteBrandBuilderById = catchAsync(async (req, res) => {
  const result = await brandBuilderServices.deleteBrandBuilderById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The brand builder deleted successfully!',
    data: result,
  })
})

export const brandBuilderControllers = {
  createBrandBuilder,
  updateBrandBuilder,
  getAllBrandBuilder,
  getBrandBuilderById,
  deleteBrandBuilderById,
}
