import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../config';

/** Amazon SES, the same account and sending domain serika.moe uses. */

let client: SESv2Client | null = null;

function ses(): SESv2Client | null {
  const { ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION } = config.EMAIL;
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) return null;
  client ??= new SESv2Client({
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  });
  return client;
}

export function emailConfigured(): boolean {
  return Boolean(config.EMAIL.ACCESS_KEY_ID && config.EMAIL.SECRET_ACCESS_KEY);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const sender = ses();
  if (!sender) {
    // Local development without SES: print the message so the link is still usable.
    console.warn(`[email] SES not configured. Would send "${input.subject}" to ${input.to}:\n${input.text}`);
    return;
  }

  await sender.send(
    new SendEmailCommand({
      FromEmailAddress: config.EMAIL.FROM,
      Destination: { ToAddresses: [input.to] },
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            Text: { Data: input.text, Charset: 'UTF-8' },
          },
        },
      },
    })
  );
}
