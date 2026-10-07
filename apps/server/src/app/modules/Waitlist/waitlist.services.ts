import {
  Waitlist,
  waitlistSearchableFields,
  waitlistStatus,
  type IWaitlistDoc,
} from '@repo/db'
import type {
  TClaimVipPayload,
  TExportWaitlistQuery,
  TGetAllWaitlistQuery,
  TSkipVipPayload,
  TSubmitEmailPayload,
} from './waitlist.validations'
import type { PipelineStage } from 'mongoose'
import moment from 'moment'
import ExcelJS from 'exceljs'
import { normalizePhoneNumber, sendSms } from '@app/libs/send-sms'
import configs from '@app/configs'
import { logger } from '@app/libs/logger'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { sendEmail } from '@repo/email-sender'
import {
  renderEmail,
  WaitlistWelcomeEmail,
  WaitlistAdminNotificationEmail,
} from '@repo/email-templates'

const sendWaitlistWelcomeEmailAsync = async (
  email: string,
  formattedMemberNumber: string,
  isVip: boolean = false
) => {
  try {
    const siteName = configs.site.name || 'FunRaisingIt'
    const supportEmail = configs.site.supportEmail || 'support@funraisingit.com'
    const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

    const htmlTemplate = await renderEmail(
      WaitlistWelcomeEmail({
        email,
        memberNumber: formattedMemberNumber,
        isVip,
        companyName: siteName,
        companyLogo: (configs.site.logo as string) || undefined,
        supportEmail,
        clientUrl,
      })
    )

    // Deliverability-optimized subject lines: clear, transactional, free of spam-trigger keywords & emojis
    const subject = isVip
      ? `VIP Priority Access Confirmed: ${siteName} (#${formattedMemberNumber})`
      : `Waitlist Confirmation: ${siteName} (#${formattedMemberNumber})`

    // High deliverability plain text alternative
    const plainTextFallback = [
      `Hello,`,
      ``,
      `Your reservation on the ${siteName} waitlist has been successfully confirmed for ${email}.`,
      ``,
      isVip
        ? `Status: VIP Priority Member (${formattedMemberNumber})`
        : `Status: Waitlist Member (${formattedMemberNumber})`,
      ``,
      `You have secured ${isVip ? 'complimentary VIP Priority Early Access' : 'standard early access for our public launch'}.`,
      ``,
      `Visit: ${clientUrl}`,
      `Questions? Contact ${supportEmail}`,
      ``,
      `---`,
      `You received this email because ${email} registered for early access updates on ${clientUrl}.`,
      `To unsubscribe or be removed, reply to this email with "Unsubscribe".`,
      `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
    ].join('\n')

    await sendEmail({
      to: email,
      subject,
      html: htmlTemplate.html,
      text: htmlTemplate.text && htmlTemplate.text.trim().length > 20 ? htmlTemplate.text : plainTextFallback,
      fromName: siteName,
      replyTo: supportEmail,
      headers: {
        'List-Unsubscribe': `<mailto:${supportEmail}?subject=Unsubscribe%20Waitlist>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Auto-Response-Suppress': 'All, OOF, AutoReply',
        'Precedence': 'bulk',
        'Feedback-ID': `${isVip ? 'vip' : 'waitlist'}:funraisingit:signup`,
        'X-Report-Abuse': `Please report abuse to ${supportEmail}`,
      },
    })
  } catch (error) {
    logger.error(`Failed to send waitlist welcome email to ${email}:`, error)
  }
}

const sendWaitlistAdminNotificationEmailAsync = async (params: {
  userEmail: string
  memberNumber: string
  phoneNumber?: string
  status?: string
  isVip?: boolean
  actionType?: 'SIGNUP' | 'VIP_UPGRADE'
}) => {
  try {
    const adminEmail = configs.superAdmin.email
    if (!adminEmail) return

    const siteName = configs.site.name || 'FunRaisingIt'
    const htmlTemplate = await renderEmail(
      WaitlistAdminNotificationEmail({
        userEmail: params.userEmail,
        memberNumber: params.memberNumber,
        phoneNumber: params.phoneNumber,
        status: params.status || 'REGISTERED',
        isVip: params.isVip || false,
        actionType: params.actionType || 'SIGNUP',
        registeredAt: moment().format('MMMM Do YYYY, h:mm:ss a'),
        companyName: siteName,
        companyLogo: (configs.site.logo as string) || undefined,
        adminDashboardUrl: `${configs.site.clientUrl}/admin`,
      })
    )

    await sendEmail({
      to: adminEmail,
      subject: params.isVip
        ? `[Admin Alert] VIP Priority Upgrade: ${params.userEmail} (Member ${params.memberNumber})`
        : `[Admin Alert] New Waitlist Signup: ${params.userEmail} (Member ${params.memberNumber})`,
      html: htmlTemplate.html,
      text: htmlTemplate.text,
      fromName: `${siteName} System`,
      replyTo: configs.site.supportEmail || adminEmail,
      headers: {
        'X-Auto-Response-Suppress': 'All, OOF, AutoReply',
        'Auto-Submitted': 'auto-generated',
        'Precedence': 'bulk',
      },
    })
  } catch (error) {
    logger.error('Failed to send waitlist admin notification email:', error)
  }
}

