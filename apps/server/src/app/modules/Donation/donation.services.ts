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
  TUpdateDonationPayloadType,
  TGetAllDonationQueryParamsType,
} from './donation.validations'
import mongoose from 'mongoose'
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

  // ?? Check is donation allowed:
  if (!campaign?.allowDonation) {
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

const updateDonation = async (id: string, payload: TUpdateDonationPayloadType) => {
  const result = await Donation.findOneAndUpdate({ _id: id }, { $set: payload }, { new: true })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Donation not found')
  }

  return result
}

const getAllDonation = async (query: TGetAllDonationQueryParamsType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
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

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  })

  const aggregated = await Donation.aggregate(pipeline)

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
  updateDonation,
  getAllDonation,
  getDonationById,
  deleteDonationById,
}
