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
    
    // First, check notification preference settings
    const { data: notificationSettings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .single();
    
    if (settingsError) {
      console.error("Failed to fetch notification settings:", settingsError);
    }
    
    const emailEnabled = notificationSettings?.email_enabled !== false; // Default to true if not found
    const smsEnabled = notificationSettings?.sms_enabled !== false; // Default to true if not found
    
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
    
    const emailRecipients = emailEnabled ? (emailSettings?.map(s => s.email) || []) : [];
    const phoneRecipients = smsEnabled ? (phoneSettings?.map(s => s.phone_number) || []) : [];
    
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
    
    let emailSuccess = false;
    let smsSuccess = false;
    
    // Only send email if it's enabled
    if (emailEnabled && emailRecipients.length > 0) {
      emailSuccess = await sendEmailAlert(
        {
          ...options,
          message: detailedMessage
        },
        emailRecipients
      );
    } else {
      console.log(`Email notifications are ${emailEnabled ? 'enabled but no recipients configured' : 'disabled'}`);
    }
    
    // Only send SMS if it's enabled
    if (smsEnabled && phoneRecipients.length > 0) {
      smsSuccess = await sendSMSAlert(
        {
          ...options,
          message: detailedMessage
        },
        phoneRecipients
      );
    } else {
      console.log(`SMS notifications are ${smsEnabled ? 'enabled but no recipients configured' : 'disabled'}`);
    }
    
    return emailSuccess || smsSuccess;
  } catch (error) {
    console.error("Error sending alerts:", error);
    // For backward compatibility, just log the alert if something fails
    console.log('ALERT:', options.type, options.message);
    return true;
  }
}

// Helper function to get a detailed message for the alert
function getDetailedMessage(options: AlertOptions): string {
  let message = options.message;
  
  // If message doesn't already include full details, add them
  if (!message.includes(options.domain)) {
    message += `\n\nDomain: ${options.displayName || options.domain}`;
  }
  
  if (options.daysRemaining !== undefined && !message.includes('days remaining')) {
    message += `\nDays Remaining: ${options.daysRemaining}`;
    
    if (options.type === 'ssl-expiry' || options.type === 'domain-expiry') {
      const expiryDate = new Date(Date.now() + options.daysRemaining * 24 * 60 * 60 * 1000);
      message += `\nExpiry Date: ${expiryDate.toLocaleDateString()}`;
    }
  }
  
  return message;
} 