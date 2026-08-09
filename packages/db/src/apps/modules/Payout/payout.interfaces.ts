import { Document, Types } from 'mongoose'

// Table Payout {
//   id string [primary key]

//   organizer string [ref: > Users.id]
//   campaign string [ref: > Campaign.id]

//   amount number
//   currency string

//   stripePayoutId string

//   status string

//   failureCode string
//   failureMessage string

//   scheduledAt date
//   processedAt date
//   arrivalDate date
//   paidAt date
//   failedAt date
//   canceledAt date

//   createdAt date
//   updatedAt date
// }

export interface IPayout {
  organizer: Types.ObjectId
  campaign: Types.ObjectId
  stripePayoutId: string
  stripeAccountId: string
  amount: number
  currency: string
  status: string
  failureCode?: string
  failureMessage?: string
  paidAt?: Date
  failedAt?: Date
  canceledAt?: Date
}

export interface IPayoutDoc extends Document, IPayout {}

// export interface IPayoutModel extends Model<IPayoutDoc> {
//   getById(id: string): Promise<IPayout | null>
// }
