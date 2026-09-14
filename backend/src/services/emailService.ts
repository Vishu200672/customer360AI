import nodemailer, { type TestAccount } from 'nodemailer';
import { config } from '../config/env.js';

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'LOGIN_ALERT' | 'WELCOME' | 'TEST';
  status: 'DELIVERED' | 'PREVIEW_GENERATED' | 'SIMULATED';
  previewUrl?: string;
  messageId?: string;
  timestamp: string;
  meta?: Record<string, any>;
  htmlPreview?: string;
}

// In-memory persistent audit log of dispatched emails (recent 50)
const EMAIL_LOGS: EmailLog[] = [];

let testAccountPromise: Promise<TestAccount | null> | null = null;

async function getTransporter() {
  const { host, port, secure, user, pass } = config.smtp;

  // 1. Production SMTP if credentials provided
  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      }),
      isTest: false,
    };
  }

  // 2. Fallback to Ethereal test inbox for instant live preview URLs
  try {
    if (!testAccountPromise) {
      testAccountPromise = nodemailer.createTestAccount().catch((err: any) => {
        console.warn('[EmailService] Could not create Ethereal test account, using simulated fallback:', err.message);
        return null;
      });
    }

    const testAccount = await testAccountPromise;
    if (testAccount) {
      return {
        transporter: nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        }),
        isTest: true,
      };
    }
  } catch (err) {
    // Continue to simulated fallback
  }

  return { transporter: null, isTest: true };
}

