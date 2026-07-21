import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { productServices } from './product.services'

const createProduct = catchAsync(async (req, res) => {
  const result = await productServices.createProduct(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The product created successfully!',
    data: result,
  })
})

const updateProduct = catchAsync(async (req, res) => {
  const result = await productServices.updateProduct(req.params.id as string, req.body)

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
  createProduct,
  updateProduct,
  getAllProduct,
  getProductById,
  deleteProductById
}