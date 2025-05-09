import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import twilio from 'twilio';

export async function POST(request: NextRequest) {
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
    
    // Check for required Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    console.log('Twilio Config Test - Environment variables:');
    console.log(`- TWILIO_ACCOUNT_SID: ${accountSid ? 'Set' : 'Missing'}`);
    console.log(`- TWILIO_AUTH_TOKEN: ${authToken ? 'Set' : 'Missing'}`);
    console.log(`- TWILIO_PHONE_NUMBER: ${phoneNumber || 'Missing'}`);
    
    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        message: "Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.",
        accountSid: !!accountSid,
        authToken: !!authToken,
        phoneNumber: phoneNumber || null,
        connected: false
      });
    }
    
    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        message: "Twilio phone number is not configured. Please set TWILIO_PHONE_NUMBER environment variable.",
        accountSid: true,
        authToken: true,
        phoneNumber: null,
        connected: false
      });
    }
    
    // Initialize Twilio client and test connection
    try {
      console.log('Twilio Config Test - Initializing client');
      const client = twilio(accountSid, authToken);
      
      // Fetch account information to test connection
      console.log('Twilio Config Test - Fetching account information');
      const account = await client.api.accounts(accountSid).fetch();
      
      // Get available phone numbers to confirm account has active numbers
      console.log('Twilio Config Test - Checking if the provided phone number exists');
      const incomingNumbers = await client.incomingPhoneNumbers.list({limit: 20});
      const phoneExists = incomingNumbers.some(
        num => num.phoneNumber === phoneNumber || num.phoneNumber.replace(/\s+/g, '') === phoneNumber
      );
      
      console.log(`Twilio Config Test - Phone number ${phoneNumber} exists: ${phoneExists}`);
      
      return NextResponse.json({
        success: true,
        message: "Twilio configuration is valid",
        accountSid: true,
        authToken: true,
        phoneNumber: phoneNumber,
        phoneNumberVerified: phoneExists,
        connected: true,
        accountType: account.type,
        accountStatus: account.status,
        phoneNumbers: incomingNumbers.length
      });
      
    } catch (error: any) {
      console.error('Twilio Config Test - Error connecting to Twilio:', error);
      
      return NextResponse.json({
        success: false,
        message: `Error connecting to Twilio: ${error.message}`,
        accountSid: true,
        authToken: true,
        phoneNumber: phoneNumber,
        connected: false,
        error: error.message,
        errorCode: error.code,
        errorStatus: error.status,
        errorMoreInfo: error.moreInfo
      });
    }
    
  } catch (error: any) {
    console.error("Twilio test error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 