import { authRoutes } from '@app/modules/Auth/user.routes'
import { promoCodeRoutes } from '@app/modules/PromoCode/promo-code.routes'
import { siteInfoRoutes } from '@app/modules/SiteInfo/site-info.routes'
import express, { Router } from 'express'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/site-info',
    route: siteInfoRoutes,
  },
  {
    path: '/promo-code',
    route: promoCodeRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
