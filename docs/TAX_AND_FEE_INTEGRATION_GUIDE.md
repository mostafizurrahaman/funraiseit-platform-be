# Stripe Tax & Fee Breakdown Integration Guide

This guide details all the places in the codebase that require updates following the changes to `get-stripe-fee-breakdown.ts`, `order.services.ts`, and `order.validations.ts`, as well as a step-by-step guide for finalizing Stripe Tax after payment success.

---

## 1. Summary of Changes Made So Far & Immediate Issues Found

### Changes Made:
1. **`apps/server/src/app/configs/index.ts`**:
   - Added `STRIPE_FIXED_AND_TAX_FEE` to `envSchema` and `fixedFeeWithTaxFee` ($0.80) to `configs.stripe`.
2. **`apps/server/src/app/libs/get-stripe-fee-breakdown.ts`**:
   - Implemented gross-up formula so payer covers the processing fees.
   - For `ORDER`: uses $0.80 fixed fee if tax > 0 ($0.30 Stripe card fee + $0.50 Stripe tax calculation fee).
   - Added `gstAmount` parameter and computed `organizerNetAmount` and `organizerAmountWithoutShipping`.
3. **`apps/server/src/app/modules/Order/order.validations.ts`**:
   - Added optional address fields (`addressLine1`, `city`, `state`, `postalCode`, `country`) to `previewOrderSchema`.
4. **`apps/server/src/app/modules/Order/order.services.ts`**:
   - Added `stripe.tax.calculations.create` in `createOrder` and `previewOrderPrice`.
   - Forwarded `calculatedTax` as `gstAmount` into `calculatePaymentBreakdown`.

### Critical Issues / Bugs in Current Working Copy:
1. **Syntax Error in `get-stripe-fee-breakdown.ts` line 145**:
   - An unfinished `const ` statement is currently breaking the TypeScript compiler.
2. **Missing `BRAND_BUILDER` in `get-stripe-fee-breakdown.ts`**:
   - The switch statement throws `Invalid payment type` for `BRAND_BUILDER`.
3. **`databaseRecord` omits `gstAmount`**:
   - In `get-stripe-fee-breakdown.ts`, `finalGstAmount` is computed but **not included** in `databaseRecord` return object. Because `createOrder` spreads `...paymentBreakdown.databaseRecord` into Stripe metadata, `gstAmount` is never passed to metadata.
4. **Stripe Tax Calculation is never finalized**:
   - `stripe.tax.calculations.create` only calculates the tax quote. To record the tax liability in Stripe Tax reports and auto-filing, `stripe.tax.transactions.createFromCalculation` must be called on payment success.

---

## 2. Master Inventory: All Places Requiring Updates

Across the codebase, exactly **7 distinct areas / 11 files** need to be updated:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Database Schemas (packages/db)                                      │
│    ├── order.interfaces.ts & order.model.ts                            │
│    └── payment.interfaces.ts & payment.model.ts                        │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Core Fee Engine (apps/server/src/app/libs)                          │
│    └── get-stripe-fee-breakdown.ts                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Order Creation API (apps/server/src/app/modules/Order)              │
│    └── order.services.ts (createOrder)                                 │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Stripe Webhook Handler (apps/server/src/app/modules/stripe)         │
│    └── stripe.utils.ts (handleOrderCheckoutPaymentSuccess)             │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Order Read / Query APIs (apps/server/src/app/modules/Order)         │
│    ├── order.services.ts (getAllOrder)                                 │
│    ├── order.services.ts (getOrderById)                                │
│    └── order.services.ts (getCampaignOrderOverview)                    │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Order Cancellation / Refund APIs (apps/server/src/app/modules/Order)│
│    └── order.services.ts (cancelOrder)                                 │
├────────────────────────────────────────────────────────────────────────┤
│ 7. Payment & Analytics APIs                                            │
│    ├── payment.services.ts (getAllPayment)                             │
│    └── analytics.services.ts (adminAnalytics & campaign sales)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed File-by-File Changes

### Area 1: Database Schemas (`packages/db`)

#### 1.1 `packages/db/src/apps/modules/Order/order.interfaces.ts` & `order.model.ts`
The Order document currently records `subTotal`, `shippingAmount`, and `totalAmount`, but lacks fields for tax, Stripe fee, and Stripe tax calculation reference.

**In `order.interfaces.ts`:**
```typescript
export interface IOrder {
  campaign: Types.ObjectId
  supporter: Types.ObjectId
  shippingType: TShippingType
  customerName: string
  customerPhone: string
  subTotal: number
  shippingAmount: number
  gstAmount: number               // <--- ADD: Sales tax / GST collected
  stripeFeeAmount: number         // <--- ADD: Customer-paid processing fee
  totalAmount: number
  stripeFeePercentage: number
  platformFeePercentage: number
  stripeTaxCalculationId?: string // <--- ADD: Stripe tax calculation ID (taxcalc_xxx)
  stripeTaxTransactionId?: string // <--- ADD: Stripe tax transaction ID (tax_xxx)
  status: TOrderStatus
}
```

