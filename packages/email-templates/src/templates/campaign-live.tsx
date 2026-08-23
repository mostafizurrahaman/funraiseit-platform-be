import { Button, Img, Link, Section, Text, Heading, Hr } from '@react-email/components'
import * as React from 'react'
import { EmailLayout } from '../layouts/email-layout'

interface CampaignLiveEmailProps {
  organizerName?: string
  campaignName?: string
  campaignCode?: string // 👈 Now accepts campaignCode directly
  companyLogo?: string
}

export const CampaignLiveEmail = ({
  organizerName = 'Organizer',
  campaignName = 'Your Campaign',
  campaignCode = 'CPN-ABC1234', // Default for preview
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
}: CampaignLiveEmailProps) => {
  // Construct the exact campaign link
  const campaignLink = `https://funraisingit.com/campaign/${campaignCode}`

  const button = {
    display: "inline-block",
    backgroundColor: "#03AFA8",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 600,
    padding: "12px 32px",
    borderRadius: "8px",
    textAlign: "center",
    textDecoration: "none",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  }

  return (
    <EmailLayout previewText={`🎉 ${campaignName} is officially LIVE! Ready to share.`}>
      {/* --- HEADER --- */}
      <Section className="px-8 pt-10 pb-6 text-center">
        {/* Modern Logo Wrapper */}
        <div className="bg-white inline-block p-3 rounded-xl shadow-md border border-slate-100 mb-5">
          <Img
            src={companyLogo}
            width="180"
            height="60"
            alt="FunRaisingIt"
            className="mx-auto object-contain rounded-md"
          />
        </div>

        {/* Primary Color Heading */}
        <Heading className="text-2xl font-bold text-[#03AFA8] m-0 tracking-tight uppercase">
          🎉 YOUR CAMPAIGN IS LIVE!
        </Heading>
      </Section>

      {/* --- MAIN CONTENT --- */}
      <Section className="px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold mb-4 m-0">Hi {organizerName},</Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          Your FunRaisingIt campaign <strong>"{campaignName}"</strong> has been created and is
          officially ready to share!
        </Text>

        {/* --- CAMPAIGN LINK CTA --- */}
        <Section className="bg-[#f6f9fc] rounded-xl border-2 border-[#03AFA8]/30 my-6 p-6 text-center">
          <Text className="text-xs uppercase tracking-widest text-[#03AFA8] font-bold mb-3 m-0">
            🔗 Your Campaign Link
          </Text>
          <Link
            href={campaignLink}
            className="text-lg font-semibold text-slate-800 break-all underline decoration-[#03AFA8] decoration-2 underline-offset-4 m-0 block mb-6"
          >
            {campaignLink}
          </Link>

          {/* CTA Button */}
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={`${campaignLink}`} style={button}>
              View Your Campaign
            </Button>
          </Section>
        </Section>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-8 text-center">
          The more people who see your campaign, the more opportunities you have to reach your goal.
        </Text>

        {/* --- START STRONG HIGHLIGHT BOX --- */}
        <Section className="bg-[#FE7B01]/10 border border-[#FE7B01]/30 rounded-lg p-5 mb-8">
          <Text className="text-[#FE7B01] font-bold text-base m-0 mb-2">🚀 START STRONG:</Text>
          <Text className="text-slate-700 text-sm m-0 leading-relaxed">
            Share your campaign with at least{' '}
            <strong>20 family members, friends, coworkers, and supporters TODAY</strong> and ask
            each person to support AND share your link with others.
          </Text>
        </Section>

        {/* --- CHECKLIST SECTION --- */}
        <Section className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-100">
          <Text className="text-slate-800 text-base font-semibold m-0 mb-4">
            📱 Don't forget to post your link on:
          </Text>
          <Text className="text-slate-600 text-sm leading-relaxed m-0 ml-2">
            <span className="text-[#03AFA8] mr-2">•</span>Facebook
            <br />
            <span className="text-[#03AFA8] mr-2">•</span>Instagram
            <br />
            <span className="text-[#03AFA8] mr-2">•</span>TikTok
            <br />
            <span className="text-[#03AFA8] mr-2">•</span>Group chats
            <br />
            <span className="text-[#03AFA8] mr-2">•</span>Text messages
            <br />
            <span className="text-[#03AFA8] mr-2">•</span>Community & organization pages
          </Text>
        </Section>

        {/* --- TIP SECTION --- */}
        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-8 p-4 bg-slate-50 border-l-4 border-[#03AFA8] italic">
          <strong className="text-slate-800 not-italic block mb-1">
            Remember: Don't just post it — SEND IT!
          </strong>
          Personal messages usually get more attention than simply posting your link.
        </Text>

        {/* --- SIGN OFF --- */}
        <Text className="text-slate-800 text-base font-semibold m-0 mb-2">
          💰 Now let's have FUN-RAISING money for you.
        </Text>
        <Text className="text-slate-600 text-sm m-0">— The FunRaisingIt Team</Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* --- FOOTER --- */}
      <Section className="px-8 py-6 bg-slate-50 text-center">
        <Text className="text-slate-500 text-sm m-0 mb-4">
          Need help?{' '}
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
