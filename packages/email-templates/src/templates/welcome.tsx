import * as React from 'react'
import {
  Button,
  Heading,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components'
import { EmailLayout } from '../layouts/email-layout' // Adjust path based on your folder structure

interface WelcomeEmailProps {
  firstName: string
  companyName: string
  password: string
  productName?: string
  actionUrl: string
  signatureImgSrc?: string
  logoSrc?: string
  greeting?: string
  supportEmail?: string
  footer?: React.ReactNode
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  firstName = 'User',
  companyName = 'Your Company',
  password = 'temp-password',
  productName,
  actionUrl = 'https://example.com/login',
  signatureImgSrc,
  logoSrc = 'https://via.placeholder.com/120x40/03AFA8/ffffff?text=LOGO',
  greeting = 'Welcome aboard!',
  supportEmail = 'support@example.com',
  footer,
}) => {
  const finalProductName = productName || companyName
  const previewText = `Welcome to ${finalProductName}, ${firstName}!`

  return (
    <EmailLayout previewText={previewText}>
      {/* Header */}
      <Section className="px-8 pt-10 pb-6 text-center">
        {logoSrc && (
          <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
            <Img
              src={logoSrc}
              width="180"
              height="60"
              alt={companyName}
              className="mx-auto object-contain rounded-md "
            />
          </div>
        )}

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          {greeting}
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">
          Hi {firstName},
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4">
          Welcome to <strong className="text-slate-800">{finalProductName}</strong>! Your account has been successfully created by an administrator.
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0">
          Please use the temporary password below to sign in to your account.
        </Text>

        {/* Temporary Password Box */}
        <Section className="bg-[#f6f9fc] rounded-xl border-2 border-dashed border-[#03AFA8]/50 my-8 p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#FE7B01] font-bold mb-3 m-0">
            Temporary Password
          </Text>
          <Text className="text-2xl font-mono font-bold tracking-[2px] text-[#03AFA8] m-0 bg-white inline-block px-4 py-2 rounded-lg shadow-sm">
            {password}
          </Text>
        </Section>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-8">
          For your security, please change your password immediately after logging in for the first time.
        </Text>

        {/* CTA Button */}
        <Button
          href={actionUrl}
          className="bg-[#03AFA8] w-full text-white text-base font-semibold py-4 rounded-lg text-center shadow-sm mb-8"
        >
          Login to Your Account
        </Button>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          If you have any questions, feel free to contact our support team at{' '}
          <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] font-semibold underline">
            {supportEmail}
          </Link>.
        </Text>

        <Text className="text-slate-600 text-sm leading-relaxed m-0">
          Best regards,<br />
          <span className="font-semibold text-slate-800">The {companyName} Team</span>
        </Text>

        {signatureImgSrc && (
          <Img
            src={signatureImgSrc}
            alt="Signature"
            width="120"
            height="auto"
            className="mt-4"
          />
        )}
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="px-8 py-6 bg-slate-50 text-center">
        {footer ? (
          footer
        ) : (
          <Text className="text-slate-400 text-xs m-0">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </Text>
        )}
      </Section>
    </EmailLayout>
  )
}