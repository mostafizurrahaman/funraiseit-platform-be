import {
  Button,
  Heading,
  Hr,
  Img,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

export interface BrandBuilderAdminNotificationEmailProps {
  businessName: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string | undefined
  amountPaid: number
  sellingItem?: string | undefined
  brandStyle?: string | undefined
  budget?: string | undefined
  colors?: string[] | undefined
  placedAt?: string | undefined
  adminDashboardUrl?: string | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
}

export const BrandBuilderAdminNotificationEmail = ({
  businessName,
  organizerName,
  organizerEmail,
  organizerPhone,
  amountPaid,
  sellingItem,
  brandStyle,
  budget,
  colors,
  placedAt = new Date().toLocaleString(),
  adminDashboardUrl = 'https://funraisingit.com',
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: BrandBuilderAdminNotificationEmailProps): React.ReactElement => {
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
    <EmailLayout previewText={`New Brand Builder order received for ${businessName}`}>
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
          New Brand Builder Order
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold m-0 mb-3">
          Hi Team,
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          <strong>{organizerName}</strong> has submitted and completed payment for a new Brand Builder design package for <strong>"{businessName}"</strong>.
        </Text>

        {/* Order Details Card */}
        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200 p-4 sm:p-5 my-4">
          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Business Name</Text>
            <Text className="text-base text-slate-900 font-semibold m-0">{businessName}</Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Organizer</Text>
            <Text className="text-sm font-semibold m-0 text-slate-800" style={{ wordBreak: 'break-word' }}>
              {organizerName} ({organizerEmail})
            </Text>
            {organizerPhone && (
              <Text className="text-xs text-slate-500 m-0 mt-0.5">Phone: {organizerPhone}</Text>
            )}
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Amount Paid</Text>
            <Text className="text-base font-bold m-0 text-[#03AFA8]">${amountPaid.toFixed(2)}</Text>
          </div>

          {sellingItem && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Item to Sell</Text>
              <Text className="text-sm text-slate-700 m-0">{sellingItem}</Text>
            </div>
          )}

          {brandStyle && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Brand Style</Text>
              <Text className="text-sm text-slate-700 m-0">{brandStyle}</Text>
            </div>
          )}

          {budget && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Target Budget</Text>
              <Text className="text-sm text-slate-700 m-0">{budget}</Text>
            </div>
          )}

          {colors && colors.length > 0 && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Preferred Colors</Text>
              <Text className="text-sm text-slate-700 m-0" style={{ wordBreak: 'break-word' }}>{colors.join(', ')}</Text>
            </div>
          )}

          <div>
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Submitted At</Text>
            <Text className="text-xs text-slate-600 m-0">{placedAt}</Text>
          </div>
        </Section>

        <Section className="my-6 text-center">
          <Button href={adminDashboardUrl} style={primaryBtn} className="email-btn">
            View Request in Dashboard
          </Button>
        </Section>

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
