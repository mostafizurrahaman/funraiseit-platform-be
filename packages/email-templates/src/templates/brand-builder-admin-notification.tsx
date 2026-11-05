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
  adminDashboardUrl = 'https://admin.funraisingit.com',
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: BrandBuilderAdminNotificationEmailProps): React.ReactElement => {
  const primaryBtn = {
    display: 'inline-block',
    backgroundColor: '#03AFA8',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    padding: '12px 28px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
  }

  return (
    <EmailLayout previewText={`🎨 New Brand Builder Order: "${businessName}" ($${amountPaid.toFixed(2)})`}>
      {/* Header */}
      <Section className="email-header bg-gradient-to-tr from-[#03AFA8] to-[#029690] p-6 sm:p-8 text-center border-b-[5px] border-[#FE7B01]">
        {companyLogo && (
          <div className="bg-white inline-block p-3 rounded-xl shadow-lg mb-4 border border-white/20">
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
        <Text className="text-white text-sm font-semibold m-0 tracking-wide uppercase">
          Admin Notification • Brand Builder
        </Text>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <div className="inline-block px-3 py-1 bg-[#FE7B01]/10 text-[#FE7B01] text-xs font-mono font-bold rounded-full mb-3">
          🎨 NEW BRAND BUILDER ORDER PLACED
        </div>

        <Heading className="text-xl font-bold text-slate-800 m-0 mb-2 tracking-tight">
          A new Brand Builder request has been ordered!
        </Heading>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          Organizer <strong>{organizerName}</strong> just submitted and paid for a new Brand Builder design package for <strong>"{businessName}"</strong>.
        </Text>

        {/* Order Details Card */}
        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200/80 p-4 sm:p-5 my-4">
          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Business / Project Name</Text>
            <Text className="text-base text-slate-900 font-semibold m-0">{businessName}</Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Organizer Details</Text>
            <Text className="text-sm font-semibold m-0 text-slate-800" style={{ wordBreak: 'break-word' }}>
              {organizerName} &lt;{organizerEmail}&gt;
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
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Product / Item to Sell</Text>
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
              <Text className="text-sm text-slate-700 m-0 font-mono" style={{ wordBreak: 'break-word' }}>{colors.join(', ')}</Text>
            </div>
          )}

          <div>
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Order Placed At</Text>
            <Text className="text-xs text-slate-600 m-0 font-mono">{placedAt}</Text>
          </div>
        </Section>

        {/* Action Button */}
        <Section className="my-6 text-center">
          <Button href={adminDashboardUrl} style={primaryBtn} className="email-btn">
            Review in Admin Dashboard
          </Button>
        </Section>

        <Hr className="border-slate-200 my-6" />

        {/* Anti-Spam Footer */}
        <Section className="text-center">
          <Text className="text-slate-400 text-xs m-0 leading-relaxed">
            This is an automated system notification for administrators of {companyName}.
          </Text>
          <Text className="text-slate-400 text-xs m-0 mt-1">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  )
}
