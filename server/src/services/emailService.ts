import nodemailer, { type Transporter } from 'nodemailer';
import { ENV } from '../config.js';

interface SendSpinEmailOptions {
  recipientEmail: string;
  recipientName: string;
  prizeName: string;
  isWin: boolean;
  isGrandPrize: boolean;
  claimCode?: string | null;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  // If SMTP host and credentials are provided in env
  if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  } else if (ENV.SMTP_USER && ENV.SMTP_PASS) {
    // Default to Gmail service if user/pass given without custom host
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  }

  return transporter;
}

/**
 * Sends branded promotional spin result email to the participant.
 */
export async function sendSpinResultEmail(options: SendSpinEmailOptions): Promise<boolean> {
  const { recipientEmail, recipientName, prizeName, isWin, isGrandPrize, claimCode } = options;

  // Validate email format
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return false;
  }

  const isPrecious = prizeName.toLowerCase().includes('precious');
  const isCard = prizeName.toLowerCase().includes('card') || prizeName.toLowerCase().includes('balance') || prizeName.toLowerCase().includes('500') || prizeName.toLowerCase().includes('1000');

  const subject = isPrecious
    ? `🏆 Precious Gift Voucher Winner (Visa Jan 2027 Intake)! Congratulations ${recipientName}!`
    : isCard
    ? `💳 NTC & Ncell Mobile Balance Winner! Congratulations ${recipientName}!`
    : isGrandPrize
    ? `🎉 Grand Prize Winner! Congratulations ${recipientName}!`
    : isWin
    ? `🎉 Congratulations ${recipientName}! You won: ${prizeName}`
    : `Thank you for participating in SUCCESS Education Lucky Draw!`;

  let prizeSectionHtml = '';
  if (isPrecious || isGrandPrize) {
    prizeSectionHtml = `
      <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border-radius: 12px; padding: 24px; text-align: center; color: #FFFFFF; margin: 24px 0; border: 2px solid #FDE047;">
        <span style="font-size: 36px; display: block; margin-bottom: 8px;">🏆 ✈️ 🎓</span>
        <h2 style="margin: 0 0 6px 0; font-size: 22px; color: #FDE047; text-transform: uppercase;">PRECIOUS GIFT VOUCHER WINNER!</h2>
        <p style="font-size: 14px; color: #FEF08A; margin: 0 0 10px 0; font-weight: 600;">SUCCESS EDUCATION & VISA SERVICES — VISA JAN 2027 INTAKE</p>
        <p style="font-size: 20px; font-weight: bold; margin: 4px 0 16px 0;">${prizeName}</p>
        <div style="background: rgba(0, 0, 0, 0.45); border: 1px dashed #FDE047; border-radius: 8px; padding: 14px; display: inline-block; margin: 8px auto;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #FEF08A;">Your Official Claim Code:</div>
          <div style="font-size: 22px; font-family: monospace; font-weight: bold; color: #FFFFFF; letter-spacing: 2px; margin-top: 4px;">${claimCode ?? 'PRECIOUS-WINNER'}</div>
        </div>
        <p style="font-size: 13px; color: #FEE2E2; margin-top: 14px; margin-bottom: 0;">
          Congratulations on appearing for your Visa Jan 2027 intake with Success Education and Visa services! Please present this email along with your Claim Code at our Kumaripati office to redeem your voucher.
        </p>
      </div>
    `;
  } else if (isCard) {
    prizeSectionHtml = `
      <div style="background: linear-gradient(135deg, #1E3A8A 0%, #172554 100%); border-radius: 12px; padding: 24px; text-align: center; color: #FFFFFF; margin: 24px 0; border: 2px solid #60A5FA;">
        <span style="font-size: 36px; display: block; margin-bottom: 8px;">📱 💳</span>
        <h2 style="margin: 0 0 6px 0; font-size: 22px; color: #93C5FD; text-transform: uppercase;">NTC / NCELL MOBILE BALANCE RECHARGE</h2>
        <p style="font-size: 20px; font-weight: bold; margin: 4px 0 16px 0; color: #FFFFFF;">${prizeName}</p>
        ${claimCode ? `
        <div style="background: rgba(0, 0, 0, 0.45); border: 1px dashed #60A5FA; border-radius: 8px; padding: 12px; display: inline-block; margin: 8px auto;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #BFDBFE;">Your Recharge Claim Code:</div>
          <div style="font-size: 20px; font-family: monospace; font-weight: bold; color: #FDE047; letter-spacing: 2px; margin-top: 4px;">${claimCode}</div>
        </div>` : ''}
        <p style="font-size: 13px; color: #DBEAFE; margin-top: 14px; margin-bottom: 0;">
          Show this email at Success Education & Visa Services (Kumaripati, Lalitpur) to claim your NTC or Ncell mobile balance recharge.
        </p>
      </div>
    `;
  } else if (isWin) {
    prizeSectionHtml = `
      <div style="background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%); border-radius: 12px; padding: 24px; text-align: center; color: #FFFFFF; margin: 24px 0; border: 1px solid rgba(255,255,255,0.2);">
        <span style="font-size: 32px; display: block; margin-bottom: 8px;">🎁 🎉</span>
        <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #93C5FD;">CONGRATULATIONS!</h2>
        <p style="font-size: 22px; font-weight: bold; margin: 4px 0 12px 0; color: #FFFFFF;">You won: ${prizeName}</p>
        <p style="font-size: 13px; color: #DBEAFE; margin: 0;">
          Show this email at SUCCESS Education & Visa Services, Kumaripati branch to claim your prize.
        </p>
      </div>
    `;
  } else {
    prizeSectionHtml = `
      <div style="background: #1E293B; border-radius: 12px; padding: 24px; text-align: center; color: #FFFFFF; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1);">
        <span style="font-size: 28px; display: block; margin-bottom: 8px;">✨</span>
        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #94A3B8;">Better Luck Next Time!</h2>
        <p style="font-size: 14px; color: #CBD5E1; margin: 0; line-height: 1.5;">
          Thank you for joining our festive spin event. Visit our office or speak with our counselors to learn about exclusive scholarships and study abroad guidance!
        </p>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" style="max-width: 600px; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1F2937; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(90deg, #DC2626 0%, #1D4ED8 100%); padding: 24px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">SUCCESS</h1>
                  <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Education & Visa Services</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 30px 24px;">
                  <p style="font-size: 16px; margin: 0 0 12px 0; color: #F8FAFC;">
                    Dear <strong>${recipientName}</strong>,
                  </p>
                  <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 16px 0;">
                    Thank you for participating in the <strong>SUCCESS Education & Visa Services Festive Lucky Draw</strong>!
                  </p>

                  ${prizeSectionHtml}

                  <!-- Contact / Location Box -->
                  <div style="background-color: #1F2937; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #94A3B8;">
                    <div style="font-weight: bold; color: #F8FAFC; margin-bottom: 6px;">📍 Visit Our Office:</div>
                    <div>SUCCESS Education & Visa Services</div>
                    <div>Kumaripati, Lalitpur, Nepal</div>
                    <div style="margin-top: 6px;">📧 Email: <a href="mailto:kumaripati@successedu.com.au" style="color: #60A5FA; text-decoration: none;">kumaripati@successedu.com.au</a></div>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #0B0F19; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B;">
                  <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} SUCCESS Education & Visa Services. All rights reserved.</p>
                  <p style="margin: 0; font-size: 11px;">This is an automated notification from our promotional lucky draw system.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(
      `[EmailService] SMTP credentials not set in ENV. Simulated sending email to: ${recipientEmail} from: ${ENV.EMAIL_FROM} (Subject: ${subject})`
    );
    return true;
  }

  try {
    const info = await mailTransporter.sendMail({
      from: ENV.EMAIL_FROM,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });
    console.log(`[EmailService] Email successfully sent to ${recipientEmail}: messageId=${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${recipientEmail}:`, error);
    return false;
  }
}
