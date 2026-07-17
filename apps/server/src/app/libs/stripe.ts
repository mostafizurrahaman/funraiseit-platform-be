import configs from '@app/configs'
import type { IUser } from '@repo/db'
import Stripe from 'stripe'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'
import type { Request } from 'express'

// ? Stripe configured:
export const stripe = new Stripe(configs.stripe.secretKey, {
  apiVersion: '2026-06-24.dahlia',
})

// ? Create a new account :
export const createStripeAccount = async (user: IUser, metadata?: Record<string, unknown>) => {
  return stripe.account.create({
    type: 'express',
    email: user.email,
    country: 'US',
    default_currency: 'usd',
    business_type: 'individual',
    business_profile: {
      name: user.name,
      support_email: user?.email,
      support_phone: user.phoneNumber!,
    },
    metadata: {
      ...(metadata && { ...metadata }),
      email: user.email,
      userId: user?._id?.toString(),
    },
    capabilities: {
      card_payments: {
        requested: true,
      },
      transfers: {
        requested: true,
      },
    },
    settings: {
      payments: {
        statement_descriptor: configs.site.name,
      },
      payouts: {
        schedule: {
          interval: 'manual',
        },
      },
    },
  })
}

// ? Regenerate ACCOUNT LINK:
export const regenerateConnectedAccountLink = async (account: string) => {
  const result = await stripe.accountLinks.create({
    account,
    refresh_url: configs.stripe.refresh_url!,
    return_url: configs.stripe.return_url!,
    type: 'account_onboarding',
  })

  return result.url
}

// ? Retrieved the account:
export const retrievedStripeAccount = async (stripeAccountId: string) => {
  const result = await stripe.account.retrieve(stripeAccountId)

  return result
}

// ? Verify webhook:
export const verifyWebHookSignature = (secretKey: string, req: Request): Stripe.Event => {
  if (!secretKey) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Webhook secret is required!')
  }
  const signature = req.headers['stripe-signature'] as string

  const event = stripe.webhooks.constructEvent(req.body, signature, configs.stripe.webhookKey)

  return event
}
