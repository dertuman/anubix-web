import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  from?: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, from, react }: SendEmailOptions) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured, skipping email:', subject);
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: from ?? 'Anubix <noreply@anubix.ai>',
    to,
    subject,
    react,
  });

  if (error) {
    console.error('[email] Failed to send:', error);
    return null;
  }

  return data;
}
