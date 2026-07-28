import { paymentType, type TPaymentType } from 'packages/db/src'

interface CalculatePaymentBreakdownPayload {
  paymentType: TPaymentType

  productPrice?: number
  shippingFee?: number
  donationAmount?: number
  campaignFee?: number

  platformFeePercent?: number

  stripePercentageFee?: number // e.g. 2.9
  stripeFixedFee?: number // e.g. 0.30
}

const round = (value: number) => Number(value.toFixed(2))

const calculateStripeFee = (
  amountBeforeStripe: number,
  percentageFee: number,
  fixedFee: number
) => {
  const rate = percentageFee / 100

  // Customer pays this amount
  const grossAmount = round((amountBeforeStripe + fixedFee) / (1 - rate))

  const stripeFee = round(grossAmount - amountBeforeStripe)

  return {
    grossAmount,
    stripeFee,
  }
}

export const calculatePaymentBreakdown = ({
  paymentType: newPType,

  productPrice = 0,
  shippingFee = 0,
  donationAmount = 0,
  campaignFee = 0,

  platformFeePercent = 6,

  stripePercentageFee = 2.9,
  stripeFixedFee = 0.3,
}: CalculatePaymentBreakdownPayload) => {
  let subtotal = 0

  let amountBeforeStripe = 0

  let platformFee = 0

  let grossAmount = 0

  let stripeFee = 0

  let organizerNetAmount = 0

  let platformRevenue = 0

  switch (newPType) {
    /**
     * ORDER
     */
    case paymentType.ORDER: {
      subtotal = productPrice

      amountBeforeStripe = productPrice + shippingFee

      platformFee = round((productPrice * platformFeePercent) / 100)

      const stripe = calculateStripeFee(amountBeforeStripe, stripePercentageFee, stripeFixedFee)

      grossAmount = stripe.grossAmount
      stripeFee = stripe.stripeFee

      organizerNetAmount = round(amountBeforeStripe - platformFee - stripeFee)

      platformRevenue = platformFee

      break
    }

    /**
     * DONATION
     */
    case paymentType.DONATION: {
      subtotal = donationAmount

      amountBeforeStripe = donationAmount

      platformFee = round((donationAmount * platformFeePercent) / 100)

      const stripe = calculateStripeFee(amountBeforeStripe, stripePercentageFee, stripeFixedFee)

      grossAmount = stripe.grossAmount
      stripeFee = stripe.stripeFee

      organizerNetAmount = round(donationAmount - platformFee - stripeFee)

      platformRevenue = platformFee

      break
    }

    /**
     * LAUNCH FEE
     */
    case paymentType.LAUNCH_FEE: {
      subtotal = campaignFee

      amountBeforeStripe = campaignFee

      const stripe = calculateStripeFee(campaignFee, stripePercentageFee, stripeFixedFee)

      grossAmount = stripe.grossAmount
      stripeFee = stripe.stripeFee

      platformRevenue = round(campaignFee - stripeFee)

      break
    }

    default:
      throw new Error('Invalid payment type')
  }

  return {
    databaseRecord: {
      paymentType,

      subtotal,

      shippingFee,

      amountBeforeStripe,

      grossAmount, // Customer pays this

      stripeFee,

      platformFee,

      organizerNetAmount,

      platformRevenue,
    },

    stripePayload: {
      amount: Math.round(grossAmount * 100),

      application_fee_amount: Math.round(platformFee * 100),
    },
  }
}
