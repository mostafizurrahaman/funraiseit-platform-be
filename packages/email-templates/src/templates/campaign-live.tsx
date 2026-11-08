import { Button, Img, Link, Section, Text, Heading, Hr } from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

interface CampaignLiveEmailProps {
  organizerName?: string | undefined
  campaignName?: string | undefined
  campaignCode?: string | undefined
  companyLogo?: string | undefined
}

export const CampaignLiveEmail = ({
  organizerName = 'Organizer',
  campaignName = 'Your Campaign',
  campaignCode = 'CPN-ABC1234',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: CampaignLiveEmailProps) => {
  const campaignLink = `https://funraisingit.com/campaign/${campaignCode}`

  const button = {
    display: 'inline-block',
    backgroundColor: '#03AFA8',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 600,
    padding: '12px 32px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
  }

  return (
    <EmailLayout previewText={`Your campaign "${campaignName}" is now live on FunRaisingIt!`}>
      {/* Header */}
      <Section className="email-header px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center">
        <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
          <Img
            src={companyLogo}
            width="180"
            height="60"
            alt="FunRaisingIt"
            className="mx-auto object-contain rounded-md"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight">
          Your Campaign is Live!
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">Hi {organizerName},</Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          Great news! Your FunRaisingIt campaign <strong>"{campaignName}"</strong> has been published
          and is officially ready to share with your community.
        </Text>

        {/* Campaign Link Box */}
        <Section className="email-card bg-[#f6f9fc] rounded-xl border border-slate-200 my-6 p-4 sm:p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#03AFA8] font-bold mb-3 m-0">
            Your Campaign Link
          </Text>
          <Link
            href={campaignLink}
            className="text-base sm:text-lg font-semibold text-slate-800 break-all underline decoration-[#03AFA8] m-0 block mb-5"
            style={{ wordBreak: 'break-all' }}
          >
            {campaignLink}
          </Link>

          <Section style={{ textAlign: 'center', margin: '20px 0 6px 0' }}>
            <Button href={campaignLink} style={button} className="email-btn">
              View Your Campaign
            </Button>
          </Section>
        </Section>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          Sharing your campaign link directly with family, friends, coworkers, and community members
          is the best way to build early momentum toward your goal.
        </Text>

        {/* Sharing Tips Box */}
        <Section className="email-card mb-6 bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-100">
          <Text className="text-slate-800 text-base font-semibold m-0 mb-3">
            Recommended places to share your link:
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 ml-2">
            • Direct messages to friends and family
            <br />
            • Facebook, Instagram, and TikTok
            <br />
            • Team or community group chats
            <br />
            • Organization newsletters and pages
          </Text>
        </Section>

        <Text className="text-slate-600 text-sm leading-relaxed m-0">
          Best regards,
          <br />
          <span className="font-semibold text-slate-800">The FunRaisingIt Team</span>
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="email-content px-5 sm:px-8 py-6 bg-slate-50 text-center">
        <Text className="text-slate-500 text-sm m-0 mb-3">
          Questions?{' '}
          <Link
            href="mailto:funraisingit@gmail.com"
            className="text-[#03AFA8] font-semibold underline"
          >
            Contact Support
          </Link>
        </Text>

        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} FunRaisingIt. All rights reserved.
        </Text>
      </Section>
    </EmailLayout>
  )
}
