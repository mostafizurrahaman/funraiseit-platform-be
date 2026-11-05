import configs from '@app/configs'
import { sendEmail } from 'packages/email-sender/src'
import {
  renderEmail,
  SystemTransactionalEmail,
  type SystemTransactionalEmailProps,
  type TransactionalItemRow,
} from 'packages/email-templates/src'
import { getAdminEmails } from './get-admin-emails'
import { logger } from './logger'

const sendTransactionalTemplate = async (
  to: string | string[],
  subject: string,
  props: Omit<SystemTransactionalEmailProps, 'companyName' | 'companyLogo' | 'supportEmail'>,
  isSystemAlert = false
) => {
  try {
    const siteName = configs.site.name || 'FunRaisingIt'
    const siteLogo = (configs.site.logo as string) || undefined
    const supportEmail = configs.site.supportEmail || undefined

    const rendered = await renderEmail(
      SystemTransactionalEmail({
        ...props,
        companyName: siteName,
        companyLogo: siteLogo,
        supportEmail,
      })
    )

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean)
    if (recipients.length === 0) return

    await Promise.allSettled(
      recipients.map((email) =>
        sendEmail({
          to: email,
          subject,
          html: rendered.html,
          text: rendered.text,
          fromName: isSystemAlert ? `${siteName} System` : siteName,
          replyTo: supportEmail,
        })
      )
    )
  } catch (err) {
    logger.error(`Failed to send transactional email (${subject}):`, err)
  }
}

