import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { usersServices } from './users.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import type { IMulterFile } from 'packages/media-hub/src'

const createUsers = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await usersServices.createUsers(user, req.body, req.file as IMulterFile)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The users created successfully!',
    data: result,
  })
})

const updateUsers = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await usersServices.updateUsers(user, req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The users updated successfully!',
    data: result,
  })
})

const getAllUsers = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await usersServices.getAllUsers(user, req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The users retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getAllOrganizations = catchAsync(async (req, res) => {
  const result = await usersServices.getAllOrganizations(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The organizations are retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getUsersById = catchAsync(async (req, res) => {
  const result = await usersServices.getUsersById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The users retrieved successfully!',
    data: result,
  })
})

// const deleteUsersById = catchAsync(async (req, res) => {
//   const result = await usersServices.deleteUsersById(req.params.id as string)

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: 'The users deleted successfully!',
//     data: result,
//   })
// })

export const usersControllers = {
  createUsers,
  updateUsers,
  getAllUsers,
  getUsersById,
  // deleteUsersById,
  getAllOrganizations,
}