const submitEmail = async (payload: TSubmitEmailPayload) => {
  const email = payload.email.trim().toLowerCase()

  const existingWaitlist = await Waitlist.findOne({ email })

  if (existingWaitlist) {
    return {
      isNew: false,
      waitlist: existingWaitlist,
      message: existingWaitlist.isVip
        ? `You are already registered as VIP Member ${existingWaitlist.formattedMemberNumber}!`
        : `Welcome back! You are on the waitlist as Member ${existingWaitlist.formattedMemberNumber}.`,
    }
  }

  const { memberNumber, formattedMemberNumber } = await Waitlist.getNextMemberNumber()

  const newWaitlist = await Waitlist.create({
    email,
    status: waitlistStatus.REGISTERED,
    memberNumber,
    formattedMemberNumber,
    isVip: false,
  })

  // Send congratulations email to user asynchronously
  sendWaitlistWelcomeEmailAsync(email, formattedMemberNumber, false).catch((err) => {
    logger.error('Error sending waitlist welcome email:', err)
  })

  // Send new signup alert to admin asynchronously
  sendWaitlistAdminNotificationEmailAsync({
    userEmail: email,
    memberNumber: formattedMemberNumber,
    status: waitlistStatus.REGISTERED,
    isVip: false,
    actionType: 'SIGNUP',
  }).catch((err) => {
    logger.error('Error sending waitlist admin notification:', err)
  })

  return {
    isNew: true,
    waitlist: newWaitlist,
    message: 'Successfully joined the waitlist!',
  }
}

const claimVip = async (payload: TClaimVipPayload) => {
  const email = payload.email.trim().toLowerCase()
  const rawPhone = payload.phoneNumber.trim()
  const normalizedPhone = normalizePhoneNumber(payload.phoneNumber) || rawPhone

  // 1. Check if phone number is already registered to another email
  const existingPhoneEntry = await Waitlist.findOne({
    email: { $ne: email },
    $or: [{ phoneNumber: normalizedPhone }, { phoneNumber: rawPhone }],
  })

  if (existingPhoneEntry) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This phone number is already registered with another VIP member. Please provide a different phone number.'
    )
  }

  let waitlist = await Waitlist.findOne({ email })

  // 2. If already claimed VIP with this exact phone number
  if (waitlist && waitlist.isVip && waitlist.phoneNumber === normalizedPhone) {
    return {
      waitlist,
      message: `You've already claimed VIP Early Access as Member ${waitlist.formattedMemberNumber}.`,
    }
  }

  const isUpgrading = !!waitlist && !waitlist.isVip

  if (!waitlist) {
    const { memberNumber, formattedMemberNumber } = await Waitlist.getNextMemberNumber()
    waitlist = await Waitlist.create({
      email,
      phoneNumber: normalizedPhone,
      status: waitlistStatus.VIP,
      memberNumber,
      formattedMemberNumber,
      isVip: true,
      vipClaimedAt: new Date(),
    })
  } else {
    waitlist.phoneNumber = normalizedPhone
    waitlist.status = waitlistStatus.VIP
    waitlist.isVip = true
    waitlist.vipClaimedAt = new Date()
    await waitlist.save()
  }

  // Send confirmation SMS asynchronously
  if (normalizedPhone) {
    const siteName = configs.site.name || 'FunRaisingIt'
    const smsMessage = `🎉 Congratulations! You are officially VIP Member ${waitlist.formattedMemberNumber} on ${siteName}! You will receive exclusive early access, special perks, and launch updates.`

    sendSms(normalizedPhone, smsMessage).catch((error) => {
      logger.error('Failed to send VIP welcome SMS:', error)
    })
  }

  // Send VIP congratulations email to user asynchronously
  sendWaitlistWelcomeEmailAsync(email, waitlist.formattedMemberNumber, true).catch((err) => {
    logger.error('Error sending VIP welcome email:', err)
  })

  // Send VIP alert to admin asynchronously
  sendWaitlistAdminNotificationEmailAsync({
    userEmail: email,
    memberNumber: waitlist.formattedMemberNumber,
    phoneNumber: normalizedPhone,
    status: waitlistStatus.VIP,
    isVip: true,
    actionType: 'VIP_UPGRADE',
  }).catch((err) => {
    logger.error('Error sending VIP upgrade admin notification:', err)
  })

  return {
    waitlist,
    message: isUpgrading
      ? `Congratulations! You've upgraded to VIP Early Access as Member ${waitlist.formattedMemberNumber}.`
      : `Congratulations! You've claimed VIP Early Access as Member ${waitlist.formattedMemberNumber}.`,
  }
}

