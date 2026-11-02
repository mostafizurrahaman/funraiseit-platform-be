# Complete Implementation Guide: Live US State Tax & Customer-Paid Transaction Fees

This guide provides the exact step-by-step code and workflow to implement:
1. **Customer-Paid Transaction Fees in ALL Scenarios** (`ORDER`, `DONATION`, `LAUNCH_FEE`, `BRAND_BUILDER`), ensuring the platform commission and organizer payout are 100% protected.
2. **Passing the $0.50 Stripe Tax Cost to the Customer** on orders (`stripeFixedFee = $0.80`).
3. **Live, State-Based US Sales Tax Preview** in `previewOrderPrice` using Stripe's Tax Calculation API (`stripe.tax.calculations.create`).
4. **Complete Source Code for `calculatePaymentBreakdown`** in `get-stripe-fee-breakdown.ts`.

---

## 1. Overview & Flow

```
1. Customer selects State & Postal Code on Frontend Checkout Form
                             │
                             ▼
2. Frontend calls POST /api/v1/orders/preview with { campaignId, orderItems, shippingType, state, postalCode }
                             │
                             ▼
3. Backend (previewOrderPrice) calls Stripe Tax Calculation API:
   stripe.tax.calculations.create({ customer_details: { address: { state, postal_code } }, line_items, shipping_cost })
                             │
                             ▼
4. Stripe returns exact state & local sales tax (e.g., $9.50 for CA 90210, $0 for OR 97201)
                             │
                             ▼
5. Backend runs calculatePaymentBreakdown({ productPrice, shippingFee, gstAmount, stripeFixedFee: 0.80 })
   - Uses Gross-Up Formula so Customer pays 100% of processing fees:
     Gross Amount = (AmountBeforeStripe + 0.80) / (1 - 0.029)
                             │
                             ▼
6. Frontend receives and renders real-time invoice breakdown:
   - Subtotal:           $100.00
   - Estimated Sales Tax:  $9.50
   - Shipping Fee:        $10.00
   - Processing Fee:       $4.41  (2.9% + $0.80)
   ---------------------------------
   - Total Amount to Pay: $123.91
```

---

## 2. The Math: Customer-Paid Fees & Stripe Connect Destination Charges

### The Gross-Up Formula:
When Stripe charges `2.9% + Fixed Fee`, if the merchant wants to receive target amount $A$ net, the customer must be charged:
$$\text{Gross Amount} = \frac{A + \text{Fixed Fee}}{1 - 0.029}$$
$$\text{Stripe Fee} = \text{Gross Amount} - A$$

* **For `ORDER`:**
  - Base Amount $A = \text{Product Price} + \text{Shipping Fee} + \text{State Tax}$
  - Fixed Fee $= \$0.30 \text{ (Card Fee)} + \$0.50 \text{ (Stripe Tax Cost)} = \$0.80$
  - Customer pays: $\text{Gross Amount}$
  - Organizer receives: $A - \text{Platform Fee}$ (Organizer does **NOT** pay any Stripe fee!)

* **For `DONATION`:**
  - Base Amount $A = \text{Donation Amount}$ (No tax on donations)
  - Fixed Fee $= \$0.30$
  - Donor pays: $\text{Gross Amount}$
  - Organizer receives: $\text{Donation Amount} - \text{Platform Fee}$

* **For `LAUNCH_FEE` & `BRAND_BUILDER`:**
  - Client pays the fee + grossed-up Stripe fee ($\$0.30$ fixed fee).
  - Platform receives 100% of the service fee intact.

### Stripe Destination Charge Protection:
In Stripe Connect Destination charges (`transfer_data.destination`), Stripe automatically deducts the Stripe processing fee from the platform's `application_fee_amount`.
To prevent Stripe from taking money out of the platform's commission:
$$\text{application\_fee\_amount} = \text{platformFee} + \text{stripeFee}$$
- Connected account (Organizer) receives: $\text{Gross Amount} - \text{application\_fee\_amount} = A - \text{platformFee}$
- Platform receives: $\text{application\_fee\_amount} - \text{stripeFee} = \text{platformFee}$
- Customer paid the Stripe fee. Everyone gets their exact due!

---

## 3. Core Engine: `calculatePaymentBreakdown` (`get-stripe-fee-breakdown.ts`)

Path: `apps/server/src/app/libs/get-stripe-fee-breakdown.ts`

Here is the complete, production-ready code with all 4 payment scenarios:

