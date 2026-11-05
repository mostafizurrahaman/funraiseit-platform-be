import { Types, type ClientSession } from 'mongoose'
import { Otp, type IOtpDocument, type IOtpType } from '@repo/db'
import { addTime, generateOtp, AppError } from '@repo/shared'
import httpStatus from 'http-status'
import configs from '@app/configs'

interface IGetOrCreateOtpOptions {
  userId: Types.ObjectId | string
  type: IOtpType
  session?: ClientSession
  checkCooldown?: boolean
}

export const getNewOtp = async ({
  userId,
  type,
  session,
  checkCooldown = false,
}: IGetOrCreateOtpOptions): Promise<IOtpDocument> => {
  const normalizedUserId = userId.toString()

  if (checkCooldown) {
    const existingOTP = await Otp.findValidOtp(normalizedUserId, type)
    if (existingOTP) {
      const now = Date.now()
      const lastSentAt = new Date(existingOTP.updatedAt).getTime()
      const cooldownMs = configs.otpSettings.resendCooldown * 60 * 1000

      if (now - lastSentAt < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastSentAt)) / 1000)
        throw new AppError(
          httpStatus.TOO_MANY_REQUESTS,
          `An OTP was already sent. Please wait ${remainingSeconds} seconds before requesting another one.`
        )
      }
    }
  }

  const otp = generateOtp({
    length: configs.otpSettings.digits,
  })

  const expiresAt = addTime(configs.otpSettings.expiresIn, 'minutes', true)

  /*
   * Replace the previous OTP for this user and type,
   * or create one when it does not exist.
   */
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: normalizedUserId,
      type,
    },
    {
      $set: {
        user: normalizedUserId,
        type,
        otp,
        expiresAt,
      },
    },
    {
      new: true,
      upsert: true,
      ...(session && { session }),
    }
  )

  if (!savedOtp) {
    throw new Error('Failed to generate OTP')
  }

  return savedOtp
}