export const notifyBrandBuilderPaidOrganizer = async (params: {
  organizerName: string
  organizerEmail: string
  businessName: string
  amountPaid: number
  sellingItem?: string | undefined
  brandStyle?: string | undefined
}) => {
  if (!params.organizerEmail) return
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  await sendTransactionalTemplate(
    params.organizerEmail,
    `🎨 Brand Builder Order Confirmed: "${params.businessName}"`,
    {
      previewText: `Your Brand Builder order for "${params.businessName}" is confirmed!`,
      headerSubTitle: 'Brand Builder • Order Confirmation',
      badgeText: '✅ PAYMENT CONFIRMED',
      badgeTone: 'teal',
      heading: 'Your Brand Builder request is in progress!',
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Thank you for placing your Brand Builder order for "${params.businessName}". Our team has received your specifications and payment.`,
      details: [
        { label: 'Business / Project Name', value: params.businessName },
        { label: 'Amount Paid', value: `$${params.amountPaid.toFixed(2)}`, highlight: true },
        ...(params.sellingItem ? [{ label: 'Selling Item', value: params.sellingItem }] : []),
        ...(params.brandStyle ? [{ label: 'Brand Style', value: params.brandStyle }] : []),
        { label: 'Status', value: 'Paid & In Review' },
      ],
      outroText: 'We will notify you by email as soon as your Brand Builder package is completed.',
      ctaText: 'Go to Dashboard',
      ctaUrl: `${clientUrl}/dashboard`,
      footerReason: `You received this receipt because you placed a Brand Builder order on ${configs.site.name || 'FunRaisingIt'}.`,
    }
  )
}

export const notifyBrandBuilderCompleted = async (params: {
  organizerName: string
  organizerEmail: string
  businessName: string
}) => {
  if (!params.organizerEmail) return
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  await sendTransactionalTemplate(
    params.organizerEmail,
    `🎉 Your Brand Builder Package for "${params.businessName}" is Complete!`,
    {
      previewText: `Great news! Your Brand Builder project "${params.businessName}" is ready.`,
      headerSubTitle: 'Brand Builder • Project Complete',
      badgeText: '🎉 COMPLETED',
      badgeTone: 'teal',
      heading: 'Your Brand Builder project is ready!',
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Great news! Our team has completed your Brand Builder package for "${params.businessName}".`,
      details: [
        { label: 'Business / Project Name', value: params.businessName, highlight: true },
        { label: 'Status', value: 'Completed' },
        { label: 'Completed Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
      ],
      ctaText: 'View in Dashboard',
      ctaUrl: `${clientUrl}/dashboard`,
      footerReason: `You received this update regarding your Brand Builder order for "${params.businessName}".`,
    }
  )
}

export const notifyPayoutPaid = async (params: {
  organizerName: string
  organizerEmail: string
  campaignName: string
  campaignCode: string
  amount: number
}) => {
  if (!params.organizerEmail) return
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  await sendTransactionalTemplate(
    params.organizerEmail,
    `💸 Payout Sent: $${params.amount.toFixed(2)} for "${params.campaignName}"`,
    {
      previewText: `Your payout of $${params.amount.toFixed(2)} for "${params.campaignName}" has been sent!`,
      headerSubTitle: 'Payout Confirmation',
      badgeText: '💸 PAYOUT COMPLETED',
      badgeTone: 'teal',
      heading: `$${params.amount.toFixed(2)} is on its way to your bank!`,
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Your fundraising payout for campaign "${params.campaignName}" has been successfully processed and transferred to your connected bank account.`,
      details: [
        { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
        { label: 'Payout Amount', value: `$${params.amount.toFixed(2)}`, highlight: true },
        { label: 'Status', value: 'Paid Out' },
        { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
      ],
      outroText: 'Please allow 1–3 business days for the funds to reflect on your bank statement depending on your financial institution.',
      ctaText: 'View Payout History',
      ctaUrl: `${clientUrl}/dashboard/payouts`,
      footerReason: `You received this payout confirmation for your campaign "${params.campaignName}".`,
    }
  )
}

export const notifyPayoutFailed = async (params: {
  organizerName: string
  organizerEmail: string
  campaignName: string
  campaignCode: string
  amount: number
  failureMessage: string
}) => {
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  if (params.organizerEmail) {
    await sendTransactionalTemplate(
      params.organizerEmail,
      `⚠️ Action Required: Payout issue for "${params.campaignName}"`,
      {
        previewText: `Important update regarding your payout of $${params.amount.toFixed(2)} for "${params.campaignName}".`,
        headerSubTitle: 'Payout Status Alert',
        badgeText: '⚠️ PAYOUT DELAYED / FAILED',
        badgeTone: 'red',
        heading: 'We encountered an issue processing your payout',
        greeting: `Hi ${params.organizerName || 'Organizer'},`,
        introText: `We attempted to transfer your payout of $${params.amount.toFixed(2)} for "${params.campaignName}", but your bank or payment processor reported an issue.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Payout Amount', value: `$${params.amount.toFixed(2)}` },
          { label: 'Reason Reported', value: params.failureMessage || 'Bank transfer could not be completed' },
        ],
        outroText: 'Please verify your connected bank account and payout settings in your dashboard, or contact our support team for assistance.',
        ctaText: 'Check Payout Settings',
        ctaUrl: `${clientUrl}/dashboard/settings`,
        footerReason: `You received this critical account alert regarding your campaign payout for "${params.campaignName}".`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `⚠️ [Admin Alert] Payout Failed for "${params.campaignName}" (${params.campaignCode})`,
      {
        previewText: `Payout of $${params.amount.toFixed(2)} failed for campaign "${params.campaignName}".`,
        headerSubTitle: 'Admin Alert • Payout Failure',
        badgeText: '⚠️ PAYOUT FAILED',
        badgeTone: 'red',
        heading: 'A campaign payout failed to process',
        introText: `A payout transfer for campaign "${params.campaignName}" failed via Stripe.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Organizer', value: `${params.organizerName} <${params.organizerEmail}>` },
          { label: 'Amount', value: `$${params.amount.toFixed(2)}`, highlight: true },
          { label: 'Failure Reason', value: params.failureMessage || 'Unknown error' },
        ],
        ctaText: 'Open Admin Dashboard',
        ctaUrl: `${clientUrl}/admin`,
      },
      true
    )
  }
}

export const notifyCampaignCompleted = async (params: {
  organizerName: string
  organizerEmail: string
  campaignName: string
  campaignCode: string
  raisedAmount: number
  goalAmount?: number | undefined
  expectedPayoutDate?: Date | undefined
  earlyCompleted?: boolean | undefined
}) => {
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'
  const payoutDateStr = params.expectedPayoutDate
    ? new Date(params.expectedPayoutDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Within 2 business days'

  if (params.organizerEmail) {
    await sendTransactionalTemplate(
      params.organizerEmail,
      `🏁 Campaign Completed: "${params.campaignName}" Raised $${params.raisedAmount.toFixed(2)}!`,
      {
        previewText: `Your campaign "${params.campaignName}" has officially completed! Total raised: $${params.raisedAmount.toFixed(2)}.`,
        headerSubTitle: 'Campaign Summary',
        badgeText: '🏁 CAMPAIGN COMPLETED',
        badgeTone: 'teal',
        heading: `Congratulations on completing "${params.campaignName}"!`,
        greeting: `Hi ${params.organizerName || 'Organizer'},`,
        introText: params.earlyCompleted
          ? `You have marked your campaign "${params.campaignName}" as completed. Thank you for making a difference with ${configs.site.name || 'FunRaisingIt'}!`
          : `Your campaign "${params.campaignName}" has reached its completion date. Thank you for fundraising with ${configs.site.name || 'FunRaisingIt'}!`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Total Raised', value: `$${params.raisedAmount.toFixed(2)}`, highlight: true },
          ...(params.goalAmount ? [{ label: 'Fundraising Goal', value: `$${params.goalAmount.toLocaleString()}` }] : []),
          { label: 'Expected Payout Date', value: payoutDateStr },
        ],
        outroText: 'Make sure your connected bank account is active in Settings so your payout can be processed smoothly.',
        ctaText: 'View Campaign Summary',
        ctaUrl: `${clientUrl}/dashboard`,
        footerReason: `You received this summary because you are the organizer of "${params.campaignName}".`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `🏁 [Admin Alert] Campaign Completed: "${params.campaignName}" ($${params.raisedAmount.toFixed(2)} raised)`,
      {
        previewText: `Campaign "${params.campaignName}" completed with $${params.raisedAmount.toFixed(2)} raised.`,
        headerSubTitle: 'Admin Notification • Campaign Completed',
        badgeText: '🏁 COMPLETED',
        badgeTone: 'teal',
        heading: 'A campaign has completed its run',
        introText: `Campaign "${params.campaignName}" (${params.campaignCode}) is now marked as COMPLETED.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Organizer', value: `${params.organizerName} <${params.organizerEmail}>` },
          { label: 'Total Raised', value: `$${params.raisedAmount.toFixed(2)}`, highlight: true },
          { label: 'Expected Payout Date', value: payoutDateStr },
        ],
        ctaText: 'Open Admin Dashboard',
        ctaUrl: `${clientUrl}/admin`,
      },
      true
    )
  }
}

