export enum PaymentType {
  PRODUCT_PURCHASE = 'PRODUCT_PURCHASE',
  DONATION = 'DONATION',
  CAMPAIGN_LAUNCH_FEE = 'CAMPAIGN_LAUNCH_FEE',
}

interface CalculatePaymentBreakdownPayload {
  paymentType: PaymentType

  productPrice?: number
  shippingFee?: number

  donationAmount?: number

  campaignFee?: number

  platformFeePercent?: number

  stripeFee: number // Actual Stripe fee (from webhook or Stripe API)
}

export const calculatePaymentBreakdown = ({
  paymentType,

  productPrice = 0,
  shippingFee = 0,

  donationAmount = 0,

  campaignFee = 0,

  platformFeePercent = 6,

  stripeFee,
}: CalculatePaymentBreakdownPayload) => {
  let subtotal = 0
  let totalAmount = 0
  let platformFee = 0
  let organizerAmountWithoutShipping = 0
  let organizerNetAmount = 0
  let platformRevenue = 0

  switch (paymentType) {
    /**
     * Product Purchase
     */
    case PaymentType.PRODUCT_PURCHASE: {
      subtotal = productPrice
      totalAmount = productPrice + shippingFee

      // Platform commission only on product price
      platformFee = Number(((productPrice * platformFeePercent) / 100).toFixed(2))

      organizerAmountWithoutShipping = Number((productPrice - platformFee).toFixed(2))

      organizerNetAmount = Number((totalAmount - stripeFee - platformFee).toFixed(2))

      platformRevenue = platformFee

      break
    }

    /**
     * Donation
     */
    case PaymentType.DONATION: {
      subtotal = donationAmount
      totalAmount = donationAmount

      platformFee = Number(((donationAmount * platformFeePercent) / 100).toFixed(2))

      organizerAmountWithoutShipping = Number((donationAmount - platformFee).toFixed(2))

      organizerNetAmount = Number((donationAmount - stripeFee - platformFee).toFixed(2))

      platformRevenue = platformFee

      break
    }

    /**
     * Campaign Launch Fee
     */
    case PaymentType.CAMPAIGN_LAUNCH_FEE: {
      subtotal = campaignFee
      totalAmount = campaignFee

      platformRevenue = Number((campaignFee - stripeFee).toFixed(2))

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

      totalAmount,

      stripeFee,

      platformFee,

      organizerAmountWithoutShipping,

      organizerNetAmount,

      platformRevenue,
    },

    stripePayload: {
      amount_in_cents: Math.round(totalAmount * 100),

      application_fee_amount: Math.round(platformFee * 100),
    },
  }
}
