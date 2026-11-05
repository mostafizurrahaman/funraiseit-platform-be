import { Html, Head, Body, Container, Preview, Tailwind, Font } from '@react-email/components'
import * as React from 'react'

export const EmailLayout = ({
  children,
  previewText,
}: {
  children: React.ReactNode
  previewText: string
}) => {
  return (
    <Html>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: {
                  DEFAULT: '#03AFA8', // Primary Teal
                  secondary: '#FE7B01', // Secondary Orange
                },
                dark: '#111827',
                slate: {
                  50: '#f8fafc',
                  100: '#f1f5f9',
                  200: '#e2e8f0',
                  400: '#94a3b8',
                  600: '#475569',
                  800: '#1e293b',
                  900: '#0f172a',
                },
              },
            },
          },
        }}
      >
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="x-apple-disable-message-reformatting" />
          <Font
            fontFamily="Inter"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
              format: 'woff2',
            }}
            fontWeight={400}
            fontStyle="normal"
          />
          <style>{`
            @media only screen and (max-width: 600px) {
              .email-body {
                padding: 12px 8px !important;
              }
              .email-container {
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 12px !important;
              }
              .email-header {
                padding: 24px 16px !important;
              }
              .email-content {
                padding-left: 16px !important;
                padding-right: 16px !important;
              }
              .email-card {
                padding: 16px !important;
              }
              .email-otp {
                font-size: 26px !important;
                letter-spacing: 6px !important;
              }
              .email-btn {
                display: block !important;
                width: 100% !important;
                box-sizing: border-box !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                margin-bottom: 10px !important;
              }
              .stack-col {
                display: block !important;
                width: 100% !important;
                text-align: left !important;
                padding-bottom: 8px !important;
              }
            }
          `}</style>
        </Head>
        <Preview>{previewText}</Preview>

        <Body className="email-body bg-[#f6f9fc] py-8 px-3 sm:py-12 sm:px-4 font-sans text-slate-800 m-0">
          <Container className="email-container w-full max-w-[600px] mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
