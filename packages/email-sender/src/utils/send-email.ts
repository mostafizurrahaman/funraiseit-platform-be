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

/**
 * Replaces local dev URLs (http://localhost:*) with https://funraisingit.com
 * because Gmail spam filters flag non-HTTPS localhost links inside HTML emails.
 */
const sanitizeLocalUrls = (content: string): string => {
  if (!content) return ''
  return content.replace(/https?:\/\/localhost:\d+/gi, 'https://funraisingit.com')
}

export const sendEmail = async (params: SendEmailParams) => {
  const fromEmail = params.fromEmail || process.env.NODE_APP_EMAIL || ''
  const baseSiteName = process.env.SITE_NAME || 'FunRaisingIt'
  // Keep sender display name consistent with the authenticated account to avoid Gmail spoofing heuristics
  const rawFromName = params.fromName || baseSiteName
  const fromName = rawFromName.replace(/\s+(System|Support|Admin)$/i, '').trim() || baseSiteName

  const from =
    params.from ||
    (fromName && fromEmail ? `"${fromName.replace(/"/g, '')}" <${fromEmail}>` : fromEmail)

  const replyTo = params.replyTo || process.env.SUPPORT_EMAIL || fromEmail

  const cleanHtml = sanitizeLocalUrls(params.html)
  const rawText =
    params.text && params.text.trim().length > 0 ? params.text : htmlToTextFallback(cleanHtml)
  const textContent = sanitizeLocalUrls(rawText)

  // Clean fake "Re:" or "[Admin Alert]" prefixes that trigger spam rules when no In-Reply-To header exists
  const cleanSubject = params.subject
    .replace(/\[Admin Alert\]\s*/gi, '')
    .replace(/\bRe:\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return transporter.sendMail({
    from,
    to: params.to,
    subject: cleanSubject,
    html: cleanHtml,
    text: textContent,
    replyTo: replyTo || undefined,
    ...(params.headers ? { headers: params.headers } : {}),
  })
}
