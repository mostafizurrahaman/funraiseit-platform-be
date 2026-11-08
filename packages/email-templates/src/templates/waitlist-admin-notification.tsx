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
  const previewText = `Waitlist registration update on ${companyName}: Member ${memberNumber}`

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
          {isUpgrade ? 'Waitlist Priority Registration' : 'New Waitlist Registration'}
        </Heading>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pb-8">
        <Text className="text-slate-800 text-base font-semibold m-0 mb-3">
          Hi Team,
        </Text>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          A user has registered on the {companyName} early access waitlist. Here are the registration details:
        </Text>

        {/* Details Card */}
        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200 p-4 sm:p-5 my-4">
          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Email Address</Text>
            <Text className="text-base text-slate-900 font-semibold m-0" style={{ wordBreak: 'break-all' }}>
              {userEmail}
            </Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Member Number</Text>
            <Text className="text-base text-[#03AFA8] font-mono font-bold m-0">Member {memberNumber}</Text>
          </div>

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Access Tier</Text>
            <Text className="text-sm font-semibold m-0 text-slate-800">
              {isVip ? 'Priority Early Access' : 'Standard Early Access'}
            </Text>
          </div>

          {phoneNumber && (
            <div className="mb-3">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0">Phone Number</Text>
              <Text className="text-sm font-mono font-semibold m-0 text-slate-800">{phoneNumber}</Text>
            </div>
          )}

          <div className="mb-3">
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Status</Text>
            <Text className="text-xs font-mono text-slate-600 m-0">{status}</Text>
          </div>

          <div>
            <Text className="text-xs uppercase text-slate-400 font-bold m-0">Registered At</Text>
            <Text className="text-xs text-slate-500 m-0">{registeredAt}</Text>
          </div>
        </Section>

        {adminDashboardUrl && (
          <Button
            href={adminDashboardUrl}
            className="email-btn"
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
            Open Dashboard
          </Button>
        )}

        <Text className="text-slate-600 text-sm leading-relaxed m-0">
          Best regards,
          <br />
          <span className="font-semibold text-slate-800">The {companyName} Team</span>
        </Text>
      </Section>

      <Hr className="border-slate-100 m-0" />

      <Section className="email-content px-5 sm:px-8 py-5 bg-slate-50 text-center">
        <Text className="text-slate-400 text-xs m-0">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </Text>
      </Section>
    </EmailLayout>
  )
}
