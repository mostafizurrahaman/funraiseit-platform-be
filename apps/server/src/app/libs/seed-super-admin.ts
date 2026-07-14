import configs from '@app/configs'
import { AuthRoles, AuthStatus, User } from '@repo/db'
import { hashPassword } from '@repo/shared'

import { logger } from './logger'

export const seedSuperAdmin = async () => {
  const payload = {
    name: 'Fun Raise Super Admin',
    email: configs.superAdmin.email,
    phoneNumber: configs.superAdmin.phoneNumber,
    password: await hashPassword(configs.superAdmin.password, configs.passwordSaltRound),
    role: AuthRoles.SUPER_ADMIN,
    status: AuthStatus.ACTIVE,
    profileImage: '',
    isProfile: true,
    isOtpVerified: true,
  }

  const user = await User.findOne({ email: configs.superAdmin.email })
  try {
    if (user) {
      logger.debug('Super admin already exists. Skipping creation...')
      return
    }

    await User.create(payload)
    logger.info('Super admin created successfully')
  } catch (error) {
    logger.error('Error creating super admin:', error)
  }
}
