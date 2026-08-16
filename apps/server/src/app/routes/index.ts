import { accountRoutes } from '@app/modules/Account/account.routes'
import { analyticsRoutes } from '@app/modules/analytics/analytics.route'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { campaignRoutes } from '@app/modules/Campaign/campaign.routes'
import { donationRoutes } from '@app/modules/Donation/donation.routes'
import { orderRoutes } from '@app/modules/Order/order.routes'
import { productRoutes } from '@app/modules/Product/product.routes'
import { promoCodeRoutes } from '@app/modules/PromoCode/promo-code.routes'
import { siteInfoRoutes } from '@app/modules/SiteInfo/site-info.routes'
import { usersRoutes } from '@app/modules/Users/users.routes'
import express, { Router } from 'express'
import { supporterRoutes } from '../modules/Supporter/supporter.routes'
import { payoutRoutes } from '@app/modules/Payout/payout.routes'
import { contentRoutes } from '@app/modules/Content/content.routes'
import { brandBuilderRoutes } from '@app/modules/BrandBuilder/brand-builder.routes'
import { paymentRoutes } from '@app/modules/Payment/payment.routes'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/user',
    route: usersRoutes,
  },
  {
    path: '/site-info',
    route: siteInfoRoutes,
  },
  {
    path: '/promo-code',
    route: promoCodeRoutes,
  },
  {
    path: '/account',
    route: accountRoutes,
  },
  {
    path: '/campaign',
    route: campaignRoutes,
  },
  {
    path: '/product',
    route: productRoutes,
  },
  {
    path: '/donation',
    route: donationRoutes,
  },
  {
    path: '/order',
    route: orderRoutes,
  },
  {
    path: '/analytics',
    route: analyticsRoutes,
  },
  {
    path: '/supporter',
    route: supporterRoutes,
  },
  {
    path: '/payout',
    route: payoutRoutes,
  },
  {
    path: '/content',
    route: contentRoutes,
  },
  {
    path: '/brand',
    route: brandBuilderRoutes,
  },
  {
    path: '/payment',
    route: paymentRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