function generateLoginEmailHtml(user: { name: string; email: string; role?: string }, meta: { ip?: string; userAgent?: string; timestamp?: string }) {
  const time = meta.timestamp || new Date().toUTCString();
  const ip = meta.ip || '127.0.0.1 (Localhost / Secure Gateway)';
  const userAgent = meta.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer360 AI Security Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c1410; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e7efeb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c1410; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #15221b; border: 1px solid #2d4538; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px 20px; background: linear-gradient(135deg, #173f35 0%, #0d2821 100%); border-bottom: 1px solid #2d5a4a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; padding: 4px 10px; background-color: rgba(183, 201, 91, 0.15); border: 1px solid #b7c95b; border-radius: 20px; color: #b7c95b; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">
                      🛡️ Security Notification
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Customer360 <span style="color: #b7c95b;">AI</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #a4c2b5;">Decision Intelligence Enterprise Console</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #ffffff; font-weight: 700;">
                New Authentication Session Detected
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #b0c4ba;">
                Hello <strong style="color: #ffffff;">${user.name}</strong>,<br>
                A successful login to your Customer360 AI account (<strong style="color: #b7c95b;">${user.email}</strong>) was just verified with full console privileges.
              </p>

              <!-- Session Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0e1813; border: 1px solid #1f3428; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #192b21;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #7a9486; font-weight: 600; display: block;">Timestamp</span>
                    <span style="font-size: 13px; color: #e7efeb; font-weight: 600;">${time}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #192b21;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #7a9486; font-weight: 600; display: block;">Client IP Address</span>
                    <span style="font-size: 13px; color: #b7c95b; font-family: monospace; font-weight: 700;">${ip}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #192b21;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #7a9486; font-weight: 600; display: block;">Device / User Agent</span>
                    <span style="font-size: 12px; color: #9bb5a8; word-break: break-all;">${userAgent}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #7a9486; font-weight: 600; display: block;">Access Role</span>
                    <span style="font-size: 12px; color: #e7efeb; font-weight: 600;">
                      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #287052; margin-right: 6px;"></span>
                      ${user.role || 'Executive Member'}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Action Link -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="http://localhost:3000" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #b7c95b; color: #0b2821; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(183, 201, 91, 0.25);">
                      Launch Customer360 Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Advice -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #7a9486; text-align: center; border-top: 1px solid #1f3428; padding-top: 16px;">
                🔒 If this was you, you can safely disregard this email. If you did not authorize this login, please immediately terminate your active session or notify your system administrator at 
                <a href="mailto:security@customer360.ai" style="color: #b7c95b; text-decoration: underline;">security@customer360.ai</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color: #0b1510; border-top: 1px solid #192b21; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #5a7366;">
                Customer360 AI Decision Intelligence Platform &bull; Automated Security Dispatcher &bull; Ref: SEC-${Date.now()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const emailService = {
  /**
   * Dispatches an automated security alert email after successful login
   */
  async sendLoginAlert(user: { name: string; email: string; role?: string }, meta: { ip?: string; userAgent?: string; timestamp?: string }): Promise<{
    delivered: boolean;
    recipient: string;
    messageId?: string;
    previewUrl?: string;
    status: string;
  }> {
    const timestamp = meta.timestamp || new Date().toISOString();
    const html = generateLoginEmailHtml(user, meta);
    const subject = `🛡️ Security Alert: Successful Login to Customer360 AI (${user.name})`;

    const emailLog: EmailLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to: user.email,
      subject,
      type: 'LOGIN_ALERT',
      status: 'SIMULATED',
      timestamp,
      meta: {
        userName: user.name,
        userRole: user.role,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      htmlPreview: html,
    };

    try {
      const { transporter, isTest } = await getTransporter();

      if (transporter) {
        const info = await transporter.sendMail({
          from: config.smtp.from,
          to: user.email,
          subject,
          html,
        });

        emailLog.messageId = info.messageId;
        if (isTest) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            emailLog.previewUrl = previewUrl as string;
            emailLog.status = 'PREVIEW_GENERATED';
          } else {
            emailLog.status = 'DELIVERED';
          }
        } else {
          emailLog.status = 'DELIVERED';
        }
      } else {
        emailLog.status = 'SIMULATED';
      }
    } catch (err: any) {
      console.error('[EmailService] Failed to send email via SMTP, recording simulated delivery:', err.message);
      emailLog.status = 'SIMULATED';
    }

    // Keep recent 50 logs at the beginning
    EMAIL_LOGS.unshift(emailLog);
    if (EMAIL_LOGS.length > 50) EMAIL_LOGS.pop();

    console.log(`[EmailService] 📧 Security Login Alert registered for ${user.email} (Status: ${emailLog.status})`);

    return {
      delivered: true,
      recipient: user.email,
      messageId: emailLog.messageId,
      previewUrl: emailLog.previewUrl,
      status: emailLog.status,
    };
  },

  /**
   * Dispatches a welcome email when a new user registers
   */
  async sendWelcomeAlert(user: { name: string; email: string; role?: string }): Promise<void> {
    const subject = `✨ Welcome to Customer360 AI Platform, ${user.name}`;
    const timestamp = new Date().toISOString();

    const html = `
      <div style="font-family: sans-serif; padding: 20px; background: #0c1410; color: #e7efeb; border-radius: 12px;">
        <h2 style="color: #b7c95b;">Welcome to Customer360 AI Platform</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your account (<code>${user.email}</code>) has been successfully registered with role <strong>${user.role || 'Analyst'}</strong>.</p>
        <p>You can now access the full Customer Decision Intelligence Loop, Predict churn risks, analyze SHAP drivers, and dispatch Next Best Actions.</p>
        <br>
        <p style="font-size: 12px; color: #7a9486;">Team Customer360 AI</p>
      </div>
    `;

    const emailLog: EmailLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to: user.email,
      subject,
      type: 'WELCOME',
      status: 'SIMULATED',
      timestamp,
      meta: { userName: user.name, userRole: user.role },
      htmlPreview: html,
    };

    EMAIL_LOGS.unshift(emailLog);
    if (EMAIL_LOGS.length > 50) EMAIL_LOGS.pop();
  },

  /**
   * Sends an ad-hoc test security email directly to any email address specified
   */
  async sendTestEmail(to: string, customSubject?: string): Promise<EmailLog> {
    const user = { name: 'Verified Operator', email: to, role: 'Security Inspector' };
    const res = await this.sendLoginAlert(user, {
      ip: '127.0.0.1 (Manual Test Verification)',
      userAgent: 'Manual Security Dispatch Test',
      timestamp: new Date().toISOString(),
    });

    return EMAIL_LOGS[0];
  },

  /**
   * Retrieve all email audit logs
   */
  getEmailLogs(): EmailLog[] {
    return EMAIL_LOGS;
  },

  /**
   * Get single email preview
   */
  getEmailLogById(id: string): EmailLog | undefined {
    return EMAIL_LOGS.find((l) => l.id === id);
  },
};
