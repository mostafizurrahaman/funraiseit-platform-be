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

export interface WaitlistAdminNotificationEmailProps {
  userEmail: string
  memberNumber: string
  phoneNumber?: string | undefined
  status?: string | undefined
  isVip?: boolean | undefined
  actionType?: 'SIGNUP' | 'VIP_UPGRADE' | undefined
  registeredAt?: string | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
  adminDashboardUrl?: string | undefined
}

export const WaitlistAdminNotificationEmail = ({
  userEmail,
  memberNumber = '#1',
  phoneNumber,
  status = 'REGISTERED',
  isVip = false,
  actionType = 'SIGNUP',
  registeredAt = new Date().toLocaleString(),
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  adminDashboardUrl = 'https://funraisingit.com',
}: WaitlistAdminNotificationEmailProps): React.ReactElement => {
  const isUpgrade = actionType === 'VIP_UPGRADE' || isVip
  const previewText = isUpgrade
    ? `🌟 VIP Priority Upgrade: ${userEmail} (Member ${memberNumber})`
    : `📢 New Waitlist Signup: ${userEmail} (Member ${memberNumber})`

  return (
    <EmailLayout previewText={previewText}>
      {/* Header */}
      <Section className="bg-gradient-to-tr from-[#03AFA8] to-[#029690] p-8 text-center border-b-[5px] border-[#FE7B01]">
        {companyLogo && (
          <div className="bg-white inline-block p-3 rounded-xl shadow-lg mb-4 border border-white/20">
            <Img
              src={companyLogo}
              width="180"
              height="60"
              alt={companyName}
              className="mx-auto object-contain rounded-md"
            />
          </div>
        )}

        <Text className="text-black text-base font-semibold m-0 tracking-wide">
          Admin Notification • Waitlist Activity
        </Text>
      </Section>

      {/* Main Content */}
      <Section className="px-8 pt-8 pb-6">
        {/* Status Badge */}
        <div className="inline-block px-3 py-1 bg-[#FE7B01]/10 text-[#FE7B01] text-xs font-mono font-bold rounded-full mb-3">
          {isUpgrade ? '⭐ VIP PRIORITY UPGRADE' : '📢 NEW WAITING LIST ENTRY'}
        </div>

        <Heading className="text-xl font-bold text-slate-800 m-0 mb-2 tracking-tight">
          {isUpgrade
            ? 'A user claimed VIP Early Access!'
            : 'A new user joined the waiting list!'}
        </Heading>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6">
          Here are the details of the submission:
        </Text>

        {/* Details Card */}
        <Section className="bg-[#f6f9fc] rounded-xl border border-slate-200/80 p-5 my-4">
          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Email Address</Text>
            <Text className="text-base text-slate-900 font-semibold m-0">{userEmail}</Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Member Number</Text>
            <Text className="text-base text-[#03AFA8] font-mono font-bold m-0">Member {memberNumber}</Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">VIP Status</Text>
            <Text className="text-sm font-semibold m-0 text-slate-800">
              {isVip ? '✅ VIP Member (Priority Early Access)' : 'Standard Waitlist'}
            </Text>
          </div>

          {phoneNumber && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Phone Number</Text>
              <Text className="text-sm font-mono font-semibold m-0 text-slate-800">{phoneNumber}</Text>
            </div>
          )}

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">System Status</Text>
            <Text className="text-xs font-mono text-slate-600 m-0">{status}</Text>
          </div>

          <div>
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Timestamp</Text>
            <Text className="text-xs text-slate-500 m-0">{registeredAt}</Text>
          </div>
        </Section>

        {/* Admin Link Button */}
        {adminDashboardUrl && (
          <Button
            href={adminDashboardUrl}
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
              marginTop: '20px',
              marginBottom: '20px',
            }}
          >
            Open Admin Dashboard
          </Button>
        )}
      </Section>

      <Hr className="border-slate-100 m-0" />

      {/* Footer */}
      <Section className="px-8 py-5 bg-slate-50 text-center">
        <Text className="text-slate-400 text-xs m-0">
          This is an automated administrative notification from {companyName}.
        </Text>
      </Section>
    </EmailLayout>
  )
}
