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

      // Customer pays exactly this amount
      grossAmount = amountBeforeStripe

      platformFee = round((productPrice * platformFeePercent) / 100)

      stripeFee = round(grossAmount * (stripePercentageFee / 100) + stripeFixedFee)

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

      // Customer pays exactly the donation amount
      grossAmount = donationAmount

      platformFee = round((donationAmount * platformFeePercent) / 100)

      stripeFee = round(grossAmount * (stripePercentageFee / 100) + stripeFixedFee)

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

      // Customer pays exactly the launch fee
      grossAmount = campaignFee

      stripeFee = round(grossAmount * (stripePercentageFee / 100) + stripeFixedFee)

      platformRevenue = round(campaignFee - stripeFee)

      break
    }

    default:
      throw new Error('Invalid payment type')
  }

  return {
    databaseRecord: {
      paymentType: newPType,

      subtotal,

      shippingFee,

      amountBeforeStripe,

      grossAmount, // Amount customer pays

      stripeFee,

      platformFee,

      organizerNetAmount,

      platformRevenue,
    },

    stripePayload: {
      // Stripe Checkout amount
      amount: Math.round(grossAmount * 100),

      // Platform fee collected through Stripe Connect
      application_fee_amount: Math.round(platformFee * 100),
    },
  }
}
