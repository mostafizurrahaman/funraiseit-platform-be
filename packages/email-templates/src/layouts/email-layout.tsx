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
      <Head>
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
      </Head>
      <Preview>{previewText}</Preview>
      
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                // Configured your brand colors globally so you can use 'bg-brand' or 'text-brand-secondary'
                brand: {
                  DEFAULT: '#03AFA8', // Primary Teal
                  secondary: '#FE7B01', // Secondary Orange
                },
                dark: '#111827',
                // Explicitly defining the slate palette for a cooler, modern undertone
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
        {/* Updated background to the modern off-white/blue tint (#f6f9fc) */}
        <Body className="bg-[#f6f9fc] py-12 px-4 font-sans text-slate-800">
          
          {/* Changed rounded-xl to rounded-2xl and synced borders with the slate theme */}
          <Container className="max-w-[600px] mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {children}
          </Container>

        </Body>
      </Tailwind>
    </Html>
  )
}