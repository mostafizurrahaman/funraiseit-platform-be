export interface EmailConfig {
  host: string
  port: number
  secure?: boolean | undefined
  user: string
  pass: string
  fromEmail?: string | undefined
  fromName?: string | undefined
  replyTo?: string | undefined
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string | undefined
  from?: string | undefined
  fromName?: string | undefined
  fromEmail?: string | undefined
  replyTo?: string | undefined
  headers?: Record<string, string> | undefined
}
