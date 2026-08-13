import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { supporterServices } from './supporter.services'
import type {
  TGetAllSupporterQueryParamsType,
  TSendEmailToSupporterPayload,
} from './supporter.validations'
import { getUserFromRequest } from '../../libs/get-user-from-request'
import {
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

  const testEmail = user?.email
  // 1. Render Supporter Update Email
  const supporterHtml = await renderEmail(
    SupporterUpdateEmail({
      supporterName: 'Alex Doe',
      campaignTitle: 'Help Build the Community Center',
      message:
        '<p>Great news! We just hit <strong>50% of our goal</strong> thanks to amazing people like you.</p><p>We will be starting the foundation work next week. Stay tuned for more updates!</p>',
      logoUrl: configs.site.logo!,
    })
  )

  // 2. Render Signup OTP Email
  const signupHtml = await renderEmail(
    SignupOTPEmail({
      userFirstName: 'Alex',
      otpCode: '492015',
      companyName: 'Your Awesome Startup',
      companyLogo: configs.site.logo!,
    })
  )

  // 3. Render Reset Password OTP Email
  const resetHtml = await renderEmail(
    ResetPasswordOTPEmail({
      userFirstName: 'Alex',
      otpCode: '827364',
      userEmail: 'alex.doe@example.com',
      expirationMinutes: 10,
      companyName: 'Your Awesome Startup',
      companyLogo: configs.site.logo!,
    })
  )

  // 4. Render Welcome Email (New!)
  const welcomeHtml = await renderEmail(
    WelcomeEmail({
      firstName: 'Alex',
      companyName: 'Your Awesome Startup',
      productName: 'StartupPro Dashboard',
      password: 'TempPassword123!',
      actionUrl: 'https://example.com/login',
      logoSrc: configs.site.logo!,
      supportEmail: 'support@example.com',
    }) as any
  )

  // Fire all four emails concurrently
  await Promise.all([
    sendEmail({
      to: testEmail,
      subject: '🧪 TEST: Campaign Supporter Update',
      html: supporterHtml.html,
    }),
    sendEmail({
      to: testEmail,
      subject: '🧪 TEST: Verify your email',
      html: signupHtml.html,
    }),
    sendEmail({
      to: testEmail,
      subject: '🧪 TEST: Reset Your Password',
      html: resetHtml.html,
    }),
    sendEmail({
      to: testEmail,
      subject: '🧪 TEST: Welcome Aboard!',
      html: welcomeHtml.html,
    }),
  ])

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Email sent successfully!',
    data: null,
  })
})
export const supporterControllers = {
  getAllSupporter,
  getSupporterOverviewByCampaignId,
  sendEmailToSupporters,
  testEmail,
}
