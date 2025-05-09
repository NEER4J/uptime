// Basic email alert utility - to be implemented with your preferred email service
import { createClient } from "@/utils/supabase/server";
import { sendEmailAlert, sendSMSAlert } from "./notifications";

interface AlertOptions {
  type: 'downtime' | 'ssl-expiry' | 'domain-expiry' | 'ip-change';
  domain: string;
  displayName?: string;
  message: string;
  daysRemaining?: number;
}

export async function sendAlert(options: AlertOptions): Promise<boolean> {
  try {
    // Get notification settings from database
    const supabase = await createClient();
    
    // Get email recipients (now global for all domains)
    const { data: emailSettings, error: emailError } = await supabase
      .from("notification_emails")
      .select("email");
    
    if (emailError) {
      console.error("Failed to fetch email recipients:", emailError);
    }
    
    // Get phone numbers (now global for all domains)
    const { data: phoneSettings, error: phoneError } = await supabase
      .from("notification_phones")
      .select("phone_number");
    
    if (phoneError) {
      console.error("Failed to fetch phone recipients:", phoneError);
    }
    
    const emailRecipients = emailSettings?.map(s => s.email) || [];
    const phoneRecipients = phoneSettings?.map(s => s.phone_number) || [];
    
    // Add detailed information to the message
    const detailedMessage = getDetailedMessage(options);
    
    // Log the alert to the alerts table
    await supabase.from("alerts").insert({
      type: options.type,
      domain: options.domain,
      message: detailedMessage,
      sent_to: JSON.stringify({
        emails: emailRecipients,
        phones: phoneRecipients
      })
    });
    
    // Send email notifications with the enhanced message
    const emailSuccess = await sendEmailAlert(
      {
        ...options,
        message: detailedMessage
      },
      emailRecipients
    );
    
    // Send SMS notifications with the enhanced message
    const smsSuccess = await sendSMSAlert(
      {
        ...options,
        message: detailedMessage
      },
      phoneRecipients
    );
    
    return emailSuccess || smsSuccess;
  } catch (error) {
    console.error("Error sending alerts:", error);
    // For backward compatibility, just log the alert if something fails
    console.log('ALERT:', options.type, options.message);
    return true;
  }
}

// Helper function to create a detailed message with all relevant information
function getDetailedMessage(options: AlertOptions): string {
  const domainName = options.displayName || options.domain;
  const timestamp = new Date().toLocaleString();
  
  let detailedMessage = `${options.message}\n\n`;
  detailedMessage += `Domain: ${domainName}\n`;
  detailedMessage += `URL: ${options.domain}\n`;
  detailedMessage += `Time: ${timestamp}\n`;
  
  if (options.daysRemaining !== undefined) {
    detailedMessage += `Days Remaining: ${options.daysRemaining}\n`;
    
    if (options.type === 'ssl-expiry') {
      detailedMessage += `Expiry Date: ${new Date(Date.now() + options.daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString()}\n`;
    } else if (options.type === 'domain-expiry') {
      detailedMessage += `Expiry Date: ${new Date(Date.now() + options.daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString()}\n`;
    }
  }
  
  return detailedMessage;
} 