import { Document, Model } from 'mongoose'

  export interface IPayout  {
    name: string
  }

  export interface IPayoutDoc extends Document, IPayout   {}

  // export interface IPayoutModel extends Model<IPayoutDoc> {
  //   getById(id: string): Promise<IPayout | null>
  // }