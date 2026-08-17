import nodemailer from 'nodemailer'
import type { EmailConfig } from '../types/email-sender'

export const createTransporter = (config?: Partial<EmailConfig>) => {
  const host =
    config?.host ||
    process.env.NODE_EMAIL_HOST ||
    process.env.NODE_EAMIL_HOST ||
    'smtp.gmail.com'

  const port = Number(config?.port || process.env.NODE_EMAIL_PORT || 587)
  const user = config?.user || process.env.NODE_APP_EMAIL || ''
  const pass = config?.pass || process.env.NODE_APP_PASSWORD || ''

  // Port 465 uses SSL (secure: true). Port 587 uses STARTTLS (secure: false).
  const secure =
    config?.secure !== undefined
      ? config.secure
      : process.env.NODE_EMAIL_SECURE !== undefined
        ? process.env.NODE_EMAIL_SECURE === 'true'
        : port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2',
    },
  })
}

export const transporter = createTransporter()

