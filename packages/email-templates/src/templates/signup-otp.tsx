import { Button, Column, Hr, Img, Link, Row, Section, Text, Heading } from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

export interface SignupOTPEmailProps {
  userFirstName?: string | undefined
  otpCode: string
  companyName?: string | undefined
  companyLogo?: string | undefined
  supportEmail?: string | undefined
  expirationMinutes?: number | undefined
  actionUrl?: string | undefined
  companyAddress?: string | undefined
}

export const SignupOTPEmail = ({
  userFirstName = 'User',
  otpCode,
  companyName = 'FunRaisingIt',
  companyLogo,
  supportEmail = 'support@funraisingit.com',
  expirationMinutes = 1,
  actionUrl,
  companyAddress,
}: SignupOTPEmailProps): React.ReactElement => {
  return (
    <EmailLayout previewText={`Your verification code is ${otpCode}`}>
      {/* Header */}
      <Section className="px-8 pt-10 pb-6 text-center">
        {companyLogo ? (
          <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
            <Img
              src={companyLogo}
              width="180"
              height="60"
              alt={companyName}
              className="mx-auto object-contain rounded-md"
            />
          </div>
        ) : (
          <div className="inline-block px-4 py-2 bg-[#03AFA8]/10 rounded-lg mb-5">
            <Text className="text-[#03AFA8] font-bold text-lg m-0">{companyName}</Text>
          </div>
        )}

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          Verify your email
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="px-8 pb-8">
        <Text className="text-slate-600 text-base leading-relaxed font-semibold m-0 mb-4">
          Hi {userFirstName},
        </Text>
        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4">
          Thanks for starting your journey with <strong>{companyName}</strong>. Use the following
          verification code to complete your registration. This code will expire in {expirationMinutes} minutes.
        </Text>

        {/* OTP Box */}
        <Section className="bg-[#f6f9fc] rounded-xl border-2 border-dashed border-[#03AFA8]/50 my-8 p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#FE7B01] font-bold mb-3 m-0">
            Your Code
          </Text>
          <Row>
            <Column>
              <Text className="text-4xl font-mono font-bold tracking-[12px] text-[#03AFA8] m-0">
                {otpCode}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* Primary Color Button */}
        {/* <Button
          href={actionUrl || '#'}
          style={{
            backgroundColor: '#03AFA8',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            textAlign: 'center',
            display: 'block',
            width: '100%',
            padding: '14px 20px',
            borderRadius: '8px',
            boxSizing: 'border-box',
          }}
          className="bg-[#03AFA8] w-full text-white text-base font-semibold py-4 rounded-lg text-center shadow-sm block"
        >
          Confirm Email Address
        </Button> */}

        <Text className="text-slate-400 text-sm mt-6 text-center italic m-0">
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="px-8 py-6 bg-slate-50 text-center">
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
