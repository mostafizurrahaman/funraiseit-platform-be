import { render } from '@react-email/render'
import type { ReactElement } from 'react'

export const renderEmail = async (template: ReactElement | any) => {
  const html = await render(template as ReactElement, { pretty: true })
  const text = await render(template as ReactElement, { plainText: true })

  return { html, text }
}

