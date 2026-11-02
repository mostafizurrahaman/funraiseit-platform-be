# Implementation Guide: Customer-Paid Transaction Fees & Order-Only GST (Sales Tax)

This document provides a comprehensive, step-by-step breakdown of every file, model, service, and webhook handler that needs modification across the codebase.

---

## 1. Business Logic & Mathematical Rules

1. **Transaction Fee (Stripe Fee):** Always paid by the payer/client in all scenarios (`ORDER`, `DONATION`, `LAUNCH_FEE`, `BRAND_BUILDER`).
   - **Gross-up Formula:**
     $$\text{Gross Amount} = \frac{\text{Amount Before Stripe} + 0.30}{1 - 0.029}$$
     $$\text{Stripe Fee} = \text{Gross Amount} - \text{Amount Before Stripe}$$
2. **GST / Sales Tax:** Applies **ONLY** to `ORDER` on the product price (not shipping, and not on donations, launch fees, or brand builder fees).
   $$\text{gstAmount} = \text{round}\left(\frac{\text{productPrice} \times \text{taxRate}}{100}\right)$$
3. **Stripe Connect Destination Charges (`ORDER` & `DONATION`):**
   - In Stripe Destination charges (`transfer_data.destination`), Stripe deducts the processing fee from the platform's `application_fee_amount`.
   - To ensure the platform's commission remains intact and the organizer receives their full net amount:
     $$\text{application\_fee\_amount} = \text{platformFee} + \text{stripeFee}$$
   - Payout to Organizer: $\text{Gross Amount} - \text{application\_fee\_amount} = \text{Amount Before Stripe} - \text{platformFee}$ (Organizer does NOT pay Stripe fee).

---

## 2. Master File Modification Checklist

| # | File Path | Scope of Change |
|---|---|---|
| **1** | `packages/db/.../Payment/payment.interfaces.ts` | Add `gstAmount` to `IPaymentBreakdown` interface |
| **2** | `packages/db/.../Payment/payment.model.ts` | Add `gstAmount` to `PaymentBreakDownSchema` |
| **3** | `packages/db/.../Order/order.interfaces.ts` & `order.model.ts` | Add `gstAmount` / `taxAmount` and `stripeFee` to `Order` |
| **4** | `packages/db/.../SiteInfo/site-info.interfaces.ts` & `site-info.model.ts` | Add `orderTaxRate` (default 0 or e.g. 10) to `SiteInfo` |
| **5** | `apps/server/src/app/libs/get-stripe-fee-breakdown.ts` | Core engine: Gross-up all 4 types; compute application fee |
| **6** | `apps/server/src/app/modules/Order/order.services.ts` | Pass calculated `gstAmount` to breakdown, save on Order |
| **7** | `apps/server/src/app/modules/Donation/donation.services.ts` | Use updated breakdown with grossed-up application fee |
| **8** | `apps/server/src/app/modules/Campaign/campaign.services.ts` | Gross-up Launch Fee so organizer pays Stripe fee |
| **9** | `apps/server/src/app/modules/BrandBuilder/brand-builder.services.ts` | Gross-up Brand Builder Fee so organizer pays Stripe fee |
| **10** | `apps/server/src/app/modules/stripe/stripe.utils.ts` | **Critical Webhook Fixes**: Fix double-subtraction bug; save `gstAmount` |
| **11** | `funraisingit-fe/...` | Show transparent checkout itemization (Subtotal, Tax, Shipping, Processing Fee, Total) |

---

## 3. Detailed File-by-File Changes

### File 1 & 2: Database Schemas (`packages/db`)

#### A. `packages/db/src/apps/modules/Payment/payment.interfaces.ts` & `payment.model.ts`
Add `gstAmount` to track tax collected in payment breakdowns:
```typescript
// payment.interfaces.ts
export interface IPaymentBreakdown {
  payment: Types.ObjectId
  subtotal: number
  shippingFee: number
  gstAmount: number // <--- ADD THIS
  totalAmount: number
  stripeFee: number
  platformFee: number
  organizerAmount: number
  organizerAmountWithoutShipping: number
  discountAmount: number
}
```
```typescript
// payment.model.ts
const PaymentBreakDownSchema = new Schema<IPaymentBreakdownDoc>({
  // ...
  shippingFee: { type: Number, min: 0, default: 0 },
  gstAmount: { type: Number, min: 0, default: 0 }, // <--- ADD THIS
  totalAmount: { type: Number, min: 0, default: 0 },
  // ...
})
```

#### B. `packages/db/src/apps/modules/Order/order.model.ts` & `order.interfaces.ts`
Store tax and fee amounts directly on the Order document:
```typescript
// order.interfaces.ts & order.model.ts
gstAmount: { type: Number, default: 0, min: 0 },
stripeFeeAmount: { type: Number, default: 0, min: 0 },
```

