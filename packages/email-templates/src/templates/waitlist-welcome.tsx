import {
  Heading,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

export interface WaitlistWelcomeEmailProps {
  email: string
  memberNumber: string
  isVip?: boolean | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
  supportEmail?: string | undefined
  clientUrl?: string | undefined
}

export const WaitlistWelcomeEmail = ({
  email,
  memberNumber = '#1',
  isVip = false,
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  supportEmail = 'support@funraisingit.com',
}: WaitlistWelcomeEmailProps): React.ReactElement => {
  const previewText = `Your early access registration on ${companyName} is confirmed (${memberNumber}).`

  return (
    <EmailLayout previewText={previewText}>
      {/* Header */}
      <Section className="email-header px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center">
        {companyLogo && (
          <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
            <Img
              src={companyLogo}
              width="180"
              height="60"
              alt={companyName}
              className="mx-auto object-contain rounded-md"
              style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            />
          </div>
        )}

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          Early Access Registration Confirmed
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">
          Hi there,
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4" style={{ wordBreak: 'break-word' }}>
          Thank you for registering with <strong className="text-slate-800">{companyName}</strong>. Your spot on our early access list has been confirmed for <strong className="text-slate-800">{email}</strong>.
        </Text>

        {/* Member Badge Box */}
        <Section className="email-card bg-[#f6f9fc] rounded-xl border border-slate-200 my-6 p-4 sm:p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#03AFA8] font-bold mb-2 m-0">
            {isVip ? 'Priority Access Member' : 'Early Access Member'}
          </Text>
          <Text className="text-2xl sm:text-3xl font-mono font-bold tracking-[2px] text-[#03AFA8] m-0 bg-white inline-block px-4 sm:px-5 py-2.5 rounded-xl shadow-sm border border-slate-100">
            Member {memberNumber}
          </Text>
        </Section>

        <Section className="email-card bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 mb-6">
          <Text className="text-slate-800 font-bold text-sm mb-3 m-0">
            What happens next:
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
            <strong>Early Onboarding:</strong> We will notify you as soon as your account access is ready so you can explore the platform.
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0">
            <strong>Community Support:</strong> Our onboarding team is available anytime if you need help planning your first fundraiser.
          </Text>
        </Section>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          If you have any questions, feel free to contact our team at{' '}
          <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] font-semibold underline">
            {supportEmail}
          </Link>.
        </Text>

        <Text className="text-slate-600 text-sm leading-relaxed m-0">
          Best regards,
          <br />
          <span className="font-semibold text-slate-800">The {companyName} Team</span>
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      <Section className="email-content px-5 sm:px-8 py-6 bg-slate-50 text-center">
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
      </Section>
    </EmailLayout>
  )
}
