import { Column, Hr, Img, Link, Row, Section, Text, Heading } from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

export interface ResetPasswordOTPEmailProps {
  userFirstName?: string | undefined
  otpCode?: string | undefined
  userEmail?: string | undefined
  expirationMinutes?: number | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
  actionUrl?: string | undefined
  supportEmail?: string | undefined
  companyAddress?: string | undefined
}

export const ResetPasswordOTPEmail = ({
  userFirstName = 'User',
  otpCode = '123456',
  expirationMinutes = 5,
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  supportEmail = 'support@funraisingit.com',
  companyAddress,
}: ResetPasswordOTPEmailProps): React.ReactElement => {
  return (
    <EmailLayout previewText={`Your verification code for ${companyName} is ${otpCode}`}>
      {/* Header */}
      <Section className="email-header px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center">
        {companyLogo ? (
          <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
            <Img
              src={companyLogo}
              width="180"
              height="60"
              alt={companyName}
              className="mx-auto object-contain rounded-md"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        ) : (
          <div className="inline-block px-4 py-2 bg-[#03AFA8]/10 rounded-lg mb-5">
            <Text className="text-[#03AFA8] font-bold text-lg m-0">{companyName}</Text>
          </div>
        )}

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          Account Verification Code
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-600 text-base leading-relaxed font-semibold m-0 mb-4">
          Hi {userFirstName},
        </Text>
        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4">
          Thank you for using <strong>{companyName}</strong>. Please use the following verification
          code to complete your account security request. This code will remain valid for {expirationMinutes} minutes.
        </Text>

        {/* OTP Box */}
        <Section className="email-card bg-[#f6f9fc] rounded-xl border-2 border-dashed border-[#03AFA8]/50 my-6 sm:my-8 p-4 sm:p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#FE7B01] font-bold mb-3 m-0">
            Your Code
          </Text>
          <Row>
            <Column>
              <Text className="email-otp text-3xl sm:text-4xl font-mono font-bold tracking-[6px] sm:tracking-[12px] text-[#03AFA8] m-0">
                {otpCode}
              </Text>
            </Column>
          </Row>
          <Text className="text-slate-500 text-xs mt-3 mb-0">
            Enter this code in the app to continue.
          </Text>
        </Section>

        <Text className="text-slate-400 text-sm mt-6 text-center italic m-0">
          If you didn't request this code, you can safely ignore this email.
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="email-content px-5 sm:px-8 py-6 bg-slate-50 text-center">
        {supportEmail && (
          <Text className="text-slate-500 text-sm m-0 mb-3">
            Questions?{' '}
            <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] font-semibold underline">
              Contact Support
            </Link>
          </Text>
        )}
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
        {companyAddress && (
          <Text className="text-slate-400 text-xs mt-1 m-0">{companyAddress}</Text>
        )}
      </Section>
    </EmailLayout>
  )
}