```typescript
import { paymentType, type TPaymentType } from '@repo/db'

interface CalculatePaymentBreakdownPayload {
  paymentType: TPaymentType
  gstAmount?: number
  productPrice?: number
  shippingFee?: number
  donationAmount?: number
  campaignFee?: number
  brandBuilderFee?: number
  platformFeePercent?: number

  stripePercentageFee?: number // default 2.9%
  stripeFixedFee?: number      // default 0.80 for order ($0.30 card + $0.50 tax fee), 0.30 for others
}

const round = (value: number) => Number(value.toFixed(2))

/**
 * Gross-up formula: Ensures the payer covers 100% of the Stripe transaction fees.
 */
const calculateStripeFee = (
  amountBeforeStripe: number,
  percentageFee: number,
  fixedFee: number
) => {
  if (amountBeforeStripe <= 0) return { grossAmount: 0, stripeFee: 0 }

  const rate = percentageFee / 100

  // Customer pays this amount so net received equals amountBeforeStripe:
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
  brandBuilderFee = 0,

  platformFeePercent = 6,

  stripePercentageFee = 2.9,
  stripeFixedFee,
}: CalculatePaymentBreakdownPayload) => {
  let subtotal = 0
  let amountBeforeStripe = 0
  let finalGstAmount = 0

  let platformFee = 0
  let grossAmount = 0
  let stripeFee = 0

  let organizerNetAmount = 0
  let organizerAmountWithoutShipping = 0
  let platformRevenue = 0

  switch (newPType) {
    /**
     * 1. ORDER
     * Customer pays Product + Shipping + State Tax + Stripe Fee (including $0.50 tax cost)
     */
    case paymentType.ORDER: {
      subtotal = productPrice
      finalGstAmount = gstAmount
      amountBeforeStripe = round(productPrice + shippingFee + finalGstAmount)

      // Default fixed fee for Order is 0.80 ($0.30 Stripe card fee + $0.50 Stripe Tax cost)
      const fixedFee = stripeFixedFee !== undefined ? stripeFixedFee : 0.80

      const stripeCalc = calculateStripeFee(
        amountBeforeStripe,
        stripePercentageFee,
        fixedFee
      )

      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformFee = round((productPrice * platformFeePercent) / 100)

      // Organizer receives full product + shipping + GST minus only the platform fee
      // (Stripe fee is NOT deducted from organizer)
      organizerNetAmount = round(amountBeforeStripe - platformFee)
      organizerAmountWithoutShipping = round(productPrice + finalGstAmount - platformFee)
      platformRevenue = platformFee

      break
    }

    /**
     * 2. DONATION
     * Donations are GST-free. Donor pays Donation + Stripe Fee ($0.30 fixed fee)
     */
    case paymentType.DONATION: {
      subtotal = donationAmount
      finalGstAmount = 0
      amountBeforeStripe = donationAmount

      const fixedFee = stripeFixedFee !== undefined ? stripeFixedFee : 0.30

      const stripeCalc = calculateStripeFee(
        amountBeforeStripe,
        stripePercentageFee,
        fixedFee
      )

      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformFee = round((donationAmount * platformFeePercent) / 100)

      organizerNetAmount = round(donationAmount - platformFee)
      organizerAmountWithoutShipping = organizerNetAmount
      platformRevenue = platformFee

      break
    }

    /**
     * 3. LAUNCH FEE
     * Organizer pays Campaign Launch Fee + Stripe Fee ($0.30 fixed fee)
     */
    case paymentType.LAUNCH_FEE: {
      subtotal = campaignFee
      finalGstAmount = 0
      amountBeforeStripe = campaignFee

      const fixedFee = stripeFixedFee !== undefined ? stripeFixedFee : 0.30

      const stripeCalc = calculateStripeFee(
        amountBeforeStripe,
        stripePercentageFee,
        fixedFee
      )

      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformRevenue = round(campaignFee)

      break
    }

    /**
     * 4. BRAND BUILDER
     * Organizer pays Brand Builder Service Fee + Stripe Fee ($0.30 fixed fee)
     */
    case paymentType.BRAND_BUILDER: {
      subtotal = brandBuilderFee
      finalGstAmount = 0
      amountBeforeStripe = brandBuilderFee

      const fixedFee = stripeFixedFee !== undefined ? stripeFixedFee : 0.30

      const stripeCalc = calculateStripeFee(
        amountBeforeStripe,
        stripePercentageFee,
        fixedFee
      )

      grossAmount = stripeCalc.grossAmount
      stripeFee = stripeCalc.stripeFee

      platformRevenue = round(brandBuilderFee)

      break
    }

    default:
      throw new Error(`Invalid payment type: ${newPType}`)
  }

  return {
    databaseRecord: {
      paymentType: newPType,
      subtotal,
      shippingFee,
      gstAmount: finalGstAmount,
      amountBeforeStripe,
      grossAmount,
      stripeFee,
      platformFee,
      organizerNetAmount,
      organizerAmountWithoutShipping,
      platformRevenue,
    },
    stripePayload: {
      amount: Math.round(grossAmount * 100), // in cents
      // In Destination charges, Stripe deducts processing fees from application_fee.
      // We pass platformFee + stripeFee so Stripe deducts their fee and platform gets net platformFee!
      application_fee_amount: Math.round((platformFee + stripeFee) * 100),
    },
  }
}
```