#### C. `packages/db/src/apps/modules/SiteInfo/site-info.model.ts`
Allow admin to configure the order tax rate:
```typescript
orderTaxRate: {
  type: Number,
  default: 0,
  min: 0,
  max: 100,
},
```

---

### File 3: Core Calculation Engine (`get-stripe-fee-breakdown.ts`)
Path: `apps/server/src/app/libs/get-stripe-fee-breakdown.ts`

```typescript
import { paymentType, type TPaymentType } from 'packages/db/src'

interface CalculatePaymentBreakdownPayload {
  paymentType: TPaymentType
  gstAmount?: number
  productPrice?: number
  shippingFee?: number
  donationAmount?: number
  campaignFee?: number
  brandBuilderFee?: number
  platformFeePercent?: number
  stripePercentageFee?: number
  stripeFixedFee?: number
}

const round = (val: number) => Number(val.toFixed(2))

const calculateStripeGrossUp = (targetNet: number, pct: number, fixed: number) => {
  if (targetNet <= 0) return { grossAmount: 0, stripeFee: 0 }
  const rate = pct / 100
  const grossAmount = round((targetNet + fixed) / (1 - rate))
  const stripeFee = round(grossAmount - targetNet)
  return { grossAmount, stripeFee }
}

export const calculatePaymentBreakdown = ({
  paymentType: pType,
  gstAmount = 0,
  productPrice = 0,
  shippingFee = 0,
  donationAmount = 0,
  campaignFee = 0,
  brandBuilderFee = 0,
  platformFeePercent = 6,
  stripePercentageFee = 2.9,
  stripeFixedFee = 0.3,
}: CalculatePaymentBreakdownPayload) => {
  let subtotal = 0
  let amountBeforeStripe = 0
  let finalGst = 0
  let platformFee = 0
  let grossAmount = 0
  let stripeFee = 0
  let organizerNetAmount = 0
  let organizerAmountWithoutShipping = 0
  let platformRevenue = 0

  switch (pType) {
    case paymentType.ORDER: {
      subtotal = productPrice
      finalGst = gstAmount // GST on products only
      amountBeforeStripe = round(productPrice + shippingFee + finalGst)

      const stripeCalc = calculateStripeGrossUp(amountBeforeStripe, stripePercentageFee, stripeFixedFee)
      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformFee = round((productPrice * platformFeePercent) / 100)
      // Organizer gets full product + shipping + GST minus platform commission (NOT minus stripe fee)
      organizerNetAmount = round(amountBeforeStripe - platformFee)
      organizerAmountWithoutShipping = round(productPrice + finalGst - platformFee)
      platformRevenue = platformFee
      break
    }

    case paymentType.DONATION: {
      subtotal = donationAmount
      finalGst = 0 // Donations are GST-free
      amountBeforeStripe = donationAmount

      const stripeCalc = calculateStripeGrossUp(amountBeforeStripe, stripePercentageFee, stripeFixedFee)
      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformFee = round((donationAmount * platformFeePercent) / 100)
      organizerNetAmount = round(donationAmount - platformFee)
      organizerAmountWithoutShipping = organizerNetAmount
      platformRevenue = platformFee
      break
    }

    case paymentType.LAUNCH_FEE: {
      subtotal = campaignFee
      finalGst = 0 // No GST for now
      amountBeforeStripe = campaignFee

      const stripeCalc = calculateStripeGrossUp(amountBeforeStripe, stripePercentageFee, stripeFixedFee)
      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee
      platformRevenue = campaignFee
      break
    }

    case paymentType.BRAND_BUILDER: {
      subtotal = brandBuilderFee
      finalGst = 0 // No GST for now
      amountBeforeStripe = brandBuilderFee

      const stripeCalc = calculateStripeGrossUp(amountBeforeStripe, stripePercentageFee, stripeFixedFee)
      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee
      platformRevenue = brandBuilderFee
      break
    }

    default:
      throw new Error(`Invalid payment type: ${pType}`)
  }

  return {
    databaseRecord: {
      paymentType: pType,
      subtotal,
      shippingFee,
      gstAmount: finalGst,
      amountBeforeStripe,
      grossAmount,
      stripeFee,
      platformFee,
      organizerNetAmount,
      organizerAmountWithoutShipping,
      platformRevenue,
    },
    stripePayload: {
      amount: Math.round(grossAmount * 100),
      // Crucial: application fee must cover platform fee + stripe fee for Destination charges
      application_fee_amount: Math.round((platformFee + stripeFee) * 100),
    },
  }
}
```

---

