import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { productServices } from './product.services'
import type { IMulterFile } from 'packages/media-hub/src'
import { getUserFromRequest } from '@app/libs/get-user-from-request'

const addProductIntoCampaign = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const files = req.files as { [fieldname: string]: IMulterFile[] }
  const payload = req.body
  const campaignId = req.params.id as string
  const productImage = files?.['productImage']?.[0] as IMulterFile
  const downloadFile = files?.['downloadFiles']?.[0] as IMulterFile
  const result = await productServices.addProductIntoCampaign(
    user,
    campaignId,
    payload,
    productImage,
    downloadFile
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'A product added into campaign successfully!',
    data: result,
  })
})

const updateProductIntoCampaign = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const files = req.files as { [fieldname: string]: IMulterFile[] }
  const payload = req.body
  const productId = req.params.productId as string
  const productImage = files?.['productImage']?.[0] as IMulterFile
  const downloadFile = files?.['downloadFiles']?.[0] as IMulterFile
  const result = await productServices.updateProductByIDIntoCampaign(
    user,
    productId,
    payload,
    productImage,
    downloadFile
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The product updated successfully!',
    data: result,
  })
})

const getAllProduct = catchAsync(async (req, res) => {
  const result = await productServices.getAllProduct(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The product retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getProductById = catchAsync(async (req, res) => {
  const result = await productServices.getProductById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The product retrieved successfully!',
    data: result,
  })
})

const deleteProductById = catchAsync(async (req, res) => {
  const result = await productServices.deleteProductById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The product deleted successfully!',
    data: result,
  })
})

export const productControllers = {
  addProductIntoCampaign,
  updateProductIntoCampaign,
  getAllProduct,
  getProductById,
  deleteProductById,
}
