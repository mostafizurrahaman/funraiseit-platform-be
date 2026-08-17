import {
  Campaign,
  Support,
  SupportReply,
  supportSearchableFields,
  supportStatus,
  User,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { PipelineStage } from 'mongoose'
import { renderEmail, SupportReplyEmail } from '@repo/email-templates'
import { sendEmail } from '@repo/email-sender'
import configs from '@app/configs'

import type {
  TCreateSupportPayloadType,
  TGetAllSupportQueryParamsType,
  TReplySupportMessagePayloadType,
} from './support.validations'
import { getUniqueTicket } from './support.utils'

const createSupport = async (payload: TCreateSupportPayloadType) => {
  const { email, subject, campaign, message } = payload

  // ?? Check is user exists with this email?:
  const existingUser = await User.findOne({ email })

  // ?? Check is campaign exists:
  const existingCampaign = await Campaign.findById(campaign)
  if (campaign && !existingCampaign) {
    throw new AppError(httpStatus.NOT_FOUND, "Campaign doesn't exists.")
  }

  const ticketNo = await getUniqueTicket()

  const newPayload: Record<string, unknown> = {
    ticketNo,
    subject,
    message,
    email,
  }

  if (existingUser) {
    newPayload['user'] = existingUser?._id
  }

  if (campaign && existingCampaign) {
    newPayload['campaign'] = existingCampaign?._id
  }

  const result = await Support.create(newPayload)
  return result
}

const getAllSupport = async (query: TGetAllSupportQueryParamsType) => {
  const {
    page: currentPage = 1,
    limit: currentLimit = 10,
    searchTerm,
    sortOrder = 'desc',
    sortBy = 'createdAt',
    fromDate,
    toDate,
  } = query

  const page = Number(currentPage) || 1
  const limit = Number(currentLimit) || 10

  const skip = (page - 1) * limit
  const pipeline: PipelineStage[] = []

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $lookup: {
        from: 'supportreplies',
        localField: '_id',
        foreignField: 'supportId',
        as: 'supportReplies',
      },
    },
    {
      $lookup: {
        from: 'campaigns',
        localField: 'campaign',
        foreignField: '_id',
        as: 'campaignDetails',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'organizer',
              foreignField: '_id',
              as: 'organizerDetails',
            },
          },
          {
            $unwind: {
              path: '$organizerDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$campaignDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$userDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        supportId: '$_id',
        ticketNo: '$ticketNo',
        userId: { $ifNull: ['$user', null] },
        email: '$email',
        userName: { $ifNull: ['$userDetails.name', null] },
        userEmail: { $ifNull: ['$userDetails.email', null] },
        campaignId: { $ifNull: ['$campaign', null] },
        campaignName: { $ifNull: ['$campaignDetails.name', null] },
        campaignCode: { $ifNull: ['$campaignDetails.campaignCode', null] },
        organizerId: { $ifNull: ['$campaignDetails.organizer', null] },
        organizerName: { $ifNull: ['$campaignDetails.organizerDetails.name', null] },
        organizerEmail: { $ifNull: ['$campaignDetails.organizerDetails.email', null] },
        supportReplies: '$supportReplies',
        totalReplies: { $size: { $ifNull: ['$supportReplies', []] } },
        subject: '$subject',
        message: '$message',
        status: '$status',
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    }
  )

  pipeline.push()

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: supportSearchableFields.map((field) => ({
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

  const aggregated = await Support.aggregate(pipeline)

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

// ?? Reply for support email:
const SupportIssueReply = async (payload: TReplySupportMessagePayloadType) => {
  const { replyMessage, supportId } = payload

  // ?? Check is support exists ?:
  const existingSupport = await Support.findOne({ _id: supportId }).populate('user')

  if (!existingSupport) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket doesn't exist.")
  }

  if (existingSupport.status === supportStatus.RESOLVED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'The raised issue is already resolved.')
  }

  if (!replyMessage || replyMessage?.trim() === '') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Reply message is required.')
  }

  const reply = await SupportReply.create({
    supportId: existingSupport._id,
    replyMessage,
  })

  // Render Support Reply Email Template
  const ticketNumber =
    existingSupport.ticketNo || String(existingSupport._id).slice(-6).toUpperCase()

  const htmlTemplate = await renderEmail(
    SupportReplyEmail({
      userName: (existingSupport.user as any)?.name || 'Valued Customer',
      ticketNo: ticketNumber,
      subject: existingSupport.subject,
      originalMessage: existingSupport.message,
      replyMessage,
      companyName: configs.site.name,
      logoUrl: configs.site.logo || undefined,
      supportEmail: configs.site.supportEmail || undefined,
    })
  )

  // Send Email
  await sendEmail({
    to: existingSupport.email,
    fromName: configs.site.name,
    replyTo: configs.site.supportEmail,
    subject: `[Ticket #${ticketNumber}] Re: ${existingSupport.subject}`,
    html: htmlTemplate.html,
    text: htmlTemplate.text,
  })

  return reply
}

// ?? Mark support as IN_PROGRESS:
const markSupportInProgress = async (id: string) => {
  const existingSupport = await Support.findById(id)

  if (!existingSupport) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket doesn't exist.")
  }

  if (existingSupport.status === supportStatus.RESOLVED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'The support ticket is already resolved.')
  }

  if (existingSupport.status === supportStatus.IN_PROGRESS) {
    throw new AppError(httpStatus.BAD_REQUEST, 'The support is already is in progress.')
  }

  const updatedSupport = await Support.findByIdAndUpdate(
    id,
    { status: supportStatus.IN_PROGRESS },
    { new: true }
  )

  return updatedSupport
}

// ?? Mark support as RESOLVED:
const markSupportResolved = async (id: string) => {
  const existingSupport = await Support.findById(id)

  if (!existingSupport) {
    throw new AppError(httpStatus.NOT_FOUND, "Support ticket doesn't exist.")
  }

  if (existingSupport.status === supportStatus.RESOLVED) {
    return existingSupport
  }

  // Check if at least one reply has been sent by the support admin
  const existingReply = await SupportReply.findOne({ supportId: existingSupport._id })

  if (!existingReply) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot resolve support ticket. A reply must be sent by the support team before resolving.'
    )
  }

  const updatedSupport = await Support.findByIdAndUpdate(
    id,
    { status: supportStatus.RESOLVED },
    { new: true }
  )

  return updatedSupport
}

export const supportServices = {
  createSupport,
  getAllSupport,
  SupportIssueReply,
  markSupportInProgress,
  markSupportResolved,
}
