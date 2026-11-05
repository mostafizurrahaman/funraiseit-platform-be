import {
  Heading,
  Section,
  Text,
  Img,
  Link,
  Hr,
  Button,
} from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

export interface SupportReplyEmailProps {
  userName?: string | undefined
  ticketNo: string
  subject: string
  originalMessage?: string | undefined
  replyMessage: string
  logoUrl?: string | undefined
  companyName?: string | undefined
  supportEmail?: string | undefined
  actionUrl?: string | undefined
  companyAddress?: string | undefined
}

export const SupportReplyEmail = ({
  userName = 'Customer',
  ticketNo,
  subject,
  originalMessage,
  replyMessage,
  logoUrl = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  companyName = 'FunRaisingIt',
  supportEmail = 'support@funraisingit.com',
  actionUrl,
  companyAddress,
}: SupportReplyEmailProps): React.ReactElement => {
  return (
    <EmailLayout previewText={`Support Ticket #${ticketNo}: ${subject}`}>
      {/* Header with Logo */}
      <Section className="email-header bg-gradient-to-tr from-[#03AFA8] to-[#029690] p-6 sm:p-8 text-center border-b-[5px] border-[#FE7B01]">
        <div className="bg-white inline-block p-3 rounded-xl shadow-lg mb-4 border border-white/20">
          <Img
            src={logoUrl}
            width="180"
            height="60"
            alt={companyName}
            className="mx-auto object-contain rounded-md"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        <Text className="text-white text-base font-semibold m-0 tracking-wide">
          Customer Support Team
        </Text>
      </Section>

      {/* Ticket Details & Main Body */}
      <Section className="email-content px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <div className="inline-block px-3 py-1 bg-[#03AFA8]/10 text-[#03AFA8] text-xs font-mono font-bold rounded-full mb-3">
          Ticket #{ticketNo}
        </div>

        <Heading className="text-xl font-bold text-slate-800 m-0 mb-4 tracking-tight">
          {subject}
        </Heading>

        <Text className="text-base text-slate-800 font-semibold m-0 mb-4">
          Hi {userName},
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          Our support team has reviewed your request and provided an update below:
        </Text>

        {/* Support Team Reply Box */}
        <Section className="email-card bg-[#f6f9fc] rounded-xl border-l-4 border-[#03AFA8] p-4 sm:p-5 my-4">
          <Text className="text-xs uppercase tracking-wider text-[#03AFA8] font-bold m-0 mb-2">
            Support Team Response:
          </Text>
          <div
            className="text-slate-700 text-base leading-relaxed"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{
              __html: replyMessage,
            }}
          />
        </Section>

        {/* Customer Original Request */}
        {originalMessage && (
          <Section className="email-card bg-slate-50 rounded-xl border border-slate-200 p-4 mt-6">
            <Text className="text-xs uppercase tracking-wider text-slate-400 font-bold m-0 mb-2">
              Your Original Message:
            </Text>
            <Text className="text-slate-600 text-sm leading-relaxed italic m-0" style={{ wordBreak: 'break-word' }}>
              "{originalMessage}"
            </Text>
          </Section>
        )}

        {/* Optional Action Button */}
        {actionUrl && (
          <Section className="mt-6 sm:mt-8 text-center">
            <Button
              href={actionUrl}
              style={{
                backgroundColor: '#03AFA8',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
                width: '100%',
                padding: '12px 20px',
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
              className="email-btn bg-[#03AFA8] w-full text-white text-base font-semibold py-3 rounded-lg text-center shadow-sm block"
            >
              View Ticket Status
            </Button>
          </Section>
        )}

        <Text className="text-slate-500 text-sm mt-6 sm:mt-8 m-0">
          If you have further questions or if this issue is not resolved, simply reply to this email or contact us at{' '}
          <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] font-semibold underline">
            {supportEmail}
          </Link>.
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="email-content bg-slate-50 px-5 sm:px-8 py-6 text-center">
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

export default SupportReplyEmail