---

## 4. Step 1: Update Validation Schema (`order.validations.ts`)

Path: `apps/server/src/app/modules/Order/order.validations.ts`

Add optional address fields to `previewOrderSchema` (around Line ~113):

```typescript
const previewOrderSchema = z.object({
  body: z
    .object({
      campaignId: requiredMongooseId('Campaign ID'),
      shippingType: enumString(shippingTypesValues, 'Shipping type').optional(),

      // Optional address for live state-tax calculation
      state: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
      country: z.string().default('US').optional(),

      // Products:
      orderItems: z
        .array(orderItemSchema, {
          error: 'Order items should be an array of product & quantity.',
        })
        .min(1, {
          error: 'Min. one order item required!',
        }),
    })
    .superRefine((data, ctx) => {
      // ... existing validations ...
    }),
})
```

---

## 5. Step 2: Implement Stripe Tax in `previewOrderPrice` (`order.services.ts`)

Path: `apps/server/src/app/modules/Order/order.services.ts`

Update `previewOrderPrice` (around Line ~417) to calculate live tax for single or multiple products:

```typescript
const previewOrderPrice = async (payload: TPreviewOrderPayloadType) => {
  const {
    campaignId,
    orderItems,
    shippingType,
    state,
    postalCode,
    city,
    country = 'US',
  } = payload

  // 1. Check campaign
  const campaign = await Campaign.findById(campaignId)
  if (!campaign) {
    throw new AppError(httpStatus.NOT_FOUND, 'Campaign not found.')
  }

  // 2. Load products and calculate subtotal
  // (Existing product lookup and stock validation code)
  const subTotal = products?.reduce((acc, p) => {
    const customerGivenQuantity = orderedQuantityMap.get(p._id?.toString()) || 0
    const pricePerUnit = Math.max(p.price, 0)
    return acc + customerGivenQuantity * pricePerUnit
  }, 0)

  const shippingPrice =
    campaign?.allowShipping && shippingType === 'shipping' ? (campaign.shippingFee ?? 0) : 0

  const siteFee = await SiteInfo.findOne({})
  const platformFee = siteFee?.platformFee || 6
  const defaultFallbackTaxRate = (siteFee as any)?.orderTaxRate || configs.site.siteGstFee || 0

  // 3. Live State-based Tax via Stripe Tax Calculation API
  let calculatedTax = 0

  if (state && postalCode) {
    try {
      // Map multiple products to Stripe line items
      const lineItemsForTax = products.map((p) => {
        const qty = orderedQuantityMap.get(p._id?.toString()) || 1
        return {
          amount: Math.round(p.price * qty * 100), // in cents
          reference: p._id?.toString(),
          tax_code: p.productType === 'digital' ? 'txcd_10000000' : 'txcd_99999999',
          tax_behavior: 'exclusive' as const,
        }
      })

      const taxCalculation = await stripe.tax.calculations.create({
        currency: 'usd',
        customer_details: {
          address: {
            line1: '123 Customer St',
            city: city || undefined,
            state: state.trim().toUpperCase(), // e.g. 'CA', 'NY', 'TX'
            postal_code: postalCode.trim(),    // e.g. '90210'
            country: country || 'US',
          },
          address_source: 'shipping',
        },
        line_items: lineItemsForTax,
        shipping_cost: {
          amount: Math.round(shippingPrice * 100),
          tax_code: 'txcd_92010001',
          tax_behavior: 'exclusive',
        },
      })

      calculatedTax = Number((taxCalculation.tax_amount_exclusive / 100).toFixed(2))
    } catch (taxError) {
      // Fallback if Stripe Tax is unreachable or invalid zip code
      calculatedTax = Number(((subTotal * defaultFallbackTaxRate) / 100).toFixed(2))
    }
  } else {
    // If state/zip not provided yet, fallback to default rate or 0
    calculatedTax = Number(((subTotal * defaultFallbackTaxRate) / 100).toFixed(2))
  }

  // 4. Run breakdown engine (fixed fee = $0.80 including $0.50 tax cost)
  const paymentBreakdown = calculatePaymentBreakdown({
    paymentType: paymentType.ORDER,
    productPrice: subTotal,
    shippingFee: shippingPrice,
    gstAmount: calculatedTax,
    platformFeePercent: platformFee,
  })

  return {
    ...paymentBreakdown.databaseRecord,
    taxRateApplied: calculatedTax > 0 ? Number(((calculatedTax / subTotal) * 100).toFixed(2)) : 0,
  }
}
```

