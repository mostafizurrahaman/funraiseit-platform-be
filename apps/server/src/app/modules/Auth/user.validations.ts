import {
  enumString,
  optionalString,
  requiredEmail,
  requiredMongooseId,
  requiredString,
  usaPhoneRegex,
} from '@repo/shared'
import { AuthStatus } from '@repo/db'
import z from 'zod/v4'

// 1. Signup
const signUserSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail('Email'),
    password: requiredString('Password').min(1, {
      error: `Password is required`,
    }),
  }),
})

// 2. Login
const loginSchema = z.object({
  body: signUserSchema.shape.body.pick({
    email: true,
    password: true,
  }),
})

const resendSignupOtpSchema = z.object({
  body: signUserSchema.shape.body.pick({
    email: true,
  }),
})

const verifySignupOtpSchema = z.object({
  body: signUserSchema.shape.body
    .pick({
      email: true,
    })
    .extend({
      otp: requiredString('Otp')
        .length(6, { error: 'OTP must be exactly 6 digits' })
        .regex(/^\d+$/, { error: 'OTP must contain only numbers' }),
    }),
})

const forgotPasswordSchema = z.object({
  body: signUserSchema.shape.body.pick({
    email: true,
  }),
})

const verifyResetPasswordOtpSchema = z.object({
  body: verifySignupOtpSchema.shape.body.pick({
    email: true,
    otp: true,
  }),
})

const resendOTPSchema = z.object({
  body: verifySignupOtpSchema.shape.body.pick({
    email: true,
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: requiredString('newPassword'),
  }),
  query: z.object({
    resetToken: requiredString('resetToken'),
  }),
})

const changedPasswordSchema = z.object({
  body: z.object({
    oldPassword: requiredString('oldPassword'),
    newPassword: requiredString('newPassword'),
  }),
})

// Update Profile :
const updateProfile = z.object({
  body: z.object({
    name: optionalString('Name'),
    phoneNumber: z
      .string({
        error: 'Phone number is required!',
      })
      .regex(usaPhoneRegex, 'Please enter a valid USA phone number'),
  }),
})

// Update User Status :
const updateUserStatusSchema = z.object({
  params: z.object({
    id: requiredMongooseId('User ID'),
  }),
  body: z
    .object({
      status: enumString([AuthStatus.ACTIVE, AuthStatus.BLOCKED, AuthStatus.IN_REVIEW], 'Status'),
      reason: optionalString('Reason'),
    })
    .superRefine((data, ctx) => {
      if (data.status === AuthStatus.BLOCKED && !data.reason?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'A reason is required when blocking a user.',
        })
      }
    }),
})

const refreshTokenSchema = z.object({
  cookies: z.object({
    refreshToken: requiredString('refreshToken'),
  }),
})

export const AuthValidations = {
  signUserSchema,
  loginSchema,
  resendSignupOtpSchema,
  verifySignupOtpSchema,
  forgotPasswordSchema,
  verifyResetPasswordOtpSchema,
  resendOTPSchema,
  changedPasswordSchema,
  resetPasswordSchema,
  updateProfile,
  updateUserStatusSchema,
  refreshTokenSchema,
}

export type ISignUpSchemaType = z.infer<typeof signUserSchema.shape.body>
export type ILoginType = z.infer<typeof loginSchema.shape.body>
export type IResendSignupType = z.infer<typeof resendSignupOtpSchema.shape.body>
export type IVerifySignupOtpType = z.infer<typeof verifySignupOtpSchema.shape.body>
export type IForgotPasswordType = z.infer<typeof forgotPasswordSchema.shape.body>
export type IVerifyResetPasswordOtpType = z.infer<typeof verifyResetPasswordOtpSchema.shape.body>
export type IResetPasswordOtpType = z.infer<typeof resetPasswordSchema.shape.body>
export type IResetPasswordOtpQueryType = z.infer<typeof resetPasswordSchema.shape.query>
export type IChangedPasswordType = z.infer<typeof changedPasswordSchema.shape.body>
export type IUpdateProfilePayload = z.infer<typeof updateProfile.shape.body>
export type IUpdateUserStatusPayload = z.infer<typeof updateUserStatusSchema.shape.body>
