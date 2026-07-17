import { Account, accountStatus, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import { createStripeAccount, regenerateConnectedAccountLink } from '@app/libs/stripe'

const connectStripeAccount = async (user: IUser) => {
  const existingAccount = await Account.findOne({
    user: user._id,
  })

  if (existingAccount) {
    if (existingAccount.status === accountStatus.ACTIVE) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You already have an active connected account.')
    }

    const url = await regenerateConnectedAccountLink(existingAccount.account)

    return { url }
  }

  const stripeAccount = await createStripeAccount(user)

  await Account.create({
    account: stripeAccount.id,
    country: stripeAccount.country!,
    currency: stripeAccount.default_currency!,
    user: user._id,
    detailsSubmitted: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    status: accountStatus.PENDING,
  })

  const url = await regenerateConnectedAccountLink(stripeAccount.id)

  return { url }
}

const getAccountById = async (user: IUser) => {
  const result = await Account.findOne({
    user: user?._id,
  })

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Account not found')
  }

  return result
}

export const accountServices = {
  connectStripeAccount,
  getAccountById,
}
