import configs from '@app/configs'
import Telnyx from 'telnyx'
import { logger } from './logger'

const client = new Telnyx({
  apiKey: configs.telnyxSettings.apiKey,
})

export interface ISendSmsResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Normalizes phone numbers to standard E.164 format (+1XXXXXXXXXX for US).
 * Returns null if the phone number is invalid.
 */
export const normalizePhoneNumber = (phone?: string | null): string | null => {
  if (!phone || typeof phone !== 'string') return null
  const trimmed = phone.trim()
  if (!trimmed) return null

  // Remove whitespace, dashes, parentheses, dots
  const cleaned = trimmed.replace(/[\s\-().]/g, '')

  // E.164 already: starts with + followed by 10 to 15 digits
  if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return cleaned
  }

  // 10-digit standard US number (e.g. 5551234567) -> format to +15551234567
  if (/^[2-9]\d{9}$/.test(cleaned)) {
    return `+1${cleaned}`
  }

  // 11-digit US number starting with 1 (e.g. 15551234567) -> format to +15551234567
  if (/^1[2-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`
  }

  // General 11 to 15 digits international without +
  if (/^[1-9]\d{10,14}$/.test(cleaned)) {
    return `+${cleaned}`
  }

  return null
}

export const sendSms = async (phoneNumber: string, text: string): Promise<ISendSmsResult> => {
  const targetPhone = normalizePhoneNumber(phoneNumber) || phoneNumber

  try {
    const response = await client.messages.send({
      from: configs.telnyxSettings.phone,
      to: targetPhone,
      text: text,
    })

    console.log('Telnyx SMS response:', response)
    return {
      success: true,
      data: response,
    }
  } catch (error: any) {
    const errorMessage = error?.message || error?.raw?.message || 'Failed to send SMS'
    logger.error('Telnyx SMS error:', errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
