export interface EmailConfig {
  host: string
  port: number
  secure?: boolean
  user: string
  pass: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  headers?: Record<string, string>
}

