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

export interface CampaignLaunchedAdminNotificationEmailProps {
  campaignName: string
  campaignCode: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string | undefined
  goalAmount?: number | undefined
  launchFee?: number | undefined
  isFreeLaunch?: boolean | undefined
  promoCode?: string | undefined
  launchedAt?: string | undefined
  campaignUrl?: string | undefined
  adminDashboardUrl?: string | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
}

export const CampaignLaunchedAdminNotificationEmail = ({
  campaignName,
  campaignCode,
  organizerName,
  organizerEmail,
  organizerPhone,
  goalAmount,
  launchFee = 0,
  isFreeLaunch = false,
  promoCode,
  launchedAt = new Date().toLocaleString(),
  campaignUrl,
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: CampaignLaunchedAdminNotificationEmailProps): React.ReactElement => {
  const liveUrl = campaignUrl || `https://funraisingit.com/campaign/${campaignCode}`

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
    <EmailLayout previewText={`New campaign launched on ${companyName}: ${campaignName}`}>
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
          New Campaign Published
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold m-0 mb-3">
          Hi Team,
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          A new campaign <strong>"{campaignName}"</strong> organized by <strong>{organizerName}</strong> has completed setup and is now live on {companyName}.
        </Text>

        {/* Campaign Details Card */}
        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200 p-4 sm:p-5 my-4">
          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Campaign Name</Text>
            <Text className="text-base text-slate-900 font-semibold m-0">{campaignName}</Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Campaign Code</Text>
            <Text className="text-base text-[#03AFA8] font-mono font-bold m-0">{campaignCode}</Text>
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

          {goalAmount !== undefined && goalAmount > 0 && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Fundraising Goal</Text>
              <Text className="text-sm font-bold m-0 text-slate-800">${goalAmount.toLocaleString()}</Text>
            </div>
          )}

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Launch Fee</Text>
            <Text className="text-sm font-semibold m-0 text-slate-800">
              {isFreeLaunch
                ? `Promo Applied ${promoCode ? `(${promoCode})` : ''}`
                : `$${launchFee.toFixed(2)} Paid`}
            </Text>
          </div>

          <div>
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Published At</Text>
            <Text className="text-xs text-slate-600 m-0">{launchedAt}</Text>
          </div>
        </Section>

        <Section className="my-6 text-center">
          <Button href={liveUrl} style={primaryBtn} className="email-btn">
            View Campaign Page
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