export const notifyCampaignRejected = async (params: {
  organizerName: string
  organizerEmail: string
  campaignName: string
  campaignCode: string
  rejectionReason: string
}) => {
  if (!params.organizerEmail) return
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  await sendTransactionalTemplate(
    params.organizerEmail,
    `⚠️ Important Update Regarding Your Campaign "${params.campaignName}"`,
    {
      previewText: `Your campaign "${params.campaignName}" has been flagged/paused by moderation.`,
      headerSubTitle: 'Campaign Moderation Notice',
      badgeText: '⚠️ CAMPAIGN REJECTED / PAUSED',
      badgeTone: 'red',
      heading: `Update on "${params.campaignName}"`,
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `After a review by our trust and safety team, your campaign "${params.campaignName}" has been restricted and cannot continue accepting contributions at this time.`,
      details: [
        { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
        { label: 'Status', value: 'Rejected' },
        { label: 'Moderation Reason', value: params.rejectionReason || 'Policy violation' },
      ],
      outroText: 'If you believe this decision was made in error or would like to provide additional documentation, please contact our support team.',
      ctaText: 'Contact Support',
      ctaUrl: `${clientUrl}/contact`,
      footerReason: `You received this moderation notice as the organizer of "${params.campaignName}".`,
    }
  )
}

export const notifyCampaignCancelled = async (params: {
  organizerName: string
  organizerEmail: string
  campaignName: string
  campaignCode: string
  cancelledReason: string
}) => {
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  if (params.organizerEmail) {
    await sendTransactionalTemplate(
      params.organizerEmail,
      `Campaign Cancelled: "${params.campaignName}"`,
      {
        previewText: `Confirmation that your campaign "${params.campaignName}" has been cancelled.`,
        headerSubTitle: 'Campaign Cancellation',
        badgeText: '🛑 CAMPAIGN CANCELLED',
        badgeTone: 'orange',
        heading: `"${params.campaignName}" has been cancelled`,
        greeting: `Hi ${params.organizerName || 'Organizer'},`,
        introText: `As requested, your campaign "${params.campaignName}" has been cancelled and is no longer accepting donations or orders.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Reason Provided', value: params.cancelledReason || 'Cancelled by organizer' },
          { label: 'Cancelled At', value: new Date().toLocaleString() },
        ],
        ctaText: 'Go to Dashboard',
        ctaUrl: `${clientUrl}/dashboard`,
        footerReason: `You received this confirmation because your campaign "${params.campaignName}" was cancelled.`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `🛑 [Admin Alert] Campaign Cancelled by Organizer: "${params.campaignName}"`,
      {
        previewText: `Organizer ${params.organizerName} cancelled campaign "${params.campaignName}".`,
        headerSubTitle: 'Admin Notification • Campaign Cancelled',
        badgeText: '🛑 CANCELLED',
        badgeTone: 'orange',
        heading: 'An organizer cancelled their active campaign',
        introText: `Campaign "${params.campaignName}" (${params.campaignCode}) was cancelled by its organizer.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Organizer', value: `${params.organizerName} <${params.organizerEmail}>` },
          { label: 'Reason', value: params.cancelledReason || 'Not specified' },
        ],
        ctaText: 'Open Admin Dashboard',
        ctaUrl: `${clientUrl}/admin`,
      },
      true
    )
  }
}

