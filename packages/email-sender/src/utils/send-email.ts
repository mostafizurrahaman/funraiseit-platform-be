import type { SendEmailParams } from '../types/email-sender'
import { transporter } from './create-transporter'

/**
 * Fallback to generate clean plain text from HTML if text is not provided.
 */
const htmlToTextFallback = (html: string): string => {
  if (!html) return ''
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

export const sendEmail = async (params: SendEmailParams) => {
  const fromEmail = params.fromEmail || process.env.NODE_APP_EMAIL || ''
  const fromName = params.fromName || process.env.SITE_NAME

  const from =
    params.from ||
    (fromName && fromEmail ? `"${fromName.replace(/"/g, '')}" <${fromEmail}>` : fromEmail)

  const replyTo =
    params.replyTo || process.env.SUPPORT_EMAIL || fromEmail

  const textContent =
    params.text && params.text.trim().length > 0
      ? params.text
      : htmlToTextFallback(params.html)

  return transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: textContent,
    replyTo: replyTo || undefined,
    headers: {
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      Importance: 'normal',
      ...params.headers,
    },
  })
}

