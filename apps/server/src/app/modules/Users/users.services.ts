import {
  AuthPermission,
  AuthRoles,
  AuthStatus,
  CampaignStatus,
  paymentStatus,
  paymentType,
  User,
  usersSearchableFields,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError, hashPassword } from '@repo/shared'
import { Types, type PipelineStage } from 'mongoose'

import type {
  TCreateUsersPayloadType,
  TUpdateUsersPayloadType,
  TGetAllUsersQueryParamsType,
  TGetAllOrganizationsQueryParamsType,
} from './users.validations'
import { uploadSingleFileToS3, type IMulterFile } from 'packages/media-hub/src'
import configs from '@app/configs'
import { renderEmail, WelcomeEmail } from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'

const createUsers = async (
  user: IUser,
  payload: TCreateUsersPayloadType,
  profileImageFile: IMulterFile
) => {
  const { name, email, password, phoneNumber, role } = payload

  // ? Check is already an user exists with this email?:
  const existingUser = await User.findOne({
    email,
  })
  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, `The user has already exists!`)
  }

  // ? Check has associated user with this phone number
  const hasAssociatedUserWithPhoneNumber = await User.exists({
    phoneNumber,
  }).lean()

  if (hasAssociatedUserWithPhoneNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, 'The phone number have already in use.')
  }

  // Check role:
  const actorPrivileges = AuthPermission[user?.role]
  const targetPrivileges = AuthPermission[role]

  if (actorPrivileges <= targetPrivileges) {
    throw new AppError(httpStatus.NOT_FOUND, `As an ${user.role} you can't create ${role}`)
  }

  // ? Upload the profile image if provided:
  let imageUrl = null
  if (profileImageFile) {
    const { url } = await uploadSingleFileToS3(profileImageFile, 'profileImage')

    imageUrl = url
  }

  // Generate hashed password:
  const hashedPassword = await hashPassword(password, configs.passwordSaltRound)

  // Prepare payload:
  const newUserPayload = {
    name,
    email,
    password: hashedPassword,
    phoneNumber,
    role,
    profileImage: imageUrl!,
    status: AuthStatus.ACTIVE,
    isOtpVerified: true,
  }

  const result = await User.create(newUserPayload)

  // Generate welcome email template:

  const htmlTemplate = await renderEmail(
    WelcomeEmail({
      firstName: result.name!,
      companyName: configs.site.name,
      password, // Plain password from payload
      actionUrl: `${configs.site.clientUrl!}/login`,
      logoSrc: configs.site.logo || undefined,
      supportEmail: configs.site.supportEmail || undefined,
      greeting: `Welcome to ${configs.site.name}!`,
    })
  )

  sendEmail({
    to: result.email,
    subject: `Welcome to ${configs.site.name}`,
    html: htmlTemplate.html,
    text: htmlTemplate.text,
  })

  return result
}

const updateUsers = async (user: IUser, id: string, payload: TUpdateUsersPayloadType) => {
  const { name, phoneNumber } = payload

  const existingUser = await User.findOne({
    _id: id,
  })

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!")
  }

  if (existingUser.status !== AuthStatus.ACTIVE) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `User account is not active. Current status "${existingUser.status}" `
    )
  }

  // Check role:
  const actorPrivileges = AuthPermission[user?.role]
  const targetPrivileges = AuthPermission[existingUser?.role]

  if (actorPrivileges <= targetPrivileges) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `As an ${user.role}, you can't update ${existingUser.role}`
    )
  }

  // ? Check phoneNumber changed:
  const isPhoneNumberChanged = phoneNumber && existingUser.phoneNumber !== phoneNumber

  if (isPhoneNumberChanged) {
    const hasAssociatedUserWithPhoneNumber = await User.findOne({
      phoneNumber,
      _id: {
        $ne: existingUser?._id,
      },
    })

    if (hasAssociatedUserWithPhoneNumber) {
      throw new AppError(
        httpStatus.CONFLICT,
        'The phone number already associated with another account.'
      )
    }
  }

  if (name !== undefined) existingUser.name = name
  if (phoneNumber !== undefined) existingUser.phoneNumber = phoneNumber

  await existingUser.save({
    validateBeforeSave: true,
  })
  return null
}

