import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { newsLetterControllers } from './news-letter.controllers'
import { newsLetterValidations } from './news-letter.validations'

const router: Router = express.Router()

router.post(
  '/',
  validateRequest(newsLetterValidations.createNewsLetterSchema),
  newsLetterControllers.createNewsLetter
)

router.get(
  '/all',
  validateRequest(newsLetterValidations.getAllNewsLetterSchema),
  newsLetterControllers.getAllNewsLetter
)

export const newsLetterRoutes = router
