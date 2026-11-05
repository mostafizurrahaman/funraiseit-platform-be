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
  adminDashboardUrl = 'https://admin.funraisingit.com',
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: CampaignLaunchedAdminNotificationEmailProps): React.ReactElement => {
  const liveUrl = campaignUrl || `https://funraisingit.com/campaign/${campaignCode}`

  const primaryBtn = {
    display: 'inline-block',
    backgroundColor: '#03AFA8',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    padding: '12px 24px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
    margin: '4px',
  }

  const secondaryBtn = {
    display: 'inline-block',
    backgroundColor: '#FFFFFF',
    color: '#03AFA8',
    fontSize: '14px',
    fontWeight: 600,
    padding: '12px 24px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
    border: '1px solid #03AFA8',
    margin: '4px',
  }

  return (
    <EmailLayout previewText={`🚀 New Campaign Launched: ${campaignName} (${campaignCode})`}>
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
          Admin Notification • Campaign Live
        </Text>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <div className="inline-block px-3 py-1 bg-[#03AFA8]/10 text-[#03AFA8] text-xs font-mono font-bold rounded-full mb-3">
          🚀 CAMPAIGN OFFICIALLY LIVE
        </div>

        <Heading className="text-xl font-bold text-slate-800 m-0 mb-2 tracking-tight">
          A new campaign has been launched!
        </Heading>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          Campaign <strong>"{campaignName}"</strong> has completed onboarding and launch requirements and is now publicly live on {companyName}.
        </Text>

        {/* Campaign Details Card */}
        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200/80 p-4 sm:p-5 my-4">
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
              {organizerName} &lt;{organizerEmail}&gt;
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
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Launch Fee Status</Text>
            <Text className="text-sm font-semibold m-0 text-slate-800">
              {isFreeLaunch
                ? `100% Free Promo Bypass ${promoCode ? `(${promoCode})` : ''}`
                : `$${launchFee.toFixed(2)} Paid`}
            </Text>
          </div>

          <div>
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Launched At</Text>
            <Text className="text-xs text-slate-600 m-0 font-mono">{launchedAt}</Text>
          </div>
        </Section>

        {/* Action Buttons */}
        <Section className="my-6 text-center">
          <Button href={liveUrl} style={primaryBtn} className="email-btn">
            View Campaign
          </Button>
          <Button href={adminDashboardUrl} style={secondaryBtn} className="email-btn">
            Admin Dashboard
          </Button>
        </Section>

        <Hr className="border-slate-200 my-6" />

        {/* Deliverability & Compliance Footer */}
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
