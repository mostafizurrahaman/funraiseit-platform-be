import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  firstName: string
  companyName: string
  password: string
  productName?: string
  actionUrl: string
  signatureImgSrc?: string
  logoSrc?: string
  accentColor?: string
  greeting?: string
  supportEmail?: string
  footer?: React.ReactNode
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  firstName,
  companyName,
  password,
  productName = companyName,
  actionUrl,
  signatureImgSrc,
  logoSrc,
  accentColor = '#5F51E8',
  greeting = 'Welcome aboard!',
  supportEmail = 'support@example.com',
  footer,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to ${productName}, ${firstName}!`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>

      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {logoSrc && (
            <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Img src={logoSrc} alt={companyName} width="120" height="auto" />
            </Section>
          )}

          <Heading style={{ ...headingStyle, color: accentColor }}>
            {greeting}
          </Heading>

          <Text style={textStyle}>Hi {firstName},</Text>

          <Text style={textStyle}>
            Welcome to <strong>{productName}</strong>! Your account has been
            successfully created by an administrator.
          </Text>

          <Text style={textStyle}>
            Please use the temporary password below to sign in to your account.
          </Text>

          <Section
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e6ebf1',
              borderRadius: '8px',
              padding: '18px',
              margin: '24px 0',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#000',
                margin: 0,
              }}
            >
              Temporary Password
            </Text>

            <Text
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: accentColor,
                letterSpacing: '1px',
                margin: '12px 0 0',
              }}
            >
              {password}
            </Text>
          </Section>

          <Text style={textStyle}>
            For your security, please change your password immediately after
            logging in for the first time.
          </Text>

          <Section style={buttonContainerStyle}>
            <Button
              href={actionUrl}
              style={{
                ...buttonStyle,
                backgroundColor: accentColor,
              }}
            >
              Login to Your Account
            </Button>
          </Section>

          <Text style={textStyle}>
            If you have any questions, feel free to contact our support team at{' '}
            <Link href={`mailto:${supportEmail}`} style={{ color: accentColor }}>
              {supportEmail}
            </Link>
            .
          </Text>

          <Text style={textStyle}>
            Best regards,
            <br />
            The {companyName} Team
          </Text>

          {signatureImgSrc && (
            <Img
              src={signatureImgSrc}
              alt="Signature"
              width="120"
              height="auto"
              style={{ marginTop: '10px' }}
            />
          )}

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            {footer || (
              <Text style={footerTextStyle}>
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const bodyStyle = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  WebkitFontSmoothing: 'antialiased' as 'string',
  margin: '0 auto',
  padding: '0',
}

const containerStyle = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
  marginTop: '40px',
  marginBottom: '40px',
}

const headingStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
}

const textStyle = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#4c4c4c',
  margin: '16px 0',
}

const buttonContainerStyle = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const buttonStyle = {
  backgroundColor: '#5F51E8',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  cursor: 'pointer',
}

const hrStyle = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footerStyle = {
  textAlign: 'center' as const,
}

const footerTextStyle = {
  fontSize: '14px',
  color: '#8898aa',
}