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

// const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

export const KortexSupportTicketReceived = () => (
  <Html>
    <Head />
    <Preview>Your support ticket has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={`/logo`} width="42" height="42" alt="Kortex" style={logo} />
        <Heading style={heading}>Support Ticket Received</Heading>
        <Text style={paragraph}>Dear user,</Text>
        <Text style={paragraph}>
          Thank you for reaching out to Kortex support. We have received your support ticket.
        </Text>
        <Text style={paragraph}>
          Our support team is reviewing your request and will get back to you as soon as possible.
          You can view the status of your support tickets by clicking the button below:
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={`${frontendUrl}/support/tickets`}>
            View Ticket Status
          </Button>
        </Section>
        <Text style={paragraph}>
          If you have any additional information to provide, please reply to this email.
        </Text>
        <Hr style={hr} />
        <Link href={`${frontendUrl}`} style={reportLink}>
          Kortex
        </Link>
      </Container>
    </Body>
  </Html>
)

export default KortexSupportTicketReceived

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