const skipVip = async (payload: TSkipVipPayload) => {
  const email = payload.email.trim().toLowerCase()

  let waitlist = await Waitlist.findOne({ email })

  if (!waitlist) {
    const { memberNumber, formattedMemberNumber } = await Waitlist.getNextMemberNumber()
    waitlist = await Waitlist.create({
      email,
      status: waitlistStatus.SKIPPED_VIP,
      memberNumber,
      formattedMemberNumber,
      isVip: false,
      vipSkippedAt: new Date(),
    })
  } else if (!waitlist.isVip) {
    waitlist.status = waitlistStatus.SKIPPED_VIP
    waitlist.vipSkippedAt = new Date()
    await waitlist.save()
  }

  return {
    waitlist,
    message: waitlist.isVip
      ? `You are already VIP Member ${waitlist.formattedMemberNumber}.`
      : `You are confirmed on the waitlist as Member ${waitlist.formattedMemberNumber}.`,
  }
}

interface IWaitlistFilterOptions {
  searchTerm?: string | undefined
  status?: string | undefined
  isVip?: boolean | string | undefined
  fromDate?: string | Date | undefined
  toDate?: string | Date | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

const buildWaitlistFilterAndSort = (query: IWaitlistFilterOptions) => {
  const {
    searchTerm,
    status,
    isVip,
    fromDate,
    toDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query

  const pipeline: PipelineStage[] = []
  const matchConditions: Record<string, unknown> = {}

  if (status) {
    matchConditions.status = status
  }

  if (isVip !== undefined && isVip !== null) {
    if (isVip === true || isVip === 'true') {
      matchConditions.isVip = true
    } else if (isVip === false || isVip === 'false') {
      matchConditions.isVip = false
    }
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)
    matchConditions.createdAt = dateFilter
  }

  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions })
  }

  if (searchTerm && searchTerm.trim()) {
    const searchRegex = { $regex: searchTerm.trim(), $options: 'i' }
    pipeline.push({
      $match: {
        $or: waitlistSearchableFields.map((field) => ({
          [field]: searchRegex,
        })),
      },
    })
  }

  const validSortOrder: 1 | -1 = sortOrder === 'asc' ? 1 : -1
  const validSortBy = sortBy || 'createdAt'
  const sortStage: PipelineStage = { $sort: { [validSortBy]: validSortOrder } }

  return { matchConditions, pipeline, sortStage }
}

const getAllWaitlist = async (query: TGetAllWaitlistQuery) => {
  const {
    page = 1,
    limit = 10,
    skipPagination,
  } = query

  const pageNumber = Math.max(1, Number(page) || 1)
  const limitNumber = Math.max(1, Number(limit) || 10)
  const skip = (pageNumber - 1) * limitNumber

  const { pipeline, sortStage } = buildWaitlistFilterAndSort(query)

  pipeline.push(sortStage)

  const isSkipPagination =
    skipPagination === true || (typeof skipPagination === 'string' && skipPagination === 'true')

  const paginationStage: PipelineStage.FacetPipelineStage[] = []

  if (!isSkipPagination) {
    paginationStage.push({ $skip: skip }, { $limit: limitNumber })
  }

  pipeline.push({
    $facet: {
      data: paginationStage,
      meta: [{ $count: 'total' }],
      filteredVip: [{ $match: { isVip: true } }, { $count: 'total' }],
      filteredStandard: [{ $match: { isVip: false } }, { $count: 'total' }],
    },
  })

  const [aggregated, totalOverallWaitlist, totalOverallVip] = await Promise.all([
    Waitlist.aggregate(pipeline),
    Waitlist.countDocuments(),
    Waitlist.countDocuments({ isVip: true }),
  ])

  const data = (aggregated?.[0]?.data as IWaitlistDoc[]) || []
  const total = (aggregated?.[0]?.meta?.[0]?.total as number) || 0
  const filteredVip = (aggregated?.[0]?.filteredVip?.[0]?.total as number) || 0
  const filteredStandard = (aggregated?.[0]?.filteredStandard?.[0]?.total as number) || 0

  return {
    data,
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: isSkipPagination ? 1 : Math.ceil(total / limitNumber) || 1,
      totalVip: totalOverallVip,
      totalStandard: Math.max(0, totalOverallWaitlist - totalOverallVip),
      filteredVip,
      filteredStandard,
    },
  }
}

