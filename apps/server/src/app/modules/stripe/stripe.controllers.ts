import httpStatus from 'http-status'
import { catchAsync, sendResponse } from '@repo/shared'
import { verifyWebHookSignature } from '@app/libs/stripe'
import configs from '@app/configs'
import { stripeServices } from './stripe.services'

const handleStripeWebhookForPlatform = catchAsync(async (req, res) => {
  //   Extract event from the header:
  const event = verifyWebHookSignature(configs.stripe.webhookPlatformKey, req)

  await stripeServices.listenStripeEventsForPlatformAccount(event)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Webhook triggered successfully!',
    data: null,
  })
})

const handleStripeWebhookForConnectedAccount = catchAsync(async (req, res) => {
  //   Extract event from the header:
  const event = verifyWebHookSignature(configs.stripe.webhookPlatformKey, req)

  await stripeServices.listenStripeEventsForConnectedAccount(event)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Webhook triggered successfully!',
    data: null,
  })
})

export const stripeController = {
  handleStripeWebhookForPlatform,
  handleStripeWebhookForConnectedAccount,
}
