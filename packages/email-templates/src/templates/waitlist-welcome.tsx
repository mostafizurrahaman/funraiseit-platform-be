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
    ? `Your VIP priority access is confirmed: Member ${memberNumber} on ${companyName}.`
    : `Your waitlist registration is confirmed: Member ${memberNumber} on ${companyName}.`

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
              style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            />
          </div>
        )}

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          {isVip ? "You're on the VIP Priority List" : 'Welcome to the Waitlist'}
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">
          Hi there,
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-4">
          Your reservation on the <strong className="text-slate-800">{companyName}</strong> waitlist has been successfully confirmed for <strong className="text-slate-800">{email}</strong>.
        </Text>

        {/* Member Badge & Number Box */}
        <Section className="bg-[#f6f9fc] rounded-2xl border-2 border-dashed border-[#03AFA8]/50 my-6 p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#FE7B01] font-bold mb-2 m-0">
            {isVip ? 'VIP Priority Member' : 'Waitlist Member'}
          </Text>
          <Text className="text-3xl font-mono font-bold tracking-[2px] text-[#03AFA8] m-0 bg-white inline-block px-5 py-2.5 rounded-xl shadow-sm border border-slate-100">
            Member {memberNumber}
          </Text>
          <Text className="text-slate-500 text-xs mt-3 m-0">
            {isVip
              ? 'You have secured complimentary VIP Priority Early Access.'
              : 'You have secured standard early access for public launch.'}
          </Text>
        </Section>

        {/* Perks overview */}
        <Section className="bg-white rounded-xl border border-slate-200/80 p-5 mb-6">
          <Text className="text-slate-800 font-bold text-sm mb-3 m-0">
            What happens next:
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
            <strong>Priority Early Access:</strong> You will be notified ahead of public launch to set up your account and explore the platform.
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
            <strong>Platform Updates:</strong> You will receive occasional updates as development milestones are achieved.
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0">
            <strong>Creator Community:</strong> Early members gain direct access to our founding community and onboarding team.
          </Text>
        </Section>

        {/* CTA Button */}
        <Button
          href={clientUrl}
          style={{
            backgroundColor: '#03AFA8',
            color: '#ffffff',
            fontSize: '15px',
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
          Learn More About {companyName}
        </Button>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          If you have questions or feedback, feel free to contact our team anytime at{' '}
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

      {/* Footer - CAN-SPAM & Mailbox Provider Compliance */}
      <Section className="px-8 py-6 bg-slate-50 text-center">
        <Text className="text-slate-500 text-xs m-0 mb-2 leading-relaxed">
          You are receiving this confirmation because <strong>{email}</strong> was registered for early access updates on{' '}
          <Link href={clientUrl} className="text-slate-600 underline">
            {clientUrl.replace(/^https?:\/\//, '')}
          </Link>.
        </Text>
        <Text className="text-slate-400 text-xs m-0 mb-2">
          If you did not request this, you can safely disregard this email or reply with &quot;Unsubscribe&quot; to be removed immediately.
        </Text>
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
      </Section>
    </EmailLayout>
  )
}
