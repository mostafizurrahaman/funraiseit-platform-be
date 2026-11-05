import configs from '@app/configs'
import { AuthRoles, AuthStatus, User } from '@repo/db'
import { logger } from './logger'

export const getAdminEmails = async (): Promise<string[]> => {
  const emails = new Set<string>()

  if (configs.superAdmin.email) {
    const trimmed = configs.superAdmin.email.toLowerCase().trim()
    if (trimmed) emails.add(trimmed)
  }

  try {
    const adminUsers = await User.find({
      role: { $in: [AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN] },
      status: AuthStatus.ACTIVE,
    }).select('email')

    for (const u of adminUsers) {
      if (u.email) {
        const trimmed = u.email.toLowerCase().trim()
        if (trimmed) emails.add(trimmed)
      }
    }
  } catch (err) {
    logger.error('Failed to retrieve admin user emails:', err)
  }

  if (emails.size === 0 && configs.site.supportEmail) {
    const trimmed = configs.site.supportEmail.toLowerCase().trim()
    if (trimmed) emails.add(trimmed)
  }

  return Array.from(emails)
}