const escapeCsvField = (val: unknown): string => {
  if (val === null || val === undefined) return ''
  let str = String(val).trim()
  // Prevent CSV / Excel formula injection (starting with =, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const exportWaitlistCsv = async (query: TExportWaitlistQuery) => {
  const { pipeline, sortStage } = buildWaitlistFilterAndSort(query)

  pipeline.push(sortStage)

  pipeline.push({
    $project: {
      _id: 1,
      memberNumber: 1,
      formattedMemberNumber: 1,
      email: 1,
      phoneNumber: 1,
      isVip: 1,
      status: 1,
      vipClaimedAt: 1,
      vipSkippedAt: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  })

  const records = (await Waitlist.aggregate(pipeline)) as IWaitlistDoc[]

  const headers = [
    'Member ID',
    'Member Number',
    'Email',
    'Phone Number',
    'VIP Status',
    'Status',
    'Joined Date',
    'VIP Claimed Date',
    'VIP Skipped Date',
  ]

  const rows = records.map((record) => {
    return [
      escapeCsvField(record.formattedMemberNumber || `#${record.memberNumber}`),
      escapeCsvField(record.memberNumber),
      escapeCsvField(record.email),
      escapeCsvField(record.phoneNumber || 'N/A'),
      escapeCsvField(record.isVip ? 'VIP' : 'Standard'),
      escapeCsvField(record.status),
      escapeCsvField(record.createdAt ? moment(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
      escapeCsvField(record.vipClaimedAt ? moment(record.vipClaimedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
      escapeCsvField(record.vipSkippedAt ? moment(record.vipSkippedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
    ].join(',')
  })

  // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel opens it without character distortion
  const csvContent = '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n')

  const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
  const filename = `waitlist_export_${timestamp}.csv`

  return {
    csvContent,
    filename,
    records,
    count: records.length,
  }
}

const exportWaitlistExcel = async (query: TExportWaitlistQuery) => {
  const { pipeline, sortStage } = buildWaitlistFilterAndSort(query)

  pipeline.push(sortStage)

  pipeline.push({
    $project: {
      _id: 1,
      memberNumber: 1,
      formattedMemberNumber: 1,
      email: 1,
      phoneNumber: 1,
      isVip: 1,
      status: 1,
      vipClaimedAt: 1,
      vipSkippedAt: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  })

  const records = (await Waitlist.aggregate(pipeline)) as IWaitlistDoc[]

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FunRaisingIt Admin'
  workbook.lastModifiedBy = 'FunRaisingIt Admin'
  workbook.created = new Date()
  workbook.modified = new Date()

  const worksheet = workbook.addWorksheet('Waitlist Members', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = [
    { header: 'Member #', key: 'formattedMemberNumber', width: 14 },
    { header: 'Member Number', key: 'memberNumber', width: 18 },
    { header: 'Email Address', key: 'email', width: 34 },
    { header: 'Phone Number', key: 'phoneNumber', width: 22 },
    { header: 'Access Tier', key: 'tier', width: 18 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Joined Date', key: 'createdAt', width: 24 },
    { header: 'VIP Claimed Date', key: 'vipClaimedAt', width: 24 },
    { header: 'VIP Skipped Date', key: 'vipSkippedAt', width: 24 },
  ]

  // Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1)
  headerRow.height = 30
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF041533' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }
  })

  // Add Records
  records.forEach((record, index) => {
    const row = worksheet.addRow({
      formattedMemberNumber: record.formattedMemberNumber || `#${record.memberNumber}`,
      memberNumber: record.memberNumber,
      email: record.email,
      phoneNumber: record.phoneNumber || 'N/A',
      tier: record.isVip ? 'VIP Access' : 'Standard',
      status: record.status.toUpperCase(),
      createdAt: record.createdAt ? moment(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
      vipClaimedAt: record.vipClaimedAt ? moment(record.vipClaimedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
      vipSkippedAt: record.vipSkippedAt ? moment(record.vipSkippedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
    })

    row.height = 24
    row.alignment = { vertical: 'middle' }

    // Alternate Row Shading
    const isEven = index % 2 === 0
    const fillColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB'

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }

      // Center numeric and status columns
      if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })

    // VIP styling for Tier cell (col 5)
    if (record.isVip) {
      const tierCell = row.getCell(5)
      tierCell.font = { bold: true, color: { argb: 'FFB45309' } }
      tierCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
  const filename = `waitlist_export_${timestamp}.xlsx`

  return {
    buffer: Buffer.from(buffer),
    filename,
    records,
    count: records.length,
  }
}

export const waitlistServices = {
  submitEmail,
  claimVip,
  skipVip,
  getAllWaitlist,
  exportWaitlistCsv,
  exportWaitlistExcel,
}
