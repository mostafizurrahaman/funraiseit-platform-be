import configs from '@app/configs';
import { paymentType, type TPaymentType } from 'packages/db/src'

interface CalculatePaymentBreakdownPayload {
  paymentType: TPaymentType
  gstAmount?: number;
  productPrice?: number
  shippingFee?: number
  donationAmount?: number
  campaignFee?: number

  platformFeePercent?: number

  stripePercentageFee?: number // e.g. 2.9
  stripeFixedFee?: number // e.g. 0.30

  organizerAmountWithoutShipping?: number;
  organizerRaisedAmount?: number;
}

const round = (value: number) => Number(value.toFixed(2))

const calculateStripeFee = (
  amountBeforeStripe: number,
  percentageFee: number,
  fixedFee: number
) => {

  if (amountBeforeStripe <= 0) {
     return {
       grossAmount: 0 , stripeFee: 0 
      }
  }

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
  gstAmount = 0,

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
  let finalGstAmount = 0;

  let platformFee = 0
  let grossAmount = 0
  let stripeFee = 0

  let organizerNetAmount = 0
  let organizerAmountWithoutShipping = 0;
  let organizerRaisedAmount = 0;
  let platformRevenue = 0
  


  const isGstApplied =  gstAmount > 0 



  switch (newPType) {
    /**
     * ORDER
     */
    case paymentType.ORDER: {
      subtotal = productPrice
      finalGstAmount = gstAmount

      amountBeforeStripe = productPrice + shippingFee + finalGstAmount

     const fixedFee = isGstApplied ? configs.stripe.fixedFeeWithTaxFee : stripeFixedFee; 

     const stripeCalc = calculateStripeFee(amountBeforeStripe, stripePercentageFee, fixedFee)

      // Customer pays exactly this amount
      grossAmount = stripeCalc.grossAmount

      stripeFee = stripeCalc.stripeFee

      platformFee = round((productPrice * platformFeePercent) / 100)

     

      organizerNetAmount = round(amountBeforeStripe - platformFee)

      organizerAmountWithoutShipping = round(productPrice + finalGstAmount - platformFee);
      organizerRaisedAmount = round(productPrice - platformFee);

      platformRevenue = platformFee

      break
    }

    /**
     * DONATION
     */
    case paymentType.DONATION: {
      subtotal = donationAmount

      finalGstAmount = 0

      amountBeforeStripe = donationAmount

      const stripeCalc =  calculateStripeFee(amountBeforeStripe, stripePercentageFee, stripeFixedFee)

      // Customer pays exactly the donation amount
      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformFee = round((donationAmount * platformFeePercent) / 100)


      organizerNetAmount = round(donationAmount - platformFee)
      organizerAmountWithoutShipping = organizerNetAmount;
      organizerRaisedAmount = round(donationAmount - platformFee);

      platformRevenue = platformFee

      break
    } 

    /**
     * LAUNCH FEE
     */
    case paymentType.LAUNCH_FEE: {
      subtotal = campaignFee
      finalGstAmount = 0

      

      amountBeforeStripe = campaignFee

      const stripeCalc = calculateStripeFee(
        amountBeforeStripe,
        stripePercentageFee,
        stripeFixedFee
      )

      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformRevenue = round(campaignFee)

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
      grossAmount,
      gstAmount: finalGstAmount,
      stripeFee,
      platformFee,
      organizerNetAmount,
      organizerAmountWithoutShipping,
      organizerRaisedAmount,
      platformRevenue,
    },
    stripePayload: {
      amount: Math.round(grossAmount * 100),
      application_fee_amount: Math.round((platformFee + stripeFee) * 100),
    },
  }
}
