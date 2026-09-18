import nodemailer from "nodemailer";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // GoDaddy Workspace Email: 465 = implicit SSL, 587 = STARTTLS
    auth: { user, pass },
  });
  return cachedTransporter;
}

/**
 * Best-effort email send via the company's GoDaddy Workspace Email mailbox over SMTP —
 * never throws. Callers should treat email delivery as pure notification, never something
 * the core monitoring logic depends on. `recipients` is always explicit — callers look up
 * who should actually receive it (e.g. every approved member, or one specific new member).
 */
export async function sendAlertEmail(subject: string, html: string, to: string[]) {
  const from = process.env.ALERT_FROM_EMAIL;

  const transporter = getTransporter();
  if (!transporter || !from || to.length === 0) {
    console.error(
      "Email alert skipped: SMTP_HOST / SMTP_USER / SMTP_PASSWORD / ALERT_FROM_EMAIL not configured, or no recipients",
    );
    return;
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error("Failed to send alert email:", err);
  }
}
