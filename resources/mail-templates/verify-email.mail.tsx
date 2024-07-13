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
import * as React from 'react'

interface KortexVerifyEmailProps {
  validationCode?: string
  authToken?: string
}

// const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

export const KortexVerifyEmail = ({ validationCode, authToken }: KortexVerifyEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify Your Email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={`/logo`} width="42" height="42" alt="Kortex" style={logo} />
        <Heading style={heading}>Verify Your Email</Heading>
        <Section style={buttonContainer}>
          <Button
            style={button}
            href={`${frontendUrl}/verify-email?code=${validationCode}${authToken}`}
          >
            Click here to verify your email
          </Button>
        </Section>
        <Text style={paragraph}>
          Thanks for signing up for Kortex! To complete your registration, please verify your email
          address by entering the following code:
        </Text>
        <code style={code}>{validationCode}</code>
        <Hr style={hr} />
        <Text style={paragraph}>
          Kortex will never ask you for your password or verification code in an email. If you
          didn't request this code, please ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default KortexVerifyEmail

const logo = {
  borderRadius: 21,
  width: 42,
  height: 42,
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 0 0',
}

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#3c4149',
}

const buttonContainer = {
  padding: '27px 0 27px',
}

const button = {
  backgroundColor: '#5e6ad2',
  borderRadius: '3px',
  fontWeight: '600',
  color: '#fff',
  fontSize: '15px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '11px 23px',
}

const reportLink = {
  fontSize: '14px',
  color: '#b4becc',
}

const hr = {
  borderColor: '#dfe1e4',
  margin: '42px 0 26px',
}

const code = {
  fontFamily: 'monospace',
  fontWeight: '700',
  padding: '1px 4px',
  backgroundColor: '#dfe1e4',
  letterSpacing: '-0.3px',
  fontSize: '21px',
  borderRadius: '4px',
  color: '#3c4149',
}
