import {
  Account,
  accountStatus,
  AuthStatus,
  Campaign,
  CampaignStatus,
  Donation,
  DonationPayment,
  donationSearchableFields,
  paymentStatus,
  paymentType,
  SiteInfo,
  Supporter,
  User,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'

import type {
  TCreateDonationPayloadType,
  TGetAllDonationQueryParamsType,
} from './donation.validations'
import mongoose, { Types } from 'mongoose'
import { calculatePaymentBreakdown } from '@app/libs/get-stripe-fee-breakdown'
import { stripeCheckoutSessionWithApplicationFee } from '@app/libs/stripe'
const MIN_DONATION = 0.5

const createDonation = async (payload: TCreateDonationPayloadType) => {
  const { campaignId, firstName, lastName, amount, email, message, phone } = payload

  // ?? Check is campaign exists ?:
  const campaign = await Campaign.findOne({
    _id: campaignId,
  })

  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  // ?? Check is campaign active ?:
  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only active campaigns can receive donations. Current status "${campaign.status}"`
    )
  }

  // ?? Check is campaign duration completed:
  const now = Date.now()

  // Check if campaign has ended for donations
  if (campaign.endDate && new Date(campaign.endDate).getTime() < now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This campaign has ended. Donations are no longer accepted.'
    )
  }

  // Check if campaign has not started yet for donations
  if (campaign.startDate && new Date(campaign.startDate).getTime() > now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This campaign has not started yet. Donations cannot be made.'
    )
  }

  if (!campaign?.allowDonation) {
    // ?? Check is donation allowed:
    throw new AppError(httpStatus.BAD_REQUEST, 'Donation is not enabled for this campaign.')
  }

  // ?? Campaign organization :
  const campaignOrg = await User.findOne({
    _id: campaign?.organizer,
  })

  if (!campaignOrg) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign organizer not found.')
  }

  const orgAccount = await Account.findOne({
    user: campaignOrg?._id,
  })

  if (!orgAccount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The organizer has not connected a payment account and cannot receive donations.'
    )
  }
  if (orgAccount.status !== accountStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The organizer's payment account is not active. Donations are temporarily unavailable."
    )
  }

  // ?? Campaign Owner status:
  if (campaignOrg.status !== AuthStatus.ACTIVE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only active organizer can receive donations. Current Organizer status "${campaignOrg.status}"`
    )
  }

  if (amount < MIN_DONATION) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Donation amount must be at least 0.5 usd.')
  }

  const siteFee = await SiteInfo.findOne({})
  const platformFee = siteFee?.platformFee || 6

  // ?? Calculate charges for the donation:
  const paymentBreakdown = calculatePaymentBreakdown({
    paymentType: paymentType.DONATION,
    donationAmount: amount,
  })

  console.log(paymentBreakdown)

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // ?? Supporter:
    const fullName = firstName?.trim() + ' ' + lastName?.trim()
    const newSupporter = await Supporter.findOneAndUpdate(
      {
        email: email?.trim(),
      },
      {
        $set: {
          name: fullName,
          phoneNumber: phone,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        session,
      }
    )

    if (!newSupporter) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to updated supporter info.')
    }

    const [donation] = await Donation.create(
      [
        {
          supporter: newSupporter._id,
          campaign: campaign?._id,
          donorName: fullName,
          donorPhone: newSupporter.phoneNumber!,
          totalAmount: paymentBreakdown.databaseRecord.grossAmount,
          stripeFeePercentage: 2.9,
          platformFeePercentage: platformFee,
          message: message,
        },
      ],
      {
        session,
      }
    )

    if (!donation) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to updated donation info.')
    }

    const checkoutSession = await stripeCheckoutSessionWithApplicationFee({
      name: `Donation for "${campaign.name}" to ${campaignOrg.name} `,
      unit_amount: paymentBreakdown.stripePayload.amount,
      application_fee: paymentBreakdown.stripePayload.application_fee_amount,
      destinationAccountId: orgAccount?.account,
      metadata: {
        organizer: campaignOrg?._id.toString(),
        campaign: campaign?._id.toString(),
        donation: donation?._id.toString(),
        supporter: newSupporter?._id.toString(),
        paymentType: paymentBreakdown.databaseRecord.paymentType as unknown as string,
        grossAmount: paymentBreakdown.databaseRecord.grossAmount, // Customer pays this
        stripeFee: paymentBreakdown.databaseRecord.stripeFee,
        platformFee: paymentBreakdown.databaseRecord.platformFee,
        organizerNetAmount: paymentBreakdown.databaseRecord.organizerNetAmount,
      },
    })

    // ?? Create payment record for donation **
    const [payment] = await DonationPayment.create(
      [
        {
          organizer: campaignOrg?._id,
          campaign: campaign?._id,
          donation: donation?._id,
          supporter: newSupporter?._id,
          amount: paymentBreakdown.databaseRecord.grossAmount,
          status: paymentStatus.PENDING,
          stripeCheckoutSessionId: checkoutSession.id!,
          stripePaymentIntentId: checkoutSession.payment_intent as string,
          checkoutUrl: checkoutSession.url!,
        },
      ],
      { session }
    )

    if (!payment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to updated donation info.')
    }

    await session.commitTransaction()

    return { checkoutUrl: checkoutSession.url }
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

