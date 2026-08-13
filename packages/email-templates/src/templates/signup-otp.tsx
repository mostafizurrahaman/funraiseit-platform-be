import { Button, Column, Hr, Img, Link, Row, Section, Text, Heading } from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

interface SignupOTPEmailProps {
  userFirstName: string
  otpCode: string
  companyName: string
  companyLogo: string
}

export const SignupOTPEmail = ({
  userFirstName,
  otpCode,
  companyName,
  companyLogo,
}: SignupOTPEmailProps) => {
  return (
    <EmailLayout previewText={`Your verification code is ${otpCode}`}>
      {/* Header */}
      <Section className="px-8 pt-10 pb-6 text-center">
        {/* Modern Logo Wrapper (Same styling as the Campaign template to preserve aspect ratio) */}
        <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
          <Img
            src={companyLogo}
            width="180"
            height="60"
            alt={companyName}
            className="mx-auto object-contain rounded-md"
          />
        </div>
        
        {/* Primary Color for Heading */}
        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          Verify your email
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="px-8 pb-8">
        <Text className="text-slate-600 text-base leading-relaxed font-semibold">
          Hi {userFirstName},
        </Text>
        <Text className="text-slate-600 text-base leading-relaxed">
          Thanks for starting your journey with <strong>{companyName}</strong>. Use the following
          verification code to complete your registration. This code will expire in 10 minutes.
        </Text>

        {/* OTP Box */}
        {/* Using Primary Color for border and OTP text, and Secondary Color for the label */}
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
        <Button
          href={`https://example.com/verify?code=${otpCode}`}
          className="bg-[#03AFA8] w-full text-white text-base font-semibold py-4 rounded-lg text-center shadow-sm"
        >
          Confirm Email Address
        </Button>

        <Text className="text-slate-400 text-sm mt-6 text-center italic">
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Section>

      <Hr className="border-slate-100" />

      {/* Footer */}
      <Section className="px-8 py-6 bg-slate-50/50 text-center">
        <Row className="mb-4">
          <Column>
            <Link href="https://twitter.com/company" className="text-[#03AFA8] mx-2 text-xs font-semibold">
              Twitter
            </Link>
            <Link href="https://linkedin.com/company" className="text-[#03AFA8] mx-2 text-xs font-semibold">
              LinkedIn
            </Link>
          </Column>
        </Row>
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
        <Text className="text-slate-400 text-xs mt-1">123 Business St, San Francisco, CA 94107</Text>
      </Section>
    </EmailLayout>
  )
}