**In `order.model.ts`:**
```typescript
gstAmount: {
  type: Number,
  default: 0,
  min: 0,
},
stripeFeeAmount: {
  type: Number,
  default: 0,
  min: 0,
},
stripeTaxCalculationId: {
  type: String,
  default: null,
},
stripeTaxTransactionId: {
  type: String,
  default: null,
},
```

#### 1.2 `packages/db/src/apps/modules/Payment/payment.interfaces.ts` & `payment.model.ts`

**In `payment.interfaces.ts`:**
```typescript
export interface IPaymentBreakdown {
  payment: Types.ObjectId
  subtotal: number
  shippingFee: number
  gstAmount: number               // <--- ADD
  totalAmount: number
  stripeFee: number
  platformFee: number
  organizerAmount: number
  organizerAmountWithoutShipping: number
  discountAmount: number
}

export interface IOrderPayment extends IPayment {
  supporter: Types.ObjectId
  order: Types.ObjectId
  stripeTaxTransactionId?: string // <--- ADD
}
```

**In `payment.model.ts`:**
Add `gstAmount: { type: Number, default: 0, min: 0 }` to `PaymentBreakDownSchema`.

---

### Area 2: Core Fee Breakdown Engine (`get-stripe-fee-breakdown.ts`)

Path: `apps/server/src/app/libs/get-stripe-fee-breakdown.ts`

1. **Fix syntax error**: Remove `const ` at line 145.
2. **Add `BRAND_BUILDER`** case so it uses the same gross-up fee logic:
   ```typescript
   case paymentType.BRAND_BUILDER: {
     subtotal = brandBuilderFee
     finalGstAmount = 0
     amountBeforeStripe = brandBuilderFee
     const stripeCalc = calculateStripeFee(amountBeforeStripe, stripePercentageFee, stripeFixedFee)
     grossAmount = stripeCalc.grossAmount
     stripeFee = stripeCalc.stripeFee
     platformRevenue = brandBuilderFee
     break
   }
   ```
3. **Include `gstAmount` in `databaseRecord`**:
   ```typescript
   return {
     databaseRecord: {
       paymentType: newPType,
       subtotal,
       shippingFee,
       gstAmount: finalGstAmount, // <--- MUST BE INCLUDED HERE
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
       application_fee_amount: Math.round((platformFee + stripeFee) * 100),
     },
   }
   ```

---

### Area 3: Order Create API (`order.services.ts`)

Path: `apps/server/src/app/modules/Order/order.services.ts` (`createOrder`)

1. **Keep track of `taxCalculationId`**:
   ```typescript
   let taxCalculationId: string | undefined
   if (taxCalculation) {
     taxCalculationId = taxCalculation.id
   }
   ```
2. **Save tax fields on `Order.create`**:
   ```typescript
   const [order] = await Order.create(
     [
       {
         campaign: campaign?._id,
         supporter: newSupporter._id,
         customerName: fullName,
         customerPhone: newSupporter.phoneNumber!,
         shippingType: shippingType!,
         subTotal: paymentBreakdown.databaseRecord.subtotal,
         shippingAmount: paymentBreakdown.databaseRecord.shippingFee,
         gstAmount: paymentBreakdown.databaseRecord.gstAmount,           // <--- ADD
         stripeFeeAmount: paymentBreakdown.databaseRecord.stripeFee,      // <--- ADD
         totalAmount: paymentBreakdown.databaseRecord.grossAmount,
         stripeFeePercentage: 2.9,
         platformFeePercentage: platformFee,
         stripeTaxCalculationId: taxCalculationId,                       // <--- ADD
         status: OrderStatus.PENDING,
       },
     ],
     { session: mongoSession }
   )
   ```
3. **Include `taxCalculationId` in Stripe Metadata**:
   ```typescript
   metadata: {
     organizer: campaignOrg?._id.toString(),
     campaign: campaign?._id.toString(),
     order: order?._id.toString(),
     supporter: newSupporter?._id.toString(),
     taxCalculationId: taxCalculationId || '',
     ...paymentBreakdown.databaseRecord,
   }
   ```

---

### Area 4: Webhook Handler & Tax Finalization (`stripe.utils.ts`)

Path: `apps/server/src/app/modules/stripe/stripe.utils.ts` (`handleOrderCheckoutPaymentSuccess`)

#### 4.1 Applying Stripe Tax to the Order:
When Stripe fires `checkout.session.completed`, the calculation (`taxcalc_xxx`) must be converted into a tax transaction (`tax_xxx`):

```typescript
// 1. Retrieve taxCalculationId from metadata or Order doc
const taxCalculationId = metadata?.taxCalculationId || order.stripeTaxCalculationId

let stripeTaxTxId: string | undefined = undefined
if (taxCalculationId) {
  try {
    const taxTx = await stripe.tax.transactions.createFromCalculation({
      calculation: taxCalculationId,
      reference: orderId, // Links Stripe tax report to internal Order ID
    })
    stripeTaxTxId = taxTx.id
  } catch (taxError) {
    logger.error('Failed to create Stripe tax transaction from calculation', taxError)
  }
}
```

