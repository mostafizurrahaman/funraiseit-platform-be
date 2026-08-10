import dotenv from 'dotenv'
import { usaPhoneRegex } from 'packages/shared/src'
import path from 'path'
import { z } from 'zod'

// 1. Load the correct .env file
const nodeEnv = process.env.NODE_ENV || 'development'
dotenv.config({
  path: path.join(process.cwd(), `.env.${nodeEnv}`),
})

// 2. Define the Schema (The Validator)
const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'local']).default('development'),
  PORT: z.string().transform(Number).default(5000),
  CORS_ORIGINS: z.string().default('*'),
  DATABASE_URL: z.string().url('Invalid Database URL'),
  PASSWORD_SALT_ROUND: z.string().transform(Number).default(12),

  // Site Config
  SITE_NAME: z.string(),
  SITE_LOGO: z.string().url().optional(),
  SITE_PRIMARY_COLOR: z.string().default('#000000'),
  SITE_GST_FEE: z.string().transform(Number).default(0),
  SITE_FEE: z.string().transform(Number).default(0),
  SUPPORT_EMAIL: z.string(),
  CLIENT_URL: z.string(),

  // Node Mailer
  NODE_APP_PASSWORD: z.string(),
  NODE_APP_EMAIL: z.string(),
  NODE_EMAIL_HOST: z.string(),
  NODE_EMAIL_PORT: z.string().transform((val) => Number(val)),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_WEBHOOK_KEY: z.string(),
  STRIPE_SUCCESS_URL: z.string().url(),
  STRIPE_CANCEL_URL: z.string().url(),
  STRIPE_REFRESH_URL: z.string().url(),
  STRIPE_RETURN_URL: z.string().url(),

  STRIPE_FIXED_FEE: z.string().transform(Number),
  STRIPE_FEE: z.string().transform(Number),

  // JWT
  ACCESS_TOKEN_SECRET: z.string().min(10),
  ACCESS_TOKEN_EXPIRES: z.string(),
  REFRESH_TOKEN_SECRET: z.string().min(10),
  REFRESH_TOKEN_EXPIRES: z.string(),
  RESET_TOKEN_SECRET: z.string().min(10),
  RESET_TOKEN_EXPIRES: z.string(),

  // AWS
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),

  // Admin & OTP
  SUPER_ADMIN_PASSWORD: z.string(),
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PHONE_NUMBER: z
    .string()
    .regex(usaPhoneRegex, { error: 'Provide a valid usa number!' }),
  OTP_EXPIRES_IN: z.string().transform(Number).default(5),
  OTP_DIGITS: z.string().transform(Number).default(6),
  OPEN_API_KEY: z.string(),
})

// 3. Validate process.env
const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('❌ Invalid Environment Variables:')
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2))
  process.exit(1) // Stop the app immediately if variables are wrong
}

const env = parsedEnv.data

// 4. Export the Structured Object
const configs = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  corsOrigins: env.CORS_ORIGINS,
  databaseUrl: env.DATABASE_URL,
  passwordSaltRound: env.PASSWORD_SALT_ROUND,
  openAiApiKey: env.OPEN_API_KEY,

  site: {
    name: env.SITE_NAME,
    logo: env.SITE_LOGO,
    primaryColor: env.SITE_PRIMARY_COLOR,
    secondaryColor: env.SITE_PRIMARY_COLOR,
    accentColor: env.SITE_PRIMARY_COLOR,
    siteGstFee: env.SITE_GST_FEE,
    siteFee: env.SITE_FEE,
    supportEmail: env.SUPPORT_EMAIL,
    clientUrl: env.CLIENT_URL,
  },

  nodeMailer: {
    password: env.NODE_APP_PASSWORD,
    email: env.NODE_APP_EMAIL,
    port: env.NODE_EMAIL_PORT,
    host: env.NODE_EMAIL_HOST,
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    webhookPlatformKey: env.STRIPE_WEBHOOK_KEY_PLATFORM,
    webhookConnectedAccountKey: env.STRIPE_WEBHOOK_KEY_CONNECTED_ACCOUNT,
    successUrl: env.STRIPE_SUCCESS_URL,
    cancelUrl: env.STRIPE_CANCEL_URL,
    refresh_url: env.STRIPE_REFRESH_URL,
    return_url: env.STRIPE_RETURN_URL,
    fixedFee: env.STRIPE_FIXED_FEE,
    percentage: env.STRIPE_FEE,
  },

  jwt: {
    accessToken: {
      secret: env.ACCESS_TOKEN_SECRET,
      expiresIn: env.ACCESS_TOKEN_EXPIRES,
    },
    refreshToken: {
      secret: env.REFRESH_TOKEN_SECRET,
      expiresIn: env.REFRESH_TOKEN_EXPIRES,
    },
    resetToken: {
      secret: env.RESET_TOKEN_SECRET,
      expiresIn: env.RESET_TOKEN_EXPIRES,
    },
  },

  awsConfig: {
    accessKeyID: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    bucketName: env.AWS_S3_BUCKET_NAME,
  },

  superAdmin: {
    password: env.SUPER_ADMIN_PASSWORD,
    email: env.SUPER_ADMIN_EMAIL,
    phoneNumber: env.SUPER_ADMIN_PHONE_NUMBER,
  },

  otpSettings: {
    expiresIn: env.OTP_EXPIRES_IN,
    digits: env.OTP_DIGITS,
  },
} as const

export default configs

// Automatically infer the type for use elsewhere if needed
export type TConfigs = typeof configs
