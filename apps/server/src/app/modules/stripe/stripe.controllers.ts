import httpStatus from 'http-status'
import { catchAsync, sendResponse } from '@repo/shared'
import { verifyWebHookSignature } from '@app/libs/stripe'
import configs from '@app/configs'
import { stripeServices } from './stripe.services'

const handleStripeWebhook = catchAsync(async (req, res) => {
  //   Extract event from the header:
  const event = verifyWebHookSignature(configs.stripe.webhookKey, req)

  await stripeServices.listenStripeEvents(event)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Webhook triggered successfully!',
    data: null,
  })
})

export const stripeController = {
  handleStripeWebhook,
}
