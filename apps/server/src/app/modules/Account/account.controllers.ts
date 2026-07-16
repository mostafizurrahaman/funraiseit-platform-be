import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { accountServices } from './account.services'

const createAccount = catchAsync(async (req, res) => {
  const result = await accountServices.createAccount(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The account created successfully!',
    data: result,
  })
})

const updateAccount = catchAsync(async (req, res) => {
  const result = await accountServices.updateAccount(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The account updated successfully!',
    data: result,
  })
})

const getAllAccount = catchAsync(async (req, res) => {
  const result = await accountServices.getAllAccount(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The account retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getAccountById = catchAsync(async (req, res) => {
  const result = await accountServices.getAccountById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The account retrieved successfully!',
    data: result,
  })
})

const deleteAccountById = catchAsync(async (req, res) => {
  const result = await accountServices.deleteAccountById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The account deleted successfully!',
    data: result,
  })
})

export const accountControllers = {
  createAccount,
  updateAccount,
  getAllAccount,
  getAccountById,
  deleteAccountById
}