---

## 6. Step 3: Align `createOrder` (`order.services.ts`)

Path: `apps/server/src/app/modules/Order/order.services.ts`

Inside `createOrder` (around Line ~220), do the same calculation with the customer's submitted address before generating the checkout session:

```typescript
// Live tax calculation with submitted customer address
let calculatedTax = 0

if (state && postalCode) {
  try {
    const lineItemsForTax = products.map((p) => {
      const qty = orderedQuantityMap.get(p._id?.toString()) || 1
      return {
        amount: Math.round(p.price * qty * 100),
        reference: p._id?.toString(),
        tax_code: p.productType === 'digital' ? 'txcd_10000000' : 'txcd_99999999',
        tax_behavior: 'exclusive' as const,
      }
    })

    const taxCalc = await stripe.tax.calculations.create({
      currency: 'usd',
      customer_details: {
        address: {
          line1: addressLine1,
          city: city,
          state: state.trim().toUpperCase(),
          postal_code: postalCode.trim(),
          country: country || 'US',
        },
        address_source: 'shipping',
      },
      line_items: lineItemsForTax,
      shipping_cost: {
        amount: Math.round(shippingPrice * 100),
        tax_code: 'txcd_92010001',
        tax_behavior: 'exclusive',
      },
    })
    calculatedTax = Number((taxCalc.tax_amount_exclusive / 100).toFixed(2))
  } catch (err) {
    calculatedTax = Number(((subTotal * ((siteFee as any)?.orderTaxRate || configs.site.siteGstFee || 0)) / 100).toFixed(2))
  }
}

const paymentBreakdown = calculatePaymentBreakdown({
  paymentType: paymentType.ORDER,
  productPrice: subTotal,
  shippingFee: shippingPrice,
  gstAmount: calculatedTax,
  platformFeePercent: platformFee,
})
```

---

## 7. Step 4: Webhook Handler (`stripe.utils.ts`)

Path: `apps/server/src/app/modules/stripe/stripe.utils.ts`

When Stripe confirms payment in `handleOrderCheckoutPaymentSuccess`:

```typescript
const shippingAmount = Number(shippingFee ?? (metadata as any)?.shippingFee ?? 0)
const gstAmount = Number((metadata as any)?.gstAmount ?? ((checkoutSession.total_details?.amount_tax ?? 0) / 100))
const subtotal = Number((metadata as any)?.subtotal ?? (grossAmount - shippingAmount - gstAmount - stripeFee))

// Organizer receives: grossAmount - applicationFee (Organizer does NOT pay Stripe fee)
const organizerNetAmount = Number((grossAmount - applicationFee).toFixed(2))
const organizerAmountWithoutShipping = Number((organizerNetAmount - shippingAmount).toFixed(2))

// Platform receives: applicationFee - stripeFee (6% net commission intact)
const realPlatformFee = Number((applicationFee - stripeFee).toFixed(2))

await PaymentBreakDown.create([
  {
    payment: payment._id,
    subtotal: subtotal,
    shippingFee: shippingAmount,
    gstAmount: gstAmount,
    totalAmount: grossAmount,
    stripeFee: stripeFee,
    platformFee: realPlatformFee > 0 ? realPlatformFee : applicationFee,
    organizerAmount: organizerNetAmount,
    organizerAmountWithoutShipping: organizerAmountWithoutShipping,
    discountAmount: 0,
  },
], { session: mongoSession })
```

---

## 8. Summary of All 4 Payment Scenarios

| Scenario | Tax Applied? | Stripe Fixed Fee | Who Pays Stripe Fee? | Organizer Net Payout | Platform Net Revenue |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`ORDER`** | **State Tax (Live)** | **`$0.80`** ($0.30 + $0.50) | **Customer** | Product + Shipping + Tax - 6% Platform Fee | Full 6% Commission |
| **`DONATION`** | **No Tax ($0)** | **`$0.30`** | **Donor** | Donation - 6% Platform Fee | Full 6% Commission |
| **`LAUNCH_FEE`** | **No Tax ($0)** | **`$0.30`** | **Organizer** | N/A (Platform service) | Full Launch Fee |
| **`BRAND_BUILDER`** | **No Tax ($0)** | **`$0.30`** | **Organizer** | N/A (Platform service) | Full Brand Builder Fee |