### File 4: Order Service (`order.services.ts`)
Path: `apps/server/src/app/modules/Order/order.services.ts`

1. **Calculate Tax in `createOrder` (Line ~222):**
   ```typescript
   const siteFee = await SiteInfo.findOne({})
   const platformFee = siteFee?.platformFee || 6
   const taxRate = siteFee?.orderTaxRate || 0

   // Calculate GST strictly on product price
   const gstAmount = Number(((subTotal * taxRate) / 100).toFixed(2))

   const paymentBreakdown = calculatePaymentBreakdown({
     paymentType: paymentType.ORDER,
     productPrice: subTotal,
     shippingFee: shippingPrice,
     gstAmount: gstAmount,
     platformFeePercent: platformFee,
   })
   ```
2. **Save `gstAmount` on Order Creation (Line ~265):**
   ```typescript
   const [order] = await Order.create([{
     campaign: campaign?._id,
     supporter: newSupporter._id,
     customerName: fullName,
     customerPhone: newSupporter.phoneNumber!,
     shippingType: shippingType!,
     subTotal: paymentBreakdown.databaseRecord.subtotal,
     gstAmount: paymentBreakdown.databaseRecord.gstAmount, // <--- ADD
     shippingAmount: paymentBreakdown.databaseRecord.shippingFee,
     stripeFeeAmount: paymentBreakdown.databaseRecord.stripeFee, // <--- ADD
     totalAmount: paymentBreakdown.databaseRecord.grossAmount,
     stripeFeePercentage: 2.9,
     platformFeePercentage: platformFee,
     status: OrderStatus.PENDING,
   }], { session: mongoSession })
   ```
3. Update `calculateOrderPricing` (Line ~583) with the same `gstAmount` calculation so preview quotes match checkout.

---

### File 5: Launch Fee & Brand Builder Services

#### A. `campaign.services.ts` (Line ~1870)
Gross up the launch fee before generating Stripe checkout session:
```typescript
const paymentBreakdown = calculatePaymentBreakdown({
  paymentType: paymentType.LAUNCH_FEE,
  campaignFee: payableAmount,
})

const result = await stripeCheckoutSession({
  name: `Campaign Launch Payment for "${campaign.name}"`,
  unit_amount: paymentBreakdown.stripePayload.amount, // <--- Grossed-up amount
  campaignId: campaign?._id,
  expiresAt: stripeExpiresAt,
  metadata: {
    ...paymentBreakdown.databaseRecord,
    organizerId: user?._id?.toString(),
    campaignId: campaign?._id?.toString(),
  },
})
```

#### B. `brand-builder.services.ts` (Line ~110)
Gross up the brand builder fee:
```typescript
const paymentBreakdown = calculatePaymentBreakdown({
  paymentType: paymentType.BRAND_BUILDER,
  brandBuilderFee,
})

const result = await stripeCheckoutSession({
  name: `Brand Builder Payment for ${businessName}`,
  unit_amount: paymentBreakdown.stripePayload.amount, // <--- Grossed-up amount
  brandId: brandBuilder?._id,
  expiresAt: stripeExpiresAt,
  metadata: {
    ...paymentBreakdown.databaseRecord,
    brandBuilderId: brandBuilder?._id?.toString(),
    organizerId: user?._id?.toString(),
  },
})
```

---

## 4. Webhook Utils Deep Dive (`stripe.utils.ts`)
Path: `apps/server/src/app/modules/stripe/stripe.utils.ts`

### ⚠️ Current Critical Bug in `stripe.utils.ts`
Currently lines ~989 and ~531 calculate:
```typescript
const organizerNetAmount = stripeNetAmount - applicationFee
```
Where `stripeNetAmount = balanceTx.net / 100 = grossAmount - stripeFee`.
If `applicationFee = platformFee + stripeFee`, this formula becomes:
$$\text{organizerNetAmount} = (\text{grossAmount} - \text{stripeFee}) - (\text{platformFee} + \text{stripeFee}) = \text{grossAmount} - 2 \times \text{stripeFee} - \text{platformFee}$$
**This subtracts the Stripe fee TWICE from the organizer!**

### ✅ The Correct Webhook Math
In a Stripe Destination Charge:
1. Customer pays `grossAmount`.
2. Stripe deducts `stripeFee` from the platform account.
3. Connected account receives: `grossAmount - applicationFee`.
4. Platform account receives: `applicationFee - stripeFee`.

Therefore, the exact webhook code must be updated as follows:

