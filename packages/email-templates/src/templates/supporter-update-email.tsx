import {
  Heading,
  Section,
  Text,
  Img,
} from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

export interface SupporterUpdateEmailProps {
  supporterName: string
  campaignTitle: string
  message: string // HTML content
  logoUrl?: string | undefined
  companyName?: string | undefined
  supportEmail?: string | undefined
  companyAddress?: string | undefined
  unsubscribeUrl?: string | undefined
}

export const SupporterUpdateEmail = ({
  supporterName = 'Supporter',
  campaignTitle = 'Campaign Update',
  message = '<p>Thank you for your support!</p>',
  logoUrl = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: SupporterUpdateEmailProps): React.ReactElement => {
  return (
    <EmailLayout previewText={`An update regarding ${campaignTitle}`}>
      {/* --- BRANDED HERO BANNER --- */}
      <Section className="email-header bg-gradient-to-tr from-[#03AFA8] to-[#029690] p-6 sm:p-10 text-center border-b-[5px] border-[#FE7B01]">
        <div className="bg-white inline-block p-3 rounded-xl shadow-lg mb-5 border border-white/20">
          <Img
            src={logoUrl}
            width="180"
            height="60"
            alt="Campaign Logo"
            className="mx-auto object-contain rounded-md"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        <Text className="text-black text-base sm:text-lg font-semibold m-0 tracking-wide">
          Making a Difference <span className="text-[#FE7B01]">Together</span> 🌟
        </Text>
      </Section>

      {/* --- MAIN CONTENT --- */}
      <Section className="email-content px-5 sm:px-10 pt-6 sm:pt-8 pb-6">
        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 mb-5 sm:mb-6 tracking-tight">
          {campaignTitle}
        </Heading>

        <Section>
          <Text className="text-base text-slate-800 mb-4 sm:mb-5 font-semibold m-0">
            Hi {supporterName} 👋,
          </Text>

          <div
            className="text-slate-600 leading-relaxed text-base mt-4"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{
              __html: message,
            }}
          />
        </Section>
      </Section>

      {/* --- MODERN FOOTER --- */}
      <Section className="email-content bg-slate-50 px-5 sm:px-10 py-6 sm:py-8 border-t border-slate-100 text-center">
        <Text className="text-sm text-slate-600 font-medium m-0 mb-2">
          Thank you for being the heart of our campaign. ❤️
        </Text>

        <Text className="text-xs text-slate-400 leading-5 m-0 max-w-sm mx-auto mt-3">
          You are receiving this email because you previously made a contribution or placed an order with us.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export default SupporterUpdateEmail
