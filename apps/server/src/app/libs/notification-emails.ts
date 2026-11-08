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
  _isSystemAlert = false
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
          fromName: siteName,
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
    `Thank you for your Brand Builder order for "${params.businessName}"`,
    {
      previewText: `Your Brand Builder order for "${params.businessName}" is confirmed!`,
      headerSubTitle: 'Brand Builder Confirmation',
      badgeText: 'Confirmed',
      badgeTone: 'teal',
      heading: 'Brand Builder Order Confirmed',
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Thank you for placing your Brand Builder order for "${params.businessName}". Our team has received your specifications and payment, and we have started working on your package.`,
      details: [
        { label: 'Business Name', value: params.businessName },
        { label: 'Amount Paid', value: `$${params.amountPaid.toFixed(2)}`, highlight: true },
        ...(params.sellingItem ? [{ label: 'Selling Item', value: params.sellingItem }] : []),
        ...(params.brandStyle ? [{ label: 'Brand Style', value: params.brandStyle }] : []),
        { label: 'Status', value: 'In Production' },
      ],
      outroText: 'We will notify you by email as soon as your Brand Builder package is completed.',
      ctaText: 'Go to Dashboard',
      ctaUrl: `${clientUrl}/dashboard`,
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
    `Your Brand Builder package for "${params.businessName}" is ready`,
    {
      previewText: `Great news! Your Brand Builder project "${params.businessName}" is ready.`,
      headerSubTitle: 'Brand Builder Delivery',
      badgeText: 'Completed',
      badgeTone: 'teal',
      heading: 'Your Brand Builder Package is Ready',
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Great news! Our team has completed your Brand Builder package for "${params.businessName}". You can now view and download your files directly from your dashboard.`,
      details: [
        { label: 'Business Name', value: params.businessName, highlight: true },
        { label: 'Status', value: 'Completed' },
        { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
      ],
      ctaText: 'View in Dashboard',
      ctaUrl: `${clientUrl}/dashboard`,
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
    `Transfer completed for "${params.campaignName}"`,
    {
      previewText: `Your fundraising transfer for "${params.campaignName}" has been processed.`,
      headerSubTitle: 'Transfer Confirmation',
      badgeText: 'Completed',
      badgeTone: 'teal',
      heading: 'Fundraising Transfer Completed',
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Your fundraising transfer for campaign "${params.campaignName}" has been processed and sent to your connected bank account.`,
      details: [
        { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
        { label: 'Transfer Amount', value: `$${params.amount.toFixed(2)}`, highlight: true },
        { label: 'Status', value: 'Completed' },
        { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
      ],
      outroText: 'Please allow 1 to 3 business days for the funds to appear on your bank statement depending on your financial institution.',
      ctaText: 'View Dashboard',
      ctaUrl: `${clientUrl}/dashboard/payouts`,
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
      `Update regarding your transfer for "${params.campaignName}"`,
      {
        previewText: `Update regarding your fundraising transfer for "${params.campaignName}".`,
        headerSubTitle: 'Transfer Update',
        badgeText: 'Update',
        badgeTone: 'red',
        heading: 'Transfer Status Update',
        greeting: `Hi ${params.organizerName || 'Organizer'},`,
        introText: `We attempted to send your fundraising transfer for "${params.campaignName}", but your bank reported that the transfer could not be completed at this time.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Transfer Amount', value: `$${params.amount.toFixed(2)}` },
          { label: 'Note', value: params.failureMessage || 'Bank transfer could not be completed' },
        ],
        outroText: 'Please review your connected bank details in your dashboard settings or reply to this email so our team can assist you.',
        ctaText: 'Review Account Settings',
        ctaUrl: `${clientUrl}/dashboard/settings`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `Transfer update for campaign "${params.campaignName}"`,
      {
        previewText: `Transfer update for campaign "${params.campaignName}".`,
        headerSubTitle: 'Transfer Update',
        badgeText: 'Update',
        badgeTone: 'red',
        heading: 'Campaign Transfer Update',
        greeting: 'Hi Team,',
        introText: `A scheduled transfer for campaign "${params.campaignName}" could not be completed automatically.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Organizer', value: `${params.organizerName} (${params.organizerEmail})` },
          { label: 'Amount', value: `$${params.amount.toFixed(2)}`, highlight: true },
          { label: 'Note', value: params.failureMessage || 'Unknown error' },
        ],
        ctaText: 'Open Dashboard',
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
      `Campaign summary for "${params.campaignName}"`,
      {
        previewText: `Your campaign "${params.campaignName}" has completed.`,
        headerSubTitle: 'Campaign Summary',
        badgeText: 'Completed',
        badgeTone: 'teal',
        heading: `Congratulations on completing "${params.campaignName}"!`,
        greeting: `Hi ${params.organizerName || 'Organizer'},`,
        introText: params.earlyCompleted
          ? `You have marked your campaign "${params.campaignName}" as completed. Thank you for fundraising with ${configs.site.name || 'FunRaisingIt'}!`
          : `Your campaign "${params.campaignName}" has reached its completion date. Thank you for fundraising with ${configs.site.name || 'FunRaisingIt'}!`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Total Raised', value: `$${params.raisedAmount.toFixed(2)}`, highlight: true },
          ...(params.goalAmount ? [{ label: 'Fundraising Goal', value: `$${params.goalAmount.toLocaleString()}` }] : []),
          { label: 'Scheduled Transfer Date', value: payoutDateStr },
        ],
        outroText: 'Please ensure your connected bank account is active in your dashboard so your transfer can be processed smoothly.',
        ctaText: 'View Campaign Summary',
        ctaUrl: `${clientUrl}/dashboard`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `Campaign completed: "${params.campaignName}"`,
      {
        previewText: `Campaign "${params.campaignName}" has completed.`,
        headerSubTitle: 'Campaign Completed',
        badgeText: 'Completed',
        badgeTone: 'teal',
        heading: 'Campaign Completed',
        greeting: 'Hi Team,',
        introText: `Campaign "${params.campaignName}" (${params.campaignCode}) has completed its fundraising run.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Organizer', value: `${params.organizerName} (${params.organizerEmail})` },
          { label: 'Total Raised', value: `$${params.raisedAmount.toFixed(2)}`, highlight: true },
          { label: 'Scheduled Transfer Date', value: payoutDateStr },
        ],
        ctaText: 'Open Dashboard',
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
    `Update regarding your campaign "${params.campaignName}"`,
    {
      previewText: `Update regarding your campaign "${params.campaignName}".`,
      headerSubTitle: 'Campaign Update',
      badgeText: 'Update',
      badgeTone: 'red',
      heading: `Update on "${params.campaignName}"`,
      greeting: `Hi ${params.organizerName || 'Organizer'},`,
      introText: `Our team has reviewed your campaign "${params.campaignName}" and paused it while we follow up on the details below.`,
      details: [
        { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
        { label: 'Status', value: 'Paused' },
        { label: 'Review Note', value: params.rejectionReason || 'Additional verification needed' },
      ],
      outroText: 'If you have any questions or would like to share additional details, please reply to this email or contact our support team.',
      ctaText: 'Contact Support',
      ctaUrl: `${clientUrl}/contact`,
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
      `Update on your campaign "${params.campaignName}"`,
      {
        previewText: `Confirmation that your campaign "${params.campaignName}" has been closed.`,
        headerSubTitle: 'Campaign Update',
        badgeText: 'Closed',
        badgeTone: 'orange',
        heading: `"${params.campaignName}" Has Been Closed`,
        greeting: `Hi ${params.organizerName || 'Organizer'},`,
        introText: `As requested, your campaign "${params.campaignName}" has been closed and is no longer accepting new contributions.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Note', value: params.cancelledReason || 'Closed by organizer' },
          { label: 'Date', value: new Date().toLocaleString() },
        ],
        ctaText: 'Go to Dashboard',
        ctaUrl: `${clientUrl}/dashboard`,
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `Campaign closed by organizer: "${params.campaignName}"`,
      {
        previewText: `Organizer ${params.organizerName} closed campaign "${params.campaignName}".`,
        headerSubTitle: 'Campaign Closed',
        badgeText: 'Closed',
        badgeTone: 'orange',
        heading: 'Campaign Closed by Organizer',
        greeting: 'Hi Team,',
        introText: `Campaign "${params.campaignName}" (${params.campaignCode}) was closed by its organizer.`,
        details: [
          { label: 'Campaign', value: `${params.campaignName} (${params.campaignCode})` },
          { label: 'Organizer', value: `${params.organizerName} (${params.organizerEmail})` },
          { label: 'Note', value: params.cancelledReason || 'Not specified' },
        ],
        ctaText: 'Open Dashboard',
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
  const shortOrderId = params.orderId.slice(-8).toUpperCase()
  const deliveryLabel =
    params.shippingType === 'local_pickup'
      ? 'Ready for Local Pickup'
      : params.shippingType === 'local_delivery'
        ? 'Out for Local Delivery'
        : 'Shipped'

  await sendTransactionalTemplate(
    params.customerEmail,
    `Your order for "${params.campaignName}" has been fulfilled`,
    {
      previewText: `Good news! Your order from "${params.campaignName}" is ${deliveryLabel.toLowerCase()}.`,
      headerSubTitle: 'Order Fulfillment Update',
      badgeText: deliveryLabel,
      badgeTone: 'teal',
      heading: 'Your Order is on the Way!',
      greeting: `Hi ${params.customerName || 'Valued Supporter'},`,
      introText: `Good news! The organizer of "${params.campaignName}" has updated your order (${shortOrderId}) as ${deliveryLabel.toLowerCase()}.`,
      details: [
        { label: 'Order Reference', value: shortOrderId, highlight: true },
        { label: 'Campaign Supported', value: params.campaignName },
        { label: 'Delivery Status', value: deliveryLabel },
      ],
      items: params.items,
      itemsTitle: 'Fulfilled Items',
      outroText: 'Thank you again for supporting this campaign!',
      ctaText: 'Visit FunRaisingIt',
      ctaUrl: clientUrl,
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
  const shortOrderId = params.orderId.slice(-8).toUpperCase()

  await sendTransactionalTemplate(
    params.customerEmail,
    `Update regarding your order for "${params.campaignName}"`,
    {
      previewText: `Update regarding your order (${shortOrderId}) for "${params.campaignName}".`,
      headerSubTitle: 'Order Status Update',
      badgeText: 'Order Update',
      badgeTone: 'orange',
      heading: 'Update on Your Order',
      greeting: `Hi ${params.customerName || 'Valued Supporter'},`,
      introText: params.isPartialItem
        ? `An item from your order (${shortOrderId}) supporting "${params.campaignName}" has been updated.`
        : `Your order (${shortOrderId}) supporting "${params.campaignName}" has been updated as cancelled.`,
      details: [
        { label: 'Order Reference', value: shortOrderId },
        { label: 'Campaign', value: params.campaignName },
        ...(params.reason ? [{ label: 'Note', value: params.reason }] : []),
      ],
      items: params.items,
      itemsTitle: 'Updated Items',
      outroText: 'If you have any questions regarding your order, please reply to this email or contact our support team.',
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
      `We received your support inquiry: "${params.subject}"`,
      {
        previewText: `We received your support request (${params.ticketNo}) and will respond shortly.`,
        headerSubTitle: 'Support Confirmation',
        badgeText: 'Received',
        badgeTone: 'teal',
        heading: 'We Received Your Message',
        greeting: 'Hello,',
        introText: `Thank you for reaching out to ${configs.site.name || 'FunRaisingIt'}. A member of our team is reviewing your inquiry and will get back to you shortly.`,
        details: [
          { label: 'Reference', value: params.ticketNo, highlight: true },
          { label: 'Subject', value: params.subject },
          ...(params.campaignName ? [{ label: 'Related Campaign', value: params.campaignName }] : []),
          { label: 'Message', value: params.message },
        ],
      }
    )
  }

  const adminEmails = await getAdminEmails()
  if (adminEmails.length > 0) {
    await sendTransactionalTemplate(
      adminEmails,
      `New support inquiry received: "${params.subject}"`,
      {
        previewText: `New support inquiry (${params.ticketNo}) from ${params.userEmail}.`,
        headerSubTitle: 'Support Inquiry',
        badgeText: 'New Inquiry',
        badgeTone: 'orange',
        heading: 'New Support Inquiry',
        greeting: 'Hi Team,',
        introText: `A user has submitted a new support inquiry on ${configs.site.name || 'FunRaisingIt'}.`,
        details: [
          { label: 'Reference', value: params.ticketNo, highlight: true },
          { label: 'From', value: params.userEmail },
          { label: 'Subject', value: params.subject },
          ...(params.campaignName ? [{ label: 'Campaign', value: params.campaignName }] : []),
          { label: 'Message', value: params.message },
        ],
        ctaText: 'View in Dashboard',
        ctaUrl: `${clientUrl}/admin`,
      },
      true
    )
  }
}
