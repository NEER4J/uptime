import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import twilio from 'twilio';

interface TwilioConfig {
  accountSid: string | null;
  authToken: string | null;
  phoneNumber: string | null;
  clientInitialized: boolean;
  validCredentials: boolean;
  error: {
    message: string;
    code?: string;
    status?: number;
    moreInfo?: string;
  } | null;
  accountInfo: {
    friendlyName: string;
    status: string;
    type: string;
    createdAt: Date;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminEmails = adminEmail.split(',').map(email => email.trim().toLowerCase());
    
    if (!session.user?.email || !adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    // Check Twilio configuration
    const configStatus: TwilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 
        `${process.env.TWILIO_ACCOUNT_SID.substring(0, 6)}...` : null,
      authToken: process.env.TWILIO_AUTH_TOKEN ? 
        `${process.env.TWILIO_AUTH_TOKEN.substring(0, 3)}...` : null,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      clientInitialized: false,
      validCredentials: false,
      error: null,
      accountInfo: null
    };
    
    // Try to initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        configStatus.clientInitialized = true;
        
        // Try to fetch account info to validate credentials
        try {
          const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
          configStatus.validCredentials = true;
          configStatus.accountInfo = {
            friendlyName: account.friendlyName,
            status: account.status,
            type: account.type,
            createdAt: account.dateCreated
          };
        } catch (accountError: any) {
          configStatus.error = {
            message: accountError.message,
            code: accountError.code,
            status: accountError.status,
            moreInfo: accountError.moreInfo
          };
        }
      } catch (initError: any) {
        configStatus.error = {
          message: initError.message
        };
      }
    }
    
    // Get phone recipients from database
    const { data: phoneRecipients, error: phoneError } = await supabase
      .from("notification_phones")
      .select("phone_number");
    
    if (phoneError) {
      return NextResponse.json({ 
        error: "Failed to fetch phone recipients", 
        details: phoneError 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      message: "Twilio configuration status",
      config: configStatus,
      recipients: phoneRecipients || []
    });
  } catch (error: any) {
    console.error("Twilio check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 