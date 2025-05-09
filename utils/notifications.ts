import nodemailer from 'nodemailer';
import twilio from 'twilio';

interface AlertOptions {
  type: 'downtime' | 'ssl-expiry' | 'domain-expiry' | 'ip-change';
  domain: string;
  displayName?: string;
  message: string;
  daysRemaining?: number;
}

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Configure Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Send email notification
export async function sendEmailAlert(
  options: AlertOptions,
  recipients: string[]
): Promise<boolean> {
  if (!recipients.length) return false;
  
  try {
    const subject = getSubjectByAlertType(options);
    
    // Create HTML content with better formatting
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: ${getAlertColor(options.type)}; margin-top: 0;">${subject}</h1>
        <p style="font-size: 16px; line-height: 1.5;">${options.message}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="margin-top: 0;">Alert Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Domain</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">${options.displayName || options.domain}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">URL</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">${options.domain}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Alert Type</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">${formatAlertType(options.type)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Time</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">${new Date().toLocaleString()}</td>
            </tr>
            ${options.daysRemaining !== undefined ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Days Remaining</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">${options.daysRemaining}</td>
            </tr>
            ${(options.type === 'ssl-expiry' || options.type === 'domain-expiry') ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Expiry Date</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">${new Date(Date.now() + options.daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString()}</td>
            </tr>
            ` : ''}
            ` : ''}
          </table>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          <p>This is an automated message from your Uptime Monitor service.</p>
        </div>
      </div>
    `;
    
    const result = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'alerts@example.com',
      to: recipients.join(', '),
      subject,
      text: options.message,
      html: htmlContent,
    });
    
    console.log(`Email alert sent for ${options.domain}: ${options.type} to ${recipients.length} recipients`);
    return true;
  } catch (error) {
    console.error('Failed to send email alert:', error);
    return false;
  }
}

// Send SMS notification
export async function sendSMSAlert(
  options: AlertOptions,
  phoneNumbers: string[]
): Promise<boolean> {
  // Log Twilio configuration status
  console.log('SMS Alert - Configuration Check:');
  console.log(`- Twilio Client Initialized: ${!!twilioClient}`);
  console.log(`- Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Missing'}`);
  console.log(`- Twilio Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? 'Configured' : 'Missing'}`);
  console.log(`- Twilio Phone Number: ${process.env.TWILIO_PHONE_NUMBER || 'Missing'}`);
  console.log(`- Phone Recipients: ${phoneNumbers.length} recipient(s)`);
  
  if (!twilioClient) {
    console.error('SMS Alert - Error: Twilio client is not initialized. Check your Twilio credentials.');
    return false;
  }
  
  if (!phoneNumbers.length) {
    console.log('SMS Alert - Info: No phone numbers to send SMS to.');
    return false;
  }
  
  try {
    const subject = getSubjectByAlertType(options);
    
    // Keep SMS messages concise but with enough information
    const messageBody = `${subject}: ${options.message}\n\nDomain: ${options.displayName || options.domain}${options.daysRemaining ? `\nDays Remaining: ${options.daysRemaining}` : ''}\nTime: ${new Date().toLocaleString()}`;
    
    console.log(`SMS Alert - Attempting to send to ${phoneNumbers.length} recipient(s)`);
    console.log(`SMS Alert - Message: ${messageBody.substring(0, 100)}${messageBody.length > 100 ? '...' : ''}`);
    
    // Send SMS to each phone number
    const results = await Promise.all(
      phoneNumbers.map(async (phone) => {
        try {
          console.log(`SMS Alert - Sending to: ${phone}`);
          
          const message = await twilioClient.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          });
          
          console.log(`SMS Alert - Successfully sent to ${phone}. SID: ${message.sid}`);
          return { success: true, sid: message.sid };
        } catch (error: any) {
          console.error(`SMS Alert - Failed to send to ${phone}:`, error);
          
          // More detailed error logging
          if (error.code) {
            console.error(`SMS Alert - Error Code: ${error.code}`);
          }
          if (error.message) {
            console.error(`SMS Alert - Error Message: ${error.message}`);
          }
          if (error.status) {
            console.error(`SMS Alert - Error Status: ${error.status}`);
          }
          if (error.moreInfo) {
            console.error(`SMS Alert - More Info: ${error.moreInfo}`);
          }
          
          return { success: false, error };
        }
      })
    );
    
    const successful = results.filter(r => r.success).length;
    console.log(`SMS Alert - Results: ${successful}/${phoneNumbers.length} messages sent successfully`);
    
    return successful > 0;
  } catch (error) {
    console.error('SMS Alert - Failed to send SMS alerts:', error);
    return false;
  }
}

// Helper function to get subject based on alert type
function getSubjectByAlertType(options: AlertOptions): string {
  const domainName = options.displayName || options.domain;
  
  switch (options.type) {
    case 'downtime':
      return `🔴 ALERT: ${domainName} is DOWN`;
    case 'ssl-expiry':
      return `⚠️ SSL Certificate Expiring: ${domainName}`;
    case 'domain-expiry':
      return `⚠️ Domain Expiring: ${domainName}`;
    case 'ip-change':
      return `ℹ️ IP Change Detected: ${domainName}`;
    default:
      return `Alert: ${domainName}`;
  }
}

// Helper function to get color based on alert type
function getAlertColor(type: string): string {
  switch (type) {
    case 'downtime':
      return '#dc2626'; // Red
    case 'ssl-expiry':
    case 'domain-expiry':
      return '#f59e0b'; // Amber
    case 'ip-change':
      return '#3b82f6'; // Blue
    default:
      return '#374151'; // Gray
  }
}

// Helper function to format alert type for display
function formatAlertType(type: string): string {
  switch (type) {
    case 'downtime':
      return 'Downtime Alert';
    case 'ssl-expiry':
      return 'SSL Certificate Expiration';
    case 'domain-expiry':
      return 'Domain Expiration';
    case 'ip-change':
      return 'IP Address Change';
    default:
      return type;
  }
} 