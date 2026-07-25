import { accountRoutes } from '@app/modules/Account/account.routes'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { campaignRoutes } from '@app/modules/Campaign/campaign.routes'
import { productRoutes } from '@app/modules/Product/product.routes'
import { promoCodeRoutes } from '@app/modules/PromoCode/promo-code.routes'
import { siteInfoRoutes } from '@app/modules/SiteInfo/site-info.routes'
import { usersRoutes } from '@app/modules/Users/users.routes'
import express, { Router } from 'express'

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
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
