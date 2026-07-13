import { Document, Model, type Types } from 'mongoose'
import { otpTypes } from './otp.constant'

export type IOtpType = (typeof otpTypes)[keyof typeof otpTypes]

export interface IOtp {
  user: Types.ObjectId
  otp: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  type: IOtpType
}

// OTP DOCUMENT
export interface IOtpDocument extends IOtp, Document {}

// OTP MODEL:
export interface IOtpModel extends Model<IOtpDocument> {
  getNewOTP(user: string, type: IOtpType, otp: string): Promise<IOtpDocument | null>
  findValidOtp(user: string, type: IOtpType): Promise<IOtpDocument | null>
  verifyAndConsumeOtp(user: string, type: IOtpType, otp: string): Promise<IOtpDocument>
}
