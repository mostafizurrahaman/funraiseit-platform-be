import {
  Heading,
  Hr,
  Section,
  Text,
  Img,
  Link,
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
  companyName = 'FunRaisingIt',
  supportEmail = 'support@funraisingit.com',
}: SupporterUpdateEmailProps): React.ReactElement => {
  return (
    <EmailLayout previewText={`Campaign update: ${campaignTitle}`}>
      {/* Header */}
      <Section className="email-header px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center">
        <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
          <Img
            src={logoUrl}
            width="180"
            height="60"
            alt={companyName}
            className="mx-auto object-contain rounded-md"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          {campaignTitle}
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-base text-slate-800 mb-4 font-semibold m-0">
          Hi {supporterName},
        </Text>

        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200 p-4 sm:p-5 my-4">
          <div
            className="text-slate-700 leading-relaxed text-base"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{
              __html: message,
            }}
          />
        </Section>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mt-6">
          Thank you again for your generous support!
          <br />
          <span className="font-semibold text-slate-800">The {companyName} Team</span>
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="email-content bg-slate-50 px-5 sm:px-8 py-6 text-center">
        <Text className="text-slate-500 text-sm m-0 mb-3">
          Questions?{' '}
          <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] font-semibold underline">
            Contact Support
          </Link>
        </Text>
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export default SupporterUpdateEmail