const getAllUsers = async (user: IUser, query: TGetAllUsersQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    status,
    role,
    toDate,
  } = query
  const page = Number(currentPage) || 1
  const limit = Number(currentLimit) || 10

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = [
    {
      $match: {
        role: {
          $ne: AuthRoles.ORGANIZER,
        },
        _id: {
          $ne: user?._id,
        },
      },
    },
  ]

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: usersSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  if (status) {
    pipeline.push({
      $match: {
        status,
      },
    })
  }

  if (role) {
    pipeline.push({
      $match: {
        role,
      },
    })
  }

  pipeline.push({
    $project: {
      _id: 0,
      userId: '$_id',
      name: '$name',
      email: '$email',
      phoneNumber: { $ifNull: ['$phoneNumber', null] },
      profileImage: { $ifNull: ['$profileImage', null] },
      role: '$role',
      status: '$status',
      lastLogin: { $ifNull: ['$lastLogin', null] },
      lastActivity: { $ifNull: ['$lastActivity', null] },
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await User.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getAllOrganizations = async (query: TGetAllOrganizationsQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    status,
    toDate,
  } = query
  const page = Number(currentPage) || 1
  const limit = Number(currentLimit) || 10

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = [
    {
      $match: {
        role: AuthRoles.ORGANIZER,
      },
    },
  ]

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: usersSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  if (status) {
    pipeline.push({
      $match: {
        status,
      },
    })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'campaigns',
        localField: '_id',
        foreignField: 'organizer',
        as: 'campaignDetails',
        pipeline: [
          {
            $group: {
              _id: null,
              totalCampaign: {
                $sum: 1,
              },
              totalActiveCampaign: {
                $sum: {
                  $cond: [
                    {
                      $ifNull: ['$status', CampaignStatus.ACTIVE],
                    },
                    1,
                    0,
                  ],
                },
              },
              cancelledCampaign: {
                $sum: {
                  $cond: [
                    {
                      $ifNull: ['$status', CampaignStatus.CANCELLED],
                    },
                    1,
                    0,
                  ],
                },
              },
              rejectedCampaign: {
                $sum: {
                  $cond: [
                    {
                      $ifNull: ['$status', CampaignStatus.REJECTED],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'organizer',
        as: 'paymentDetails',
        pipeline: [
          {
            $match: {
              status: paymentStatus.PAID,
              paymentType: {
                $in: [paymentType.DONATION, paymentType.ORDER],
              },
            },
          },
          {
            $lookup: {
              from: 'paymentbreakdowns',
              localField: '_id',
              foreignField: 'payment',
              as: 'paymentBreakdown',
            },
          },

          {
            $unwind: {
              path: '$paymentBreakdown',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: null,
              supporters: {
                $addToSet: '$supporter',
              },
              totalOrders: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.ORDER] }, 1, 0],
                },
              },
              totalDonations: {
                $sum: {
                  $cond: [{ $eq: ['$paymentType', paymentType.DONATION] }, 1, 0],
                },
              },
              totalOrderedAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.ORDER] },
                    '$paymentBreakdown.totalAmount',
                    0,
                  ],
                },
              },
              totalDonationAmount: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentType', paymentType.DONATION] },
                    { $ifNull: ['$paymentBreakdown.totalAmount', 0] },
                    0,
                  ],
                },
              },
              subtotal: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.subtotal', 0],
                },
              },
              shippingFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.shippingFee', 0],
                },
              },
              totalAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.totalAmount', 0],
                },
              },
              stripeFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.stripeFee', 0],
                },
              },
              platformFee: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.platformFee', 0],
                },
              },
              organizerAmount: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmount', 0],
                },
              },
              organizerAmountWithoutShipping: {
                $sum: {
                  $ifNull: ['$paymentBreakdown.organizerAmountWithoutShipping', 0],
                },
              },
            },
          },
        ],
      },
    }
  )

  pipeline.push({
    $unwind: {
      path: '$paymentDetails',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $unwind: {
      path: '$campaignDetails',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $project: {
      _id: 0,
      userId: '$_id',
      name: '$name',
      email: '$email',
      phoneNumber: { $ifNull: ['$phoneNumber', null] },
      profileImage: { $ifNull: ['$profileImage', null] },
      totalCampaign: { $ifNull: ['$totalCampaign', 0] },
      totalActiveCampaign: { $ifNull: ['$totalActiveCampaign', 0] },
      cancelledCampaign: { $ifNull: ['$cancelledCampaign', 0] },
      rejectedCampaign: { $ifNull: ['$rejectedCampaign', 0] },
      supporters: {
        $size: { $ifNull: ['$paymentDetails.supporters', []] },
      },
      totalOrders: { $ifNull: ['$paymentDetails.totalOrders', 0] },
      totalDonations: { $ifNull: ['$paymentDetails.totalDonations', 0] },
      totalOrderedAmount: { $ifNull: ['$paymentDetails.totalOrderedAmount', 0] },
      totalDonationAmount: { $ifNull: ['$paymentDetails.totalDonationAmount', 0] },
      subtotal: { $ifNull: ['$paymentDetails.subtotal', 0] },
      shippingFee: { $ifNull: ['$paymentDetails.shippingFee', 0] },
      totalAmount: { $ifNull: ['$paymentDetails.totalAmount', 0] },
      stripeFee: { $ifNull: ['$paymentDetails.stripeFee', 0] },
      platformFee: { $ifNull: ['$paymentDetails.platformFee', 0] },
      organizerAmount: { $ifNull: ['$paymentDetails.organizerAmount', 0] },
      totalRevenue: { $ifNull: ['$paymentDetails.organizerAmount', 0] },
      organizerAmountWithoutShipping: {
        $ifNull: ['$paymentDetails.organizerAmountWithoutShipping', 0],
      },
      role: '$role',
      status: '$status',
      lastLogin: { $ifNull: ['$lastLogin', null] },
      lastActivity: { $ifNull: ['$lastActivity', null] },
      joinedAt: '$createdAt',
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await User.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

const getUsersById = async (id: string) => {
  const pipeline: PipelineStage[] = []

  pipeline.push(
    {
      $match: {
        _id: new Types.ObjectId(id),
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        name: '$name',
        email: '$email',
        phoneNumber: { $ifNull: ['$phoneNumber', null] },
        profileImage: { $ifNull: ['$profileImage', null] },
        role: '$role',
        status: '$status',
        lastLogin: { $ifNull: ['$lastLogin', null] },
        lastActivity: { $ifNull: ['$lastActivity', null] },
        joinedAt: '$createdAt',
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    }
  )

  const result = await User.aggregate(pipeline)

  if (!result?.[0]) {
    throw new AppError(httpStatus.NOT_FOUND, 'Users not found')
  }

  return result[0]
}

// const deleteUsersById = async (id: string) => {
//   const result = await User.findOneAndDelete({ _id: id })

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Users not found')
//   }

//   return result
// }

export const usersServices = {
  createUsers,
  updateUsers,
  getAllUsers,
  getUsersById,
  // deleteUsersById,
  getAllOrganizations,
}
