// Basic email alert utility - to be implemented with your preferred email service

interface AlertOptions {
  type: 'downtime' | 'ssl-expiry' | 'domain-expiry' | 'ip-change';
  domain: string;
  displayName?: string;
  message: string;
  daysRemaining?: number;
}

export async function sendAlert(options: AlertOptions): Promise<boolean> {
  // This is a placeholder function - replace with your actual email sending implementation
  // You might want to use services like SendGrid, Mailgun, AWS SES, etc.
  
  console.log('ALERT:', options.type, options.message);
  
  // For now, we'll just log the alert and return success
  return true;
} 