export const notifyOrderShipped = async (params: {
  customerName: string
  customerEmail: string
  campaignName: string
  orderId: string
  shippingType?: string | undefined
  items: TransactionalItemRow[]
}) => {
  if (!params.customerEmail) return
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'
  const shortOrderId = `#${params.orderId.slice(-8).toUpperCase()}`
  const deliveryLabel =
    params.shippingType === 'local_pickup'
      ? 'Ready for Local Pickup'
      : params.shippingType === 'local_delivery'
        ? 'Out for Local Delivery'
        : 'Shipped'

  await sendTransactionalTemplate(
    params.customerEmail,
    `📦 Your Order (${shortOrderId}) for "${params.campaignName}" has ${deliveryLabel}!`,
    {
      previewText: `Good news! Your order ${shortOrderId} from "${params.campaignName}" has been fulfilled.`,
      headerSubTitle: 'Order Fulfillment Update',
      badgeText: `📦 ${deliveryLabel.toUpperCase()}`,
      badgeTone: 'teal',
      heading: `Your order is on the way!`,
      greeting: `Hi ${params.customerName || 'Valued Supporter'},`,
      introText: `Great news! The organizer of "${params.campaignName}" has fulfilled your order (${shortOrderId}).`,
      details: [
        { label: 'Order Number', value: shortOrderId, highlight: true },
        { label: 'Campaign Supported', value: params.campaignName },
        { label: 'Fulfillment Status', value: deliveryLabel },
      ],
      items: params.items,
      itemsTitle: 'Fulfilled Items',
      outroText: 'Thank you again for supporting this campaign!',
      ctaText: 'Visit FunRaisingIt',
      ctaUrl: clientUrl,
      footerReason: `You received this fulfillment update for your order ${shortOrderId} on ${configs.site.name || 'FunRaisingIt'}.`,
    }
  )
}

