import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkDomainExpiry } from "@/utils/monitoring";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the domain info from the request body
    const { domainId, domain } = await request.json();
    
    if (!domainId || !domain) {
      return NextResponse.json({ error: "Domain ID and domain name are required" }, { status: 400 });
    }
    
    // Check if user is admin (only admins can trigger checks)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminEmails = adminEmail.split(',').map(email => email.trim().toLowerCase());
    
    if (!session.user?.email || !adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    // Perform the domain expiry check
    const result = await checkDomainExpiry(domainId, domain);
    
    return NextResponse.json({
      success: true,
      expiry_date: result.expiryDate,
      days_remaining: result.daysRemaining,
      registrar: result.registrar,
      checked_at: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error("Domain expiry check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 