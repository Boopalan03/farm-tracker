const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');

const NOREPLY_EMAIL = process.env.NOREPLY_EMAIL || 'noreply@farmtracker.com';
const NOREPLY_NAME = process.env.NOREPLY_NAME || 'FarmTracker Automated Reports';

/**
 * Sends a monthly farm report email with attached PDF.
 * Uses noreply@farmtracker.com as the sender.
 */
async function sendMonthlyReportEmail({ to, farmName, monthName, year, pdfBuffer, summaryData }) {
  const subject = `Monthly Farm Report - ${monthName} ${year} (${farmName || 'Your Farm'})`;
  const attachmentFilename = `Monthly_Farm_Report_${monthName}_${year}.pdf`;

  const totalRev = summaryData?.totalRevenue != null ? Number(summaryData.totalRevenue).toFixed(2) : '0.00';
  const totalExp = summaryData?.totalExpenses != null ? Number(summaryData.totalExpenses).toFixed(2) : '0.00';
  const netProf = summaryData?.netProfit != null ? Number(summaryData.netProfit).toFixed(2) : '0.00';
  const isProfitable = Number(netProf) >= 0;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 16px; margin-bottom: 20px; color: #334155; }
    .stats-card { background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .stats-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 15px; }
    .stats-row:last-child { border-bottom: none; font-weight: 700; }
    .amount-profit { color: #10b981; font-weight: 600; }
    .amount-loss { color: #ef4444; font-weight: 600; }
    .attachment-badge { display: inline-flex; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #047857; margin: 15px 0; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; }
    .noreply-notice { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #92400e; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 ${farmName || 'FarmTracker'}</h1>
      <p>Monthly Performance & Accounting Report</p>
    </div>
    <div class="content">
      <div class="greeting">
        Hello <strong>${farmName || 'Farm Manager'}</strong>,<br/>
        Here is your monthly summary report for <strong>${monthName} ${year}</strong>.
      </div>

      <div class="stats-card">
        <div style="font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 10px; font-weight: 600;">
          Financial Overview (${monthName} ${year})
        </div>
        <div class="stats-row">
          <span>Total Sales Revenue:</span>
          <span style="color: #059669; font-weight: 600;">₹${totalRev}</span>
        </div>
        <div class="stats-row">
          <span>Total Operational Expenses:</span>
          <span style="color: #dc2626; font-weight: 600;">₹${totalExp}</span>
        </div>
        <div class="stats-row">
          <span>Net ${isProfitable ? 'Profit' : 'Loss'}:</span>
          <span class="${isProfitable ? 'amount-profit' : 'amount-loss'}">₹${netProf}</span>
        </div>
      </div>

      <div class="attachment-badge">
        📎 <strong>Attached:</strong> ${attachmentFilename}
      </div>

      <p style="font-size: 14px; color: #64748b; margin-top: 15px;">
        The attached PDF report contains the full itemized breakdown including herd inventory counts, product sales, and veterinary/feed expense logs.
      </p>
    </div>

    <div class="footer">
      <div class="noreply-notice">
        ⚠️ <strong>Note:</strong> This is an automated email sent from <code>${NOREPLY_EMAIL}</code>. Please do not reply directly to this address.
      </div>
      © ${year} FarmTracker System • Automated Livestock & Harvest Accounting
    </div>
  </div>
</body>
</html>
  `;

  // Try using nodemailer
  try {
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT) || 465;
      const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

      // Ensure sender email matches SMTP user for Gmail
      const senderAddress = process.env.SMTP_USER || NOREPLY_EMAIL;

      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_HOST.includes('gmail') ? 'gmail' : undefined,
        host: process.env.SMTP_HOST,
        port: port,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
        },
      });

      const info = await transporter.sendMail({
        from: `"${NOREPLY_NAME}" <${senderAddress}>`,
        replyTo: senderAddress,
        to,
        subject,
        html: htmlContent,
        attachments: [
          {
            filename: attachmentFilename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      console.log('Monthly report sent via Nodemailer to:', to, 'MessageId:', info.messageId);
      return { success: true, messageId: info.messageId, recipient: to, sender: senderAddress };
    }
  } catch (nodemailerErr) {
    console.error('Nodemailer Error:', nodemailerErr);
    throw nodemailerErr;
  }

  // Pure Node.js SMTP transport if SMTP_HOST is defined in .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await sendRawSmtp({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: NOREPLY_EMAIL,
        fromName: NOREPLY_NAME,
        to,
        subject,
        html: htmlContent,
        attachmentFilename,
        attachmentBuffer: pdfBuffer,
      });
      console.log(`[REAL EMAIL DELIVERED] To: ${to} from ${NOREPLY_EMAIL} via ${process.env.SMTP_HOST}`);
      return { success: true, simulated: false, recipient: to, sender: NOREPLY_EMAIL };
    } catch (smtpErr) {
      console.error('SMTP Delivery Error:', smtpErr.message);
      throw smtpErr; // Let the caller know real delivery failed rather than silently mocking!
    }
  }

  // Local outbox fallback for development/offline mode (when SMTP is not configured)
  const outboxDir = path.join(__dirname, '..', 'outbox');
  if (!fs.existsSync(outboxDir)) {
    fs.mkdirSync(outboxDir, { recursive: true });
  }

  const timestamp = Date.now();
  const metaFile = path.join(outboxDir, `report_${timestamp}.json`);
  const pdfFile = path.join(outboxDir, `report_${timestamp}_${attachmentFilename}`);

  fs.writeFileSync(pdfFile, pdfBuffer);
  fs.writeFileSync(metaFile, JSON.stringify({
    from: `"${NOREPLY_NAME}" <${NOREPLY_EMAIL}>`,
    replyTo: NOREPLY_EMAIL,
    to,
    subject,
    date: new Date().toISOString(),
    attachment: pdfFile,
    status: 'Delivered (Simulated/Dev Outbox)'
  }, null, 2));

  console.log(`[MOCK EMAIL SENT] From: "${NOREPLY_NAME}" <${NOREPLY_EMAIL}> | To: ${to} | Subject: ${subject}`);
  return {
    success: true,
    simulated: true,
    recipient: to,
    sender: NOREPLY_EMAIL,
    message: `Report sent to ${to} from ${NOREPLY_EMAIL}.`
  };
}

/**
 * Pure Node.js TLS/SSL SMTP client for sending attachments without extra npm packages
 */
function sendRawSmtp({ host, port, user, pass, from, fromName, to, subject, html, attachmentFilename, attachmentBuffer }) {
  return new Promise((resolve, reject) => {
    const cleanUser = (user || '').trim();
    const cleanPass = (pass || '').replace(/\s+/g, '');
    const envelopeFrom = cleanUser.includes('@') ? cleanUser : from;

    const isSecure = Number(port) === 465;
    const socket = isSecure 
      ? tls.connect({ host, port: Number(port), servername: host }) 
      : net.connect({ host, port: Number(port) });

    let buffer = '';
    let step = 0;

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const base64Attachment = attachmentBuffer.toString('base64');
    const chunkedAttachment = base64Attachment.match(/.{1,76}/g).join('\r\n');

    const mimeMessage = [
      `From: "${fromName}" <${envelopeFrom}>`,
      `To: <${to}>`,
      `Reply-To: <${from}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${attachmentFilename}"`,
      `Content-Disposition: attachment; filename="${attachmentFilename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      chunkedAttachment,
      ``,
      `--${boundary}--`,
      `.`,
      ``
    ].join('\r\n');

    socket.setEncoding('utf8');

    socket.on('data', (chunk) => {
      buffer += chunk;

      // Split lines and check if the last non-empty line represents the final response
      const lines = buffer.split('\r\n');
      let lastLine = '';
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim()) {
          lastLine = lines[i];
          break;
        }
      }

      const match = lastLine.match(/^(\d{3})(\s|-)(.*)$/);
      if (!match) return;
      if (match[2] === '-') return; // Multi-line response continuation; wait for final line

      const code = parseInt(match[1], 10);
      buffer = ''; // Reset buffer for next command response

      if (code >= 400) {
        socket.end();
        return reject(new Error(`SMTP error ${code}: ${lastLine}`));
      }

      if (step === 0 && code === 220) {
        step++;
        socket.write(`EHLO localhost\r\n`);
      } else if (step === 1 && code === 250) {
        step++;
        socket.write(`AUTH LOGIN\r\n`);
      } else if (step === 2 && code === 334) {
        step++;
        socket.write(`${Buffer.from(cleanUser).toString('base64')}\r\n`);
      } else if (step === 3 && code === 334) {
        step++;
        socket.write(`${Buffer.from(cleanPass).toString('base64')}\r\n`);
      } else if (step === 4 && (code === 235 || code === 250)) {
        step++;
        socket.write(`MAIL FROM:<${envelopeFrom}>\r\n`);
      } else if (step === 5 && code === 250) {
        step++;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 6 && code === 250) {
        step++;
        socket.write(`DATA\r\n`);
      } else if (step === 7 && code === 354) {
        step++;
        socket.write(mimeMessage);
      } else if (step === 8 && code === 250) {
        step++;
        socket.write(`QUIT\r\n`);
        resolve(true);
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(25000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    });
  });
}

module.exports = {
  sendMonthlyReportEmail,
  NOREPLY_EMAIL
};