export const notifyOrderCancelled = async (params: {
  customerName: string
  customerEmail: string
  campaignName: string
  orderId: string
  reason?: string | null | undefined
  items: TransactionalItemRow[]
  isPartialItem?: boolean | undefined
}) => {
  if (!params.customerEmail) return
  const shortOrderId = `#${params.orderId.slice(-8).toUpperCase()}`

  await sendTransactionalTemplate(
    params.customerEmail,
    `Order Update: ${params.isPartialItem ? 'Item Cancelled in' : 'Cancellation for'} Order ${shortOrderId}`,
    {
      previewText: `Update regarding your order ${shortOrderId} for "${params.campaignName}".`,
      headerSubTitle: 'Order Cancellation Notice',
      badgeText: '🛑 ORDER CANCELLED',
      badgeTone: 'orange',
      heading: params.isPartialItem
        ? `An item in your order ${shortOrderId} was cancelled`
        : `Your order ${shortOrderId} has been cancelled`,
      greeting: `Hi ${params.customerName || 'Valued Supporter'},`,
      introText: params.isPartialItem
        ? `The following item from your order (${shortOrderId}) supporting "${params.campaignName}" has been cancelled.`
        : `Your order (${shortOrderId}) supporting "${params.campaignName}" has been cancelled.`,
      details: [
        { label: 'Order Number', value: shortOrderId },
        { label: 'Campaign', value: params.campaignName },
        ...(params.reason ? [{ label: 'Cancellation Note', value: params.reason }] : []),
      ],
      items: params.items,
      itemsTitle: 'Cancelled Item(s)',
      outroText: 'If you have any questions regarding this cancellation or refunds, please reply to this email or contact our support team.',
      footerReason: `You received this notice regarding your order ${shortOrderId} on ${configs.site.name || 'FunRaisingIt'}.`,
    }
  )
}

export const notifySupportTicketCreated = async (params: {
  ticketNo: string
  userEmail: string
  subject: string
  message: string
  campaignName?: string | undefined
}) => {
  const clientUrl = configs.site.clientUrl || 'https://funraisingit.com'

  if (params.userEmail) {
    await sendTransactionalTemplate(
      params.userEmail,
      `🎫 Support Request Received (#${params.ticketNo}): ${params.subject}`,
      {
        previewText: `We received your support request #${params.ticketNo} and will respond shortly.`,
        headerSubTitle: 'Support Center • Ticket Confirmation',
        badgeText: `🎫 TICKET #${params.ticketNo}`,
        badgeTone: 'teal',
        heading: 'We have received your message!',
        greeting: 'Hello,',
        introText: `Thank you for reaching out to ${configs.site.name || 'FunRaisingIt'} Support. A member of our team will review your inquiry and get back to you as soon as possible.`,
        details: [
          { label: 'Ticket Number', value: `#${params.ticketNo}`, highlight: true },
          { label: 'Subject', value: params.subject },
          ...(params.campaignName ? [{ label: 'Related Campaign', value: params.campaignName }] : []),
          { label: 'Your Message', value: params.message },
        ],
        footerReason: `You received this confirmation because a support ticket was submitted with your email address.`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `🎫 [Admin Alert] New Support Ticket (#${params.ticketNo}): ${params.subject}`,
      {
        previewText: `New support ticket #${params.ticketNo} from ${params.userEmail}.`,
        headerSubTitle: 'Admin Alert • Support Center',
        badgeText: `🎫 NEW TICKET #${params.ticketNo}`,
        badgeTone: 'orange',
        heading: 'A new support ticket was submitted',
        introText: `A user has submitted a new support inquiry requiring review.`,
        details: [
          { label: 'Ticket Number', value: `#${params.ticketNo}`, highlight: true },
          { label: 'From Email', value: params.userEmail },
          { label: 'Subject', value: params.subject },
          ...(params.campaignName ? [{ label: 'Campaign', value: params.campaignName }] : []),
          { label: 'Message', value: params.message },
        ],
        ctaText: 'Reply in Admin Dashboard',
        ctaUrl: `${clientUrl}/admin`,
      },
      true
    )
  }
}