#### 4.2 Fix Payout & Breakdown Math in Webhook:
The existing code has a bug where `subtotal` is recalculated as `grossAmount - shippingAmount`, which corrupts the product subtotal with tax and Stripe fee.

```typescript
// Read directly from metadata:
const gstAmount = Number(metadata?.gstAmount || 0)
const stripeFee = Number(metadata?.stripeFee || (balanceTx.fee / 100))
const platformFee = Number(metadata?.platformFee || 0)
const subtotal = Number(metadata?.subtotal || (grossAmount - shippingAmount - gstAmount - stripeFee))
const organizerNetAmount = Number(metadata?.organizerNetAmount || (subtotal + shippingAmount + gstAmount - platformFee))
const organizerAmountWithoutShipping = Number(metadata?.organizerAmountWithoutShipping || (organizerNetAmount - shippingAmount))

// Update Order:
await Order.findOneAndUpdate(
  { _id: orderId },
  {
    $set: {
      subTotal: subtotal,
      shippingAmount,
      gstAmount,
      stripeFeeAmount: stripeFee,
      totalAmount: grossAmount,
      stripeTaxTransactionId: stripeTaxTxId,
      status: OrderStatus.PAID,
    },
  },
  { session: mongoSession }
)

// Create Payment Breakdown:
await PaymentBreakDown.create(
  [
    {
      payment: payment._id,
      subtotal,
      shippingFee: shippingAmount,
      gstAmount,                                  // <--- ADD
      totalAmount: grossAmount,
      stripeFee,
      platformFee,
      organizerAmount: organizerNetAmount,
      organizerAmountWithoutShipping,
    },
  ],
  { session: mongoSession }
)
```

---

### Area 5: Order Read APIs (`order.services.ts`)

#### 5.1 `getAllOrder` (lines 867-925)
Add `gstAmount` and fix field mapping:
```typescript
$project: {
  // ... existing fields ...
  subTotal: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.subtotal', '$subTotal', 0], // Note: lowercase subtotal
  },
  shippingAmount: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.shippingFee', '$shippingAmount', 0],
  },
  gstAmount: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.gstAmount', '$gstAmount', 0], // <--- ADD
  },
  stripeFeeAmount: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.stripeFee', '$stripeFeeAmount', 0],
  },
  totalAmount: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.totalAmount', '$totalAmount', 0],
  },
  organizerAmountWithoutShipping: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmountWithoutShipping', null], // Fix property bug
  },
  organizerNetAmount: {
    $ifNull: ['$paymentDetails.paymentBreakingDown.organizerAmount', null],
  },
}
```

#### 5.2 `getOrderById` (lines 1122-1180)
Add identical projections for `gstAmount` and `stripeFeeAmount`.

#### 5.3 `getCampaignOrderOverview` (lines 1240-1300)
In the `$group` stage for `totalSales`, add:
```typescript
gstAmount: {
  $sum: '$paymentDetails.gstAmount',
},
```

---

### Area 6: Order Cancellation & Refund API (`order.services.ts`)

Path: `apps/server/src/app/modules/Order/order.services.ts` (`cancelOrder`)

When an order is cancelled or refunded, Stripe Tax requires you to file a reversal so that sales tax is not remitted for cancelled sales:
```typescript
if (order.stripeTaxTransactionId) {
  try {
    await stripe.tax.transactions.createReversal({
      mode: 'full',
      original_transaction: order.stripeTaxTransactionId,
      reference: `reversal_${order._id}`,
    })
  } catch (err) {
    logger.error('Failed to reverse Stripe tax transaction', err)
  }
}
```

---

### Area 7: Payment & Analytics APIs

#### 7.1 `apps/server/src/app/modules/Payment/payment.services.ts` (`getAllPayment`)
In `$project` (lines 116-126):
```typescript
gstAmount: { $ifNull: ['$paymentBreakdown.gstAmount', 0] },
```

#### 7.2 `apps/server/src/app/modules/analytics/analytics.services.ts`
- In `getCampaignAnalyticsOverview`: include `$paymentDetails.gstAmount` in grouping so tax is separated from net funds raised.
- In `adminAnalytics`: ensure platform commission is purely `$paymentBreakdown.platformFee` (6%) and does not accidentally bundle pass-through tax or Stripe fees.

---

## 4. Guided Docs: Stripe Tax Flow After Payment Success

```
[Customer Pays on Stripe Checkout]
                │
                ▼
[Stripe fires 'checkout.session.completed' webhook]
                │
                ▼
[Server verifies webhook signature in stripe.controllers.ts]
                │
                ▼
[Calls handleOrderCheckoutPaymentSuccess(checkoutSession)]
                │
                ▼
┌────────────────────────────────────────────────────────┐
│ 1. Extract taxCalculationId from metadata or Order doc │
│ 2. Call Stripe Tax API:                                │
│    stripe.tax.transactions.createFromCalculation({     │
│      calculation: taxCalculationId,                    │
│      reference: orderId                                │
│    })                                                  │
│ 3. Save returned tax_xxx ID on Order & OrderPayment    │
│ 4. Persist gstAmount to PaymentBreakdown & Order       │
│ 5. Update Order status to PAID                         │
└────────────────────────────────────────────────────────┘
```

