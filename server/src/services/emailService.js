
const { getConfig } = require('../config/env');
const logger = require('../utils/logger');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

async function sendEmailOtp(to, otp, name, purpose) {
  const config = getConfig();

  if (config.skipEmail) {
    logger.info('email', 'email delivery simulated', { purpose });
    return { skipped: true, otp };
  }

  const apiKey = config.brevoApiKey;
  const senderEmail = config.brevoSenderEmail;
  const senderName = config.brevoSenderName;

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo email environment variables are missing');
  }

  const safeName = escapeHtml(name || 'there');
  const safeOtp = escapeHtml(otp);

  const isPasswordReset = purpose === 'password_reset';

  const subject = isPasswordReset
    ? 'Reset your PulseWatch password'
    : 'Verify your PulseWatch email';

  const heading = isPasswordReset
    ? 'Password reset request'
    : 'Verify your email';

  const description = isPasswordReset
    ? 'Use the code below to reset your PulseWatch password.'
    : 'Use the verification code below to complete your registration.';

  const footer = isPasswordReset
    ? 'If you did not request a password reset, you can safely ignore this email. Your password will not change.'
    : 'If you did not create a PulseWatch account, you can ignore this email.';

  const textContent = isPasswordReset
    ? `Hello ${name || 'there'}, your PulseWatch password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`
    : `Welcome to PulseWatch, ${name || 'there'}! Your verification code is ${otp}. It expires in 10 minutes.`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:30px;background:#09090b;font-family:Arial,sans-serif;color:#ffffff;">
            <div style="max-width:480px;margin:auto;padding:32px;background:#18181b;border:1px solid #27272a;border-radius:16px;">
              <h1 style="font-size:24px;margin:0 0 20px;">PulseWatch</h1>

              <h2 style="font-size:20px;">${heading}</h2>

              <p style="color:#a1a1aa;line-height:1.6;">
                Hello ${safeName}, ${description}
              </p>

              <div style="margin:28px 0;padding:20px;text-align:center;background:#27272a;border-radius:12px;">
                <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#ffffff;">
                  ${safeOtp}
                </span>
              </div>

              <p style="color:#a1a1aa;line-height:1.6;">
                This code expires in 10 minutes. Do not share it with anyone.
              </p>

              <p style="margin-top:30px;color:#71717a;font-size:12px;line-height:1.6;">
                ${footer}
              </p>
            </div>
          </body>
        </html>
      `,
      textContent,
    }),
  });

  if (!response.ok) {
    const details = await response.text();

    logger.warn('email', 'provider request failed', {
      statusCode: response.status,
      ...(config.isProduction ? {} : { details })
    });

    throw new Error('Unable to send email');
  }

  return response.json();
}

// Existing registration verification function
async function sendOtpEmail(to, otp, name) {
  return sendEmailOtp(to, otp, name, 'verification');
}

// New password reset function
async function sendPasswordResetOtpEmail(to, otp, name) {
  return sendEmailOtp(to, otp, name, 'password_reset');
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetOtpEmail,
};