const getAllDonation = async (query: TGetAllDonationQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    campaignId,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    donationStatus,
    paymentStatus,
    skipPagination = false,
    fromDate,

    toDate,
  } = query

  const limit = Number(currentLimit) || 1
  const page = Number(currentPage) || 10

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (campaignId) {
    pipeline.push({
      $match: {
        campaign: new Types.ObjectId(campaignId),
      },
    })
  }
  if (donationStatus) {
    pipeline.push({
      $match: {
        status: donationStatus,
      },
    })
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'supporters',
        localField: 'supporter',
        foreignField: '_id',
        as: 'supporterDetails',
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'donation',
        as: 'paymentDetails',
        pipeline: [
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $lookup: {
              from: 'paymentbreakdowns',
              localField: '_id',
              foreignField: 'payment',
              as: 'paymentBreakingDown',
              pipeline: [
                {
                  $sort: {
                    createdAt: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
            },
          },
          {
            $unwind: {
              path: '$paymentBreakingDown',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$supporterDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        paymentDetails: {
          $arrayElemAt: ['$paymentDetails', 0],
        },
      },
    },
    {
      $project: {
        _id: 0,
        donationId: '$_id',
        campaignId: '$campaign',
        supporterId: '$supporter',

        // Order Provided supporter Name:
        customerName: '$customerName',
        customerPhone: '$customerPhone',

        // Supporter Info:
        supporterName: '$supporterDetails.name',
        supporterEmail: '$supporterDetails.email',
        supporterPhone: '$supporterDetails.phoneNumber',

        // Payment Info:
        paymentId: { $ifNull: ['$paymentDetails._id', null] },
        paymentBreakDownId: { $ifNull: ['$paymentDetails.paymentBreakingDown._id', null] },

        paidAt: {
          $ifNull: ['$paymentDetails.paidAt', null],
        },

        // Fees:
        stripeTransactionFeePercentage: '$stripeFeePercentage',
        platformFeePercentage: '$platformFeePercentage',

        // Amounts
        subTotal: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.subTotal', '$subTotal', 0],
        },
        totalAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.totalAmount', '$totalAmount', 0],
        },
        stripeFeeAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.stripeFee', null],
        },
        platformFeeAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.platformFee', null],
        },
        organizerNetAmount: {
          $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmount', null],
        },
        paymentStatus: {
          $ifNull: ['$paymentDetails.status', null],
        },
        donationStatus: '$status',
      },
    }
  )

  if (paymentStatus) {
    pipeline.push({
      $match: {
        paymentStatus,
      },
    })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: donationSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })

  const PaginationStages: PipelineStage.FacetPipelineStage[] = [
    {
      $match: {},
    },
  ]

  if (!skipPagination || (typeof skipPagination === 'string' && skipPagination !== 'true')) {
    PaginationStages.push({ $skip: skip }, { $limit: limit })
  }

  pipeline.push({
    $facet: {
      data: PaginationStages,
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Donation.aggregate(pipeline)

  const data = aggregated?.[0]?.data || []
  const total = aggregated?.[0]?.meta?.[0]?.total || 0

  return {
    data,
    meta: {
      page: skipPagination ? 1 : page,
      limit: skipPagination ? total : limit,
      total,
      totalPages: skipPagination ? 1 : Math.ceil(total / limit) || 1,
    },
  }
}

const getDonationById = async (id: string) => {
  const result = await Donation.findById(id)

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Donation not found')
  }

  return result
}

const deleteDonationById = async (id: string) => {
  const result = await Donation.findOneAndDelete({ _id: id })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Donation not found')
  }

  return result
}

export const donationServices = {
  createDonation,

  getAllDonation,
  getDonationById,
  deleteDonationById,
}
