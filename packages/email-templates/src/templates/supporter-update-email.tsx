import {
  Heading,
  Section,
  Text,
  Img,
} from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout' // Adjust this path based on your folder structure

interface SupporterUpdateEmailProps {
  supporterName: string
  campaignTitle: string
  message: string // HTML content
  logoUrl?: string
}

export const SupporterUpdateEmail = ({
  supporterName = 'Supporter',
  campaignTitle = 'Campaign Update',
  message = '<p>Thank you for your support!</p>',
  // Your permanent S3 bucket logo URL
  logoUrl = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: SupporterUpdateEmailProps) => {
  return (
    <EmailLayout previewText={`An update regarding ${campaignTitle}`}>
      {/* --- BRANDED HERO BANNER --- */}
      {/* Using Primary color (#03AFA8) as the main background and Secondary (#FE7B01) as a pop-out accent border */}
      <Section className="bg-gradient-to-tr from-[#03AFA8] to-[#029690] p-10 text-center border-b-[5px] border-[#FE7B01]">
        
        {/* White card wrapper for the logo to preserve aspect ratio */}
        <div className="bg-white inline-block p-3 rounded-xl shadow-lg mb-5 border border-white/20">
          <Img
            src={logoUrl}
            width="180"
            height="60"
            alt="Campaign Logo"
            className="mx-auto object-contain rounded-md"
          />
        </div>

        <Text className="text-black text-lg font-semibold m-0 tracking-wide">
          Making a Difference <span className="text-[#FE7B01]">Together</span> 🌟
        </Text>
      </Section>
      {/* ---------------------------------- */}

      {/* --- MAIN CONTENT --- */}
      <Section className="px-10 pt-8 pb-6">
        {/* Using Primary color for the heading to tie the branding together */}
        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 mb-6 tracking-tight">
          {campaignTitle}
        </Heading>

        <Section>
          <Text className="text-base text-slate-800 mb-5 font-semibold m-0">
            Hi {supporterName} 👋,
          </Text>

          {/* Render HTML message */}
          <div
            className="text-slate-600 leading-relaxed text-base mt-4"
            dangerouslySetInnerHTML={{
              __html: message,
            }}
          />
        </Section>
      </Section>
      {/* ---------------------------------- */}

      {/* --- MODERN FOOTER --- */}
      <Section className="bg-slate-50 px-10 py-8 border-t border-slate-100 text-center">
        <Text className="text-sm text-slate-600 font-medium m-0 mb-2">
          Thank you for being the heart of our campaign. ❤️
        </Text>
        
        <Text className="text-xs text-slate-400 leading-5 m-0 max-w-sm mx-auto mt-3">
          You are receiving this email because you previously made a contribution or placed an order with us.
        </Text>
      </Section>
      {/* ---------------------------------- */}
    </EmailLayout>
  )
}

export default SupporterUpdateEmail