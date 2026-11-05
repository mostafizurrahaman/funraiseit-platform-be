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

export interface OrderItemSummary {
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export interface CampaignContributionOwnerNotificationEmailProps {
  organizerName: string
  campaignName: string
  campaignCode: string
  contributionType: 'donation' | 'order'
  contributorName: string
  contributorEmail?: string | undefined
  amountContributed: number
  totalRaisedSoFar: number
  goalAmount?: number | undefined
  orderItems?: OrderItemSummary[] | undefined
  deliveryType?: string | undefined
  dashboardUrl?: string | undefined
  campaignUrl?: string | undefined
  companyName?: string | undefined
  companyLogo?: string | undefined
  supportEmail?: string | undefined
}

export const CampaignContributionOwnerNotificationEmail = ({
  organizerName,
  campaignName,
  contributionType = 'donation',
  contributorName = 'A Generous Supporter',
  contributorEmail,
  amountContributed,
  totalRaisedSoFar,
  goalAmount,
  orderItems,
  deliveryType,
  dashboardUrl = 'https://funraisingit.com/dashboard',
  companyName = 'FunRaisingIt',
  companyLogo = 'https://funraising-it.s3.us-east-1.amazonaws.com/non_delatable_files/funraisingit-logo.png',
  supportEmail = 'support@funraisingit.com',
}: CampaignContributionOwnerNotificationEmailProps): React.ReactElement => {
  const isOrder = contributionType === 'order'
  const typeLabel = isOrder ? 'New Product Order' : 'New Donation'
  const actionText = isOrder ? 'placed an order on' : 'donated to'

  const previewText = `🎉 ${typeLabel} of $${amountContributed.toFixed(2)} received for "${campaignName}"!`

  const primaryBtn = {
    display: 'inline-block',
    backgroundColor: '#03AFA8',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 32px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
  }

  const percentProgress =
    goalAmount && goalAmount > 0
      ? Math.min(Math.round((totalRaisedSoFar / goalAmount) * 100), 100)
      : null

  return (
    <EmailLayout previewText={previewText}>
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
        <Text className="text-white text-base font-bold m-0 tracking-wide">
          🎉 Great News, {organizerName}!
        </Text>
      </Section>

      {/* Main Content */}
      <Section className="email-content px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <div className="inline-block px-3 py-1 bg-[#FE7B01]/10 text-[#FE7B01] text-xs font-mono font-bold rounded-full mb-3">
          {isOrder ? '🛍️ PRODUCT ORDER RECEIVED' : '💝 DONATION RECEIVED'}
        </div>

        <Heading className="text-2xl font-bold text-slate-800 m-0 mb-3 tracking-tight">
          +${amountContributed.toFixed(2)} added to your campaign!
        </Heading>

        <Text className="text-slate-600 text-base leading-relaxed m-0 mb-6">
          <strong>{contributorName}</strong> just {actionText} your campaign{' '}
          <strong>"{campaignName}"</strong>.
        </Text>

        {/* Progress & Totals Box */}
        <Section className="email-card bg-[#f0fdfa] rounded-xl border-2 border-[#03AFA8]/30 p-4 sm:p-5 my-5">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="stack-col" style={{ paddingBottom: '12px' }}>
                  <Text className="text-xs uppercase text-slate-500 font-bold m-0">Amount Received</Text>
                  <Text className="text-2xl font-bold text-[#03AFA8] m-0 mt-1">
                    +${amountContributed.toFixed(2)}
                  </Text>
                </td>
                <td className="stack-col" style={{ textAlign: 'right', paddingBottom: '12px' }}>
                  <Text className="text-xs uppercase text-slate-500 font-bold m-0">Total Raised to Date</Text>
                  <Text className="text-2xl font-bold text-slate-900 m-0 mt-1">
                    ${totalRaisedSoFar.toFixed(2)}
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>

          {goalAmount !== undefined && goalAmount > 0 && percentProgress !== null && (
            <div className="pt-3 border-t border-[#03AFA8]/20 mt-2">
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Goal: ${goalAmount.toLocaleString()}
                    </td>
                    <td style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                      {percentProgress}% achieved
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ backgroundColor: '#e2e8f0', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    backgroundColor: '#FE7B01',
                    height: '100%',
                    width: `${percentProgress}%`,
                    borderRadius: '9999px',
                  }}
                />
              </div>
            </div>
          )}
        </Section>

        {/* Supporter Details Card */}
        <Section className="email-card bg-[#f8fafc] rounded-xl border border-slate-200/80 p-4 sm:p-5 my-4">
          <Text className="text-xs uppercase text-slate-400 font-bold m-0 mb-3">
            Supporter Information
          </Text>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 12px 4px 0', color: '#64748b', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Supporter Name:</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>
                  {contributorName}
                </td>
              </tr>
              {contributorEmail && (
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', color: '#64748b', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Email:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#1e293b', wordBreak: 'break-all' }}>
                    {contributorEmail}
                  </td>
                </tr>
              )}
              {deliveryType && (
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', color: '#64748b', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Delivery Option:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600, color: '#03AFA8', whiteSpace: 'nowrap' }}>
                    {deliveryType === 'local_pickup'
                      ? 'Local Pickup'
                      : deliveryType === 'local_delivery'
                        ? 'Local Delivery'
                        : 'Shipping'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Itemized list if order */}
          {isOrder && orderItems && orderItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <Text className="text-xs uppercase text-slate-400 font-bold m-0 mb-2">
                Items Ordered
              </Text>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px 6px 0', color: '#1e293b', wordBreak: 'break-word' }}>
                        {item.name} × {item.quantity}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* CTA Button */}
        <Section className="my-7 text-center">
          <Button href={dashboardUrl} style={primaryBtn} className="email-btn">
            View Campaign Dashboard
          </Button>
        </Section>

        <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-6 text-center">
          Every contribution builds momentum! Remember to thank your supporters and keep sharing your campaign link with friends and family.
        </Text>

        <Hr className="border-slate-200 my-6" />

        {/* Deliverability & Anti-Spam Footer */}
        <Section className="text-center">
          <Text className="text-slate-400 text-xs m-0 leading-relaxed">
            You received this transactional alert because you are the registered organizer of "{campaignName}" on {companyName}.
          </Text>
          <Text className="text-slate-400 text-xs m-0 mt-1.5">
            Questions? Contact support at{' '}
            <Link href={`mailto:${supportEmail}`} className="text-[#03AFA8] underline">
              {supportEmail}
            </Link>
          </Text>
          <Text className="text-slate-400 text-xs m-0 mt-1">
            © {new Date().getFullYear()} {companyName}. All rights reserved.
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  )
}
