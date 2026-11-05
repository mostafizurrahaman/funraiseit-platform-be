import {
  Img,
  Link,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components'
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
  userEmail = 'user@example.com',
  expirationMinutes = 5,
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  supportEmail = 'support@funraisingit.com',
}: ResetPasswordOTPEmailProps): React.ReactElement => {
  return (
    <EmailLayout previewText={`Your password reset code is ${otpCode}`}>
      {/* Header */}
      <Section className="email-header px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center">
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

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          Reset Your Password
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">
          Hi {userFirstName},
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4" style={{ wordBreak: 'break-word' }}>
          We received a request to reset your password for your account associated with{' '}
          <strong className="text-slate-800">{userEmail}</strong>.
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0">
          Use the verification code below to reset your password:
        </Text>

        {/* OTP Box */}
        <Section className="email-card bg-[#f6f9fc] rounded-xl border-2 border-dashed border-[#03AFA8]/50 my-6 sm:my-8 p-4 sm:p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#03AFA8] font-bold mb-3 m-0">
            Verification Code
          </Text>
          <Text className="email-otp text-3xl sm:text-4xl font-mono font-bold tracking-[6px] sm:tracking-[8px] text-[#03AFA8] m-0">
            {otpCode}
          </Text>
          <Text className="text-slate-500 text-sm mt-3 mb-0 font-medium">
            Valid for {expirationMinutes} minutes
          </Text>
          <Text className="text-slate-500 text-xs mt-2 mb-0">
            Please check your spam or junk mail. If this code does not work, request another one.
          </Text>
        </Section>

        {/* Warning Alert */}
        <Section className="email-card bg-[#FE7B01]/10 border border-[#FE7B01]/30 rounded-lg p-4 mb-6 sm:mb-8">
          <Text className="text-[#FE7B01] font-semibold text-sm m-0 mb-1">
            ⚠️ Didn't request this?
          </Text>
          <Text className="text-slate-700 text-sm m-0 leading-relaxed">
            If you didn't request a password reset, you can safely ignore this email. Your password
            won't be changed.
          </Text>
        </Section>

        {/* Security Tips */}
        <Section>
          <Text className="text-slate-800 text-sm font-semibold m-0 mb-2">
            Security Tips:
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 ml-1">
            • Never share this code with anyone<br />
            • Our team will never ask for your password<br />
            • Make sure you're on our official website
          </Text>
        </Section>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="email-content px-5 sm:px-8 py-6 bg-slate-50 text-center">
        <Text className="text-slate-500 text-sm m-0 mb-4">
          Need help?{' '}
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
