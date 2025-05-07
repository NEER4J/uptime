import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkDomainUptime, checkSSLExpiry, checkDomainExpiry, checkDomainIpRecords } from "@/utils/monitoring";
import { sendAlert } from "@/utils/email";

// Rate limit the API to prevent abuse
const RATE_LIMIT_SECONDS = 300; // 5 minutes
let lastRunTime = 0;

export async function GET(request: NextRequest) {
  try {
    // Check if the request has a valid authorization header
    // This is a simple way to secure the endpoint - you can use more robust methods
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      console.warn("CRON_SECRET environment variable is not set");
    } else if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check rate limit
    const now = Date.now();
    if (now - lastRunTime < RATE_LIMIT_SECONDS * 1000) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }
    
    // Update the last run time
    lastRunTime = now;
    
    const supabase = await createClient();
    
    // Fetch all domains
    const { data: domains, error } = await supabase
      .from("domains")
      .select("*");
    
    if (error) {
      throw error;
    }
    
    if (!domains || domains.length === 0) {
      return NextResponse.json({ message: "No domains to monitor" });
    }
    
    // Initialize results
    const results = {
      uptime: { success: 0, failed: 0 },
      ssl: { success: 0, failed: 0 },
      domain: { success: 0, failed: 0 },
      ip: { success: 0, failed: 0 },
      alerts: { sent: 0, failed: 0 },
    };
    
    // Process each domain
    for (const domain of domains) {
      try {
        // Check uptime
        const uptimeResult = await checkDomainUptime(domain.id, domain.uptime_url);
        results.uptime.success++;
        
        // If site is down, send alert
        if (!uptimeResult && domain.notify_on_downtime) {
          try {
            await sendAlert({
              type: "downtime",
              domain: domain.domain_name,
              displayName: domain.display_name,
              message: `${domain.display_name || domain.domain_name} (${domain.uptime_url}) is currently DOWN.`,
            });
            results.alerts.sent++;
          } catch (alertError) {
            console.error("Failed to send downtime alert:", alertError);
            results.alerts.failed++;
          }
        }
        
        // Check SSL expiry
        try {
          const sslResult = await checkSSLExpiry(domain.id, domain.domain_name);
          results.ssl.success++;
          
          // If SSL expiring soon, send alert
          if (domain.notify_on_expiry && sslResult.daysRemaining <= 30) {
            try {
              await sendAlert({
                type: "ssl-expiry",
                domain: domain.domain_name,
                displayName: domain.display_name,
                message: `SSL certificate for ${domain.display_name || domain.domain_name} is expiring in ${sslResult.daysRemaining} days (${new Date(sslResult.expiryDate).toLocaleDateString()}).`,
                daysRemaining: sslResult.daysRemaining,
              });
              results.alerts.sent++;
            } catch (alertError) {
              console.error("Failed to send SSL expiry alert:", alertError);
              results.alerts.failed++;
            }
          }
        } catch (sslError) {
          console.error(`SSL check failed for ${domain.domain_name}:`, sslError);
          results.ssl.failed++;
        }
        
        // Check domain expiry
        try {
          const domainResult = await checkDomainExpiry(domain.id, domain.domain_name);
          results.domain.success++;
          
          // If domain expiring soon, send alert
          if (domain.notify_on_expiry && domainResult.daysRemaining <= 30) {
            try {
              await sendAlert({
                type: "domain-expiry",
                domain: domain.domain_name,
                displayName: domain.display_name,
                message: `Domain ${domain.display_name || domain.domain_name} is expiring in ${domainResult.daysRemaining} days (${new Date(domainResult.expiryDate).toLocaleDateString()}).`,
                daysRemaining: domainResult.daysRemaining,
              });
              results.alerts.sent++;
            } catch (alertError) {
              console.error("Failed to send domain expiry alert:", alertError);
              results.alerts.failed++;
            }
          }
        } catch (domainError) {
          console.error(`Domain expiry check failed for ${domain.domain_name}:`, domainError);
          results.domain.failed++;
        }
        
        // Check IP records
        try {
          const ipResult = await checkDomainIpRecords(domain.id, domain.domain_name);
          results.ip.success++;
        } catch (ipError) {
          console.error(`IP records check failed for ${domain.domain_name}:`, ipError);
          results.ip.failed++;
        }
        
      } catch (domainProcessError) {
        console.error(`Failed to process domain ${domain.domain_name}:`, domainProcessError);
      }
    }
    
    return NextResponse.json({
      message: "Monitoring completed",
      timestamp: new Date().toISOString(),
      domains_processed: domains.length,
      results,
    });
    
  } catch (error: any) {
    console.error("Monitoring error:", error);
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 