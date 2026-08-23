import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { supporterServices } from './supporter.services'
import type {
  TGetAllSupporterQueryParamsType,
  TSendEmailToSupporterPayload,
} from './supporter.validations'
import { getUserFromRequest } from '../../libs/get-user-from-request'
import {
  CampaignLiveEmail,
  renderEmail,
  ResetPasswordOTPEmail,
  SignupOTPEmail,
  SupporterUpdateEmail,
  WelcomeEmail,
} from 'packages/email-templates/src'
import { sendEmail } from 'packages/email-sender/src'
import configs from '@app/configs'

const getAllSupporter = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await supporterServices.getAllSupporter(
    user,
    req.query as TGetAllSupporterQueryParamsType
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getSupporterOverviewByCampaignId = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await supporterServices.getSupporterOverviewByCampaignId(
    user,
    req.query.campaignId as string
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The supporter overview retrieved successfully!',
    data: result,
  })
})
const sendEmailToSupporters = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await supporterServices.sendEmailToCampaignSupporters(
    user,
    req.body as TSendEmailToSupporterPayload
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Email sent successfully!',
    data: result,
  })
})

const testEmail = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const targetEmail = req.query.email
    ? String(req.query.email)
    : user?.email || 'tss.sta.gpt@gmail.com'

  const siteName = configs.site.name || 'FunRaisingIt'
  const siteLogo = configs.site.logo || undefined
  const supportEmail = configs.site.supportEmail || 'support@funraisingit.com'

  // 1. Render Supporter Update Email
  const supporterHtml = await renderEmail(
    SupporterUpdateEmail({
      supporterName: user?.name || 'Alex Doe',
      campaignTitle: 'Help Build the Community Center',
      message:
        '<p>Great news! We just hit <strong>50% of our goal</strong> thanks to amazing supporters like you.</p><p>We will be starting the foundation work next week. Stay tuned for more updates!</p>',
      logoUrl: siteLogo,
      companyName: siteName,
      supportEmail,
    })
  )

  // 2. Render Signup OTP Email
  const signupHtml = await renderEmail(
    SignupOTPEmail({
      userFirstName: user?.name || 'Alex',
      otpCode: '492015',
      companyName: siteName,
      companyLogo: siteLogo!,
      supportEmail,
      expirationMinutes: configs.otpSettings.expiresIn,
    })
  )

  // 3. Render Reset Password OTP Email
  const resetHtml = await renderEmail(
    ResetPasswordOTPEmail({
      userFirstName: user?.name || 'Alex',
      otpCode: '827364',
      userEmail: targetEmail,
      expirationMinutes: configs.otpSettings.expiresIn,
      companyName: siteName,
      companyLogo: siteLogo,
      supportEmail,
    })
  )

  // 4. Render Welcome Email
  const welcomeHtml = await renderEmail(
    WelcomeEmail({
      firstName: user?.name || 'Alex',
      companyName: siteName,
      productName: siteName,
      password: 'TempPassword123!',
      actionUrl: `${configs.site.clientUrl}/login`,
      logoSrc: siteLogo,
      supportEmail,
    })
  )

  const htmlTemplate = await renderEmail(
    CampaignLiveEmail({
      organizerName: 'Mostafizur Rahaman',
      campaignName: 'Gen Z',
      campaignCode: 'CMP_34343343', // 👈 Just pass the code here
      companyLogo: configs.site.logo as string,
    })
  )

  await sendEmail({
    to: targetEmail,
    subject: '🎉 YOUR CAMPAIGN IS LIVE!',
    html: htmlTemplate.html,
    text: htmlTemplate.text,
  })

  // Send emails with clean subject lines, sender display names, and multipart (HTML + Plain Text)
  await Promise.all([
    sendEmail({
      to: targetEmail,
      fromName: siteName,
      replyTo: supportEmail,
      subject: `${siteName} - Campaign Supporter Update`,
      html: supporterHtml.html,
      text: supporterHtml.text,
    }),
    sendEmail({
      to: targetEmail,
      fromName: siteName,
      replyTo: supportEmail,
      subject: `${siteName} - Verification Code: 492015`,
      html: signupHtml.html,
      text: signupHtml.text,
    }),
    sendEmail({
      to: targetEmail,
      fromName: siteName,
      replyTo: supportEmail,
      subject: `${siteName} - Password Reset Code: 827364`,
      html: resetHtml.html,
      text: resetHtml.text,
    }),
    sendEmail({
      to: targetEmail,
      fromName: siteName,
      replyTo: supportEmail,
      subject: `Welcome to ${siteName}!`,
      html: welcomeHtml.html,
      text: welcomeHtml.text,
    }),
  ])

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Test emails sent successfully!',
    data: {
      sentTo: targetEmail,
      siteName,
    },
  })
})
export const supporterControllers = {
  getAllSupporter,
  getSupporterOverviewByCampaignId,
  sendEmailToSupporters,
  testEmail,
}
