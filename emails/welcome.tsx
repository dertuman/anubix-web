import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  const displayName = name || 'there';

  return (
    <Html>
      <Head />
      <Preview>Welcome to Anubix — your AI-powered development workspace</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome to Anubix</Heading>

          <Text style={text}>Hey {displayName},</Text>

          <Text style={text}>
            Thanks for signing up. Anubix gives you a cloud-based development
            workspace powered by AI — no local setup required.
          </Text>

          <Section style={section}>
            <Text style={sectionTitle}>Here&apos;s how to get started:</Text>
            <Text style={listItem}>1. Head to your workspace dashboard</Text>
            <Text style={listItem}>2. Provision your first cloud workspace</Text>
            <Text style={listItem}>3. Start building with AI assistance</Text>
          </Section>

          <Section style={buttonContainer}>
            <Link style={button} href="https://anubix.ai/workspace">
              Go to your workspace
            </Link>
          </Section>

          <Text style={text}>
            If you have any questions, reply to this email or reach out at{' '}
            <Link href="mailto:support@anubix.ai" style={link}>
              support@anubix.ai
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Anubix — AI-powered development workspaces
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#09090b',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 24px',
  maxWidth: '560px',
};

const heading = {
  color: '#fafafa',
  fontSize: '28px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const text = {
  color: '#a1a1aa',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const section = {
  backgroundColor: '#18181b',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
};

const sectionTitle = {
  color: '#fafafa',
  fontSize: '15px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
};

const listItem = {
  color: '#a1a1aa',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 4px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#fafafa',
  borderRadius: '6px',
  color: '#09090b',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
};

const link = {
  color: '#fafafa',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#27272a',
  margin: '32px 0 16px',
};

const footer = {
  color: '#52525b',
  fontSize: '12px',
  margin: '0',
};