### A. Updating `handleOrderCheckoutPaymentSuccess` (Line ~974-1060)
```typescript
export const handleOrderCheckoutPaymentSuccess = async (checkoutSession: Stripe.Checkout.Session) => {
  // ... validation & charge retrieval ...

  const { metadata } = checkoutSession
  const grossAmount = balanceTx.amount / 100
  const stripeFee = balanceTx.fee / 100

  let applicationFee = 0
  let applicationFeeId: string | undefined

  if (charge.application_fee) {
    const fee = await stripe.applicationFees.retrieve(charge.application_fee as string)
    applicationFeeId = fee.id
    applicationFee = fee.amount / 100
  }

  // Retrieve values stored in session metadata during order creation
  const shippingAmount = Number(metadata?.shippingFee ?? 0)
  const gstAmount = Number(metadata?.gstAmount ?? 0)
  const subtotal = Number(metadata?.subtotal ?? (grossAmount - shippingAmount - gstAmount - stripeFee))

  // Correct calculation: organizer gets what was sent to destination account
  const organizerNetAmount = Number((grossAmount - applicationFee).toFixed(2))
  const organizerAmountWithoutShipping = Number((organizerNetAmount - shippingAmount).toFixed(2))

  // Platform's real net earnings after Stripe deducted their processing fee
  const realPlatformFee = Number((applicationFee - stripeFee).toFixed(2))

  // ... Update OrderPayment to PAID ...

  // Save to PaymentBreakDown
  await PaymentBreakDown.create([{
    payment: payment._id,
    subtotal: subtotal,
    shippingFee: shippingAmount,
    gstAmount: gstAmount, // <--- Storing GST
    totalAmount: grossAmount,
    stripeFee: stripeFee,
    platformFee: realPlatformFee > 0 ? realPlatformFee : applicationFee,
    organizerAmount: organizerNetAmount,
    organizerAmountWithoutShipping: organizerAmountWithoutShipping,
    discountAmount: 0,
  }], { session: mongoSession })
}
```

### B. Updating `handleDonationCheckoutPaymentSuccess` (Line ~520-605)
```typescript
export const handleDonationCheckoutPaymentSuccess = async (checkoutSession: Stripe.Checkout.Session) => {
  // ... validation & charge retrieval ...

  const grossAmount = balanceTx.amount / 100
  const stripeFee = balanceTx.fee / 100

  let applicationFee = 0
  let applicationFeeId: string | undefined

  if (charge.application_fee) {
    const fee = await stripe.applicationFees.retrieve(charge.application_fee as string)
    applicationFeeId = fee.id
    applicationFee = fee.amount / 100
  }

  const organizerNetAmount = Number((grossAmount - applicationFee).toFixed(2))
  const realPlatformFee = Number((applicationFee - stripeFee).toFixed(2))
  const subtotal = Number((grossAmount - stripeFee).toFixed(2))

  // ... Update DonationPayment to PAID ...

  await PaymentBreakDown.create([{
    payment: payment._id,
    subtotal: subtotal,
    shippingFee: 0,
    gstAmount: 0,
    totalAmount: grossAmount,
    stripeFee: stripeFee,
    platformFee: realPlatformFee > 0 ? realPlatformFee : applicationFee,
    organizerAmount: organizerNetAmount,
    organizerAmountWithoutShipping: organizerNetAmount,
    discountAmount: 0,
  }], { session: mongoSession })
}
```

### C. Updating `handleCampaignCheckoutPaymentSuccess` & `handleBrandBuilderCheckoutPaymentSuccess`
In these two handlers (direct platform charges, no connected account destination):
```typescript
// PaymentBreakDown creation:
await PaymentBreakDown.create([{
  payment: payment._id,
  subtotal: Number(metadata?.subtotal ?? (grossAmount - stripeFee)),
  totalAmount: grossAmount,
  stripeFee: stripeFee,
  platformFee: 0, // Direct platform revenue
  organizerAmount: 0,
  organizerAmountWithoutShipping: 0,
  gstAmount: 0,
  discountAmount: Number(metadata?.discountAmount ?? 0),
}], { session })
```

---

## 5. Execution Roadmap

1. **Step 1: DB Schema Updates (`packages/db`)**
   - Add `gstAmount` to `PaymentBreakdown`.
   - Add `gstAmount` and `stripeFeeAmount` to `Order`.
   - Build packages (`pnpm build` in packages/db).
2. **Step 2: Core Engine Update (`get-stripe-fee-breakdown.ts`)**
   - Implement gross-up logic across all 4 payment types.
3. **Step 3: Webhook Fixes (`stripe.utils.ts`)**
   - Fix the destination fee deduction logic to avoid double-charging the organizer.
4. **Step 4: Services Integration (`order`, `donation`, `campaign`, `brand-builder`)**
   - Wire up `calculatePaymentBreakdown` with the new grossed-up values and metadata.
5. **Step 5: Frontend UI Transparency**
   - Display clear receipt breakdown before user confirms payment.

