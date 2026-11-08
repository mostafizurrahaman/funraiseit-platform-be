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

export interface TransactionalDetailRow {
  label: string
  value: string
  highlight?: boolean | undefined
}

export interface TransactionalItemRow {
  name: string
  quantity: number
  total?: string | undefined
}

export interface SystemTransactionalEmailProps {
  previewText: string
  headerSubTitle: string
  badgeText: string
  badgeTone?: 'teal' | 'orange' | 'red' | undefined
  heading: string
  greeting?: string | undefined
  introText: string
  details?: TransactionalDetailRow[] | undefined
  items?: TransactionalItemRow[] | undefined
  itemsTitle?: string | undefined
  outroText?: string | undefined
  ctaText?: string | undefined
  ctaUrl?: string | undefined
  footerReason?: string | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
  supportEmail?: string | undefined
}

export const SystemTransactionalEmail = ({
  previewText,
  heading,
  greeting = 'Hi there,',
  introText,
  details = [],
  items = [],
  itemsTitle = 'Items',
  outroText,
  ctaText,
  ctaUrl,
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  supportEmail = 'support@funraisingit.com',
}: SystemTransactionalEmailProps): React.ReactElement => {
  const primaryBtn = {
    display: 'inline-block',
    backgroundColor: '#03AFA8',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 28px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
  }

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
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        )}
        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          {heading}
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold m-0 mb-3">
          {greeting}
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          {introText}
        </Text>

        {/* Details Card */}
        {details.length > 0 && (
          <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200 p-4 sm:p-5 my-4">
            {details.map((row, idx) => (
              <div key={idx} className={idx < details.length - 1 ? 'mb-3' : ''}>
                <Text className="text-xs uppercase text-slate-400 font-bold m-0">{row.label}</Text>
                <Text
                  className={
                    row.highlight
                      ? 'text-base text-[#03AFA8] font-bold m-0 mt-0.5'
                      : 'text-sm text-slate-800 font-semibold m-0 mt-0.5'
                  }
                  style={{ wordBreak: 'break-word' }}
                >
                  {row.value}
                </Text>
              </div>
            ))}
          </Section>
        )}

        {/* Optional Items Table */}
        {items.length > 0 && (
          <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200 p-4 sm:p-5 my-4">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0 mb-3">
              {itemsTitle}
            </Text>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px 6px 0', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>
                      {item.name} × {item.quantity}
                    </td>
                    {item.total && (
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {item.total}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {outroText && (
          <Text className="text-slate-600 text-base leading-relaxed m-0 my-4">
            {outroText}
          </Text>
        )}

        {/* Action Button */}
        {ctaText && ctaUrl && (
          <Section className="my-6 text-center">
            <Button href={ctaUrl} style={primaryBtn} className="email-btn">
              {ctaText}
            </Button>
          </Section>
        )}

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mt-6">
          Best regards,
          <br />
          <span className="font-semibold text-slate-800">The {companyName} Team</span>
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="email-content px-5 sm:px-8 py-6 bg-slate-50 text-center">
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
