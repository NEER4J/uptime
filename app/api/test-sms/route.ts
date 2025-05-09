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
    
    // Get phone number from request body
    const { phoneNumber } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json({ 
        error: "Phone number is required"
      }, { status: 400 });
    }
    
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json({ 
        error: "Invalid phone number format. Must be in international format (e.g., +1234567890)"
      }, { status: 400 });
    }
    
    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !twilioPhone) {
      return NextResponse.json({
        error: "Twilio configuration is incomplete. Please check your environment variables."
      }, { status: 500 });
    }
    
    try {
      // Initialize Twilio client
      console.log(`SMS Test - Sending test SMS to ${phoneNumber}`);
      const client = twilio(accountSid, authToken);
      
      // Send test message
      const message = await client.messages.create({
        body: "This is a test message from your Uptime Monitor application.",
        from: twilioPhone,
        to: phoneNumber
      });
      
      console.log(`SMS Test - Successfully sent! SID: ${message.sid}`);
      
      return NextResponse.json({
        success: true,
        message: "Test SMS sent successfully",
        sid: message.sid,
        status: message.status
      });
      
    } catch (twilioError: any) {
      console.error('SMS Test - Failed to send SMS:', twilioError);
      
      return NextResponse.json({
        error: `Failed to send SMS: ${twilioError.message}`,
        errorCode: twilioError.code,
        errorStatus: twilioError.status,
        errorMoreInfo: twilioError.moreInfo
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("SMS test error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 