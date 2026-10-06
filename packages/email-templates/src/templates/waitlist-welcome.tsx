import {
  Button,
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
  clientUrl = 'https://funraisingit.com',
}: WaitlistWelcomeEmailProps): React.ReactElement => {
  const previewText = isVip
    ? `🎉 You're on the VIP Priority List as Member ${memberNumber}!`
    : `🎉 Welcome to the FunRaisingIt Waiting List! (Member ${memberNumber})`

  return (
    <EmailLayout previewText={previewText}>
      {/* Header */}
      <Section className="px-8 pt-10 pb-6 text-center">
        {companyLogo && (
          <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
            <Img
              src={companyLogo}
              width="180"
              height="60"
              alt={companyName}
              className="mx-auto object-contain rounded-md"
            />
          </div>
        )}

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          {isVip ? "🎉 YOU'RE ON THE VIP PRIORITY LIST!" : '🎉 WELCOME TO THE WAITING LIST!'}
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">
          Hi there,
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4">
          Congratulations! Your spot on the <strong className="text-slate-800">{companyName}</strong> waiting list has been successfully confirmed for <strong className="text-slate-800">{email}</strong>.
        </Text>

        {/* Member Badge & Number Box */}
        <Section className="bg-[#f6f9fc] rounded-2xl border-2 border-dashed border-[#03AFA8]/50 my-6 p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#FE7B01] font-bold mb-2 m-0">
            {isVip ? '⭐ VIP PRIORITY MEMBER' : '✨ WAITING LIST MEMBER'}
          </Text>
          <Text className="text-3xl font-mono font-bold tracking-[2px] text-[#03AFA8] m-0 bg-white inline-block px-5 py-2.5 rounded-xl shadow-sm border border-slate-100">
            Member {memberNumber}
          </Text>
          <Text className="text-slate-500 text-xs mt-3 m-0">
            {isVip
              ? 'You have secured 100% Free VIP Priority Early Access.'
              : 'You have secured standard early access for public launch.'}
          </Text>
        </Section>

        {/* Perks overview */}
        <Section className="bg-white rounded-xl border border-slate-200/80 p-5 mb-6">
          <Text className="text-slate-800 font-bold text-sm mb-3 m-0">
            Here is what you can look forward to:
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
            🚀 <strong>Priority Early Access:</strong> Be among the first to experience our next-generation fundraising platform.
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
            🔔 <strong>Launch Announcements:</strong> Receive exclusive drop alerts, progress updates, and special feature previews.
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0">
            🤝 <strong>Creator Community:</strong> Connect with fellow innovators, organizers, and supporters.
          </Text>
        </Section>

        {/* CTA Button */}
        <Button
          href={clientUrl}
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
            borderRadius: '10px',
            boxSizing: 'border-box',
            marginBottom: '28px',
          }}
        >
          Visit FunRaisingIt
        </Button>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          If you have any questions or feedback, reach out anytime at{' '}
          <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] font-semibold underline">
            {supportEmail}
          </Link>.
        </Text>

        <Text className="text-slate-600 text-sm leading-relaxed m-0">
          Warm regards,<br />
          <span className="font-semibold text-slate-800">The {companyName} Team</span>
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="px-8 py-6 bg-slate-50 text-center">
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
      </Section>
    </EmailLayout>
  )
}
