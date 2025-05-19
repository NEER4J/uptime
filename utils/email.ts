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

// Constants for alert thresholds
const SSL_EXPIRY_WARNING_DAYS = 7;
const DOMAIN_EXPIRY_WARNING_DAYS = 7;

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
    
    // Determine if this alert should be sent immediately
    // Send immediately for downtime or if expiry is 7 days or less
    const sendImmediately = 
      options.type === 'downtime' || 
      (options.type === 'ssl-expiry' && options.daysRemaining !== undefined && options.daysRemaining <= SSL_EXPIRY_WARNING_DAYS) ||
      (options.type === 'domain-expiry' && options.daysRemaining !== undefined && options.daysRemaining <= DOMAIN_EXPIRY_WARNING_DAYS);
    
    // Skip notifications if not urgent enough
    if (!sendImmediately) {
      console.log(`Skipping non-urgent notification for ${options.domain} (${options.type})`);
      return true;
    }
    
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
      }),
      is_urgent: sendImmediately
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

/**
 * Checks all domains for upcoming expirations (SSL/domain)
 * and sends email alerts for those expiring within the threshold days
 */
export async function checkAndSendExpiryAlerts(): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get all domains
    const { data: domains, error: domainsError } = await supabase
      .from("domains")
      .select("*");
    
    if (domainsError) {
      console.error("Failed to fetch domains:", domainsError);
      return;
    }
    
    if (!domains || domains.length === 0) {
      console.log("No domains found to check for expiry");
      return;
    }
    
    const domainIds = domains.map(domain => domain.id);
    
    // Get latest SSL info for each domain
    const { data: sslData, error: sslError } = await supabase
      .from('ssl_info')
      .select('*')
      .in('domain_id', domainIds)
      .order('checked_at', { ascending: false });
    
    if (sslError) {
      console.error("Failed to fetch SSL info:", sslError);
      return;
    }
    
    // Get latest domain expiry info for each domain
    const { data: expiryData, error: expiryError } = await supabase
      .from('domain_expiry')
      .select('*')
      .in('domain_id', domainIds)
      .order('checked_at', { ascending: false });
    
    if (expiryError) {
      console.error("Failed to fetch domain expiry info:", expiryError);
      return;
    }
    
    // Group data by domain_id to get the latest records
    const latestSSL: Record<string, any> = {};
    sslData?.forEach(ssl => {
      if (!latestSSL[ssl.domain_id] || new Date(ssl.checked_at) > new Date(latestSSL[ssl.domain_id].checked_at)) {
        latestSSL[ssl.domain_id] = ssl;
      }
    });
    
    const latestExpiry: Record<string, any> = {};
    expiryData?.forEach(exp => {
      if (!latestExpiry[exp.domain_id] || new Date(exp.checked_at) > new Date(latestExpiry[exp.domain_id].checked_at)) {
        latestExpiry[exp.domain_id] = exp;
      }
    });
    
    // Check each domain for upcoming expiration
    for (const domain of domains) {
      const ssl = latestSSL[domain.id];
      const expiry = latestExpiry[domain.id];
      
      // Check SSL expiry
      if (ssl && ssl.days_remaining <= SSL_EXPIRY_WARNING_DAYS) {
        await sendAlert({
          type: 'ssl-expiry',
          domain: domain.domain_name,
          displayName: domain.display_name,
          message: `SSL certificate for ${domain.display_name || domain.domain_name} is expiring soon!`,
          daysRemaining: ssl.days_remaining
        });
      }
      
      // Check domain expiry
      if (expiry && expiry.days_remaining <= DOMAIN_EXPIRY_WARNING_DAYS) {
        await sendAlert({
          type: 'domain-expiry',
          domain: domain.domain_name,
          displayName: domain.display_name,
          message: `Domain registration for ${domain.display_name || domain.domain_name} is expiring soon!`,
          daysRemaining: expiry.days_remaining
        });
      }
    }
    
    console.log("Completed expiry alerts check");
    
  } catch (error) {
    console.error("Error checking for expiry alerts:", error);
  }
} 