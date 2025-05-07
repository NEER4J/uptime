"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import StatusCard from "@/components/StatusCard";
import DashboardHeader from "@/components/DashboardHeader";
import StatsOverview from "@/components/StatsOverview";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AlertTriangle } from "lucide-react";

interface Domain {
  id: string;
  domain_name: string;
  display_name: string | null;
  uptime_url: string;
}

interface UptimeInfo {
  id: string;
  domain_id: string;
  status: boolean;
  checked_at: string;
}

interface SSLInfo {
  id: string;
  domain_id: string;
  expiry_date: string;
  days_remaining: number;
  checked_at: string;
}

interface DomainExpiry {
  id: string;
  domain_id: string;
  expiry_date: string;
  days_remaining: number;
  checked_at: string;
}

interface IPInfo {
  id: string;
  domain_id: string;
  primary_ip: string;
  checked_at: string;
}

interface DomainWithStatus extends Domain {
  uptime?: UptimeInfo;
  ssl?: SSLInfo;
  domain_expiry?: DomainExpiry;
  ip_records?: IPInfo;
}

export default function PublicDashboard() {
  const [domains, setDomains] = useState<DomainWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const supabase = createClient();

  const fetchDomains = async () => {
    setLoading(true);
    try {
      // Get all domains
      const { data: domainsData, error: domainsError } = await supabase
        .from("domains")
        .select("*");

      if (domainsError) throw domainsError;

      if (!domainsData || domainsData.length === 0) {
        setDomains([]);
        setLoading(false);
        return;
      }

      // Get latest uptime status for each domain
      const domainIds = domainsData.map(domain => domain.id);
      
      const { data: uptimeData, error: uptimeError } = await supabase
        .from('uptime_logs')
        .select('*')
        .in('domain_id', domainIds)
        .order('checked_at', { ascending: false });
      
      if (uptimeError) throw uptimeError;

      // Get latest SSL info for each domain
      const { data: sslData, error: sslError } = await supabase
        .from('ssl_info')
        .select('*')
        .in('domain_id', domainIds)
        .order('checked_at', { ascending: false });
      
      if (sslError) throw sslError;

      // Get latest domain expiry info for each domain
      const { data: expiryData, error: expiryError } = await supabase
        .from('domain_expiry')
        .select('*')
        .in('domain_id', domainIds)
        .order('checked_at', { ascending: false });
      
      if (expiryError) throw expiryError;

      // Get latest IP records for each domain
      const { data: ipData, error: ipError } = await supabase
        .from('ip_records')
        .select('*')
        .in('domain_id', domainIds)
        .order('checked_at', { ascending: false });
      
      if (ipError) throw ipError;

      // Combine all data
      const domainsWithStatus = domainsData.map(domain => {
        // Get the latest uptime record for this domain
        const latestUptime = uptimeData?.find(log => log.domain_id === domain.id);
        // Get the latest SSL info for this domain
        const latestSSL = sslData?.find(ssl => ssl.domain_id === domain.id);
        // Get the latest domain expiry info for this domain
        const latestExpiry = expiryData?.find(exp => exp.domain_id === domain.id);
        // Get the latest IP record for this domain
        const latestIP = ipData?.find(ip => ip.domain_id === domain.id);

        return {
          ...domain,
          uptime: latestUptime,
          ssl: latestSSL,
          domain_expiry: latestExpiry,
          ip_records: latestIP
        };
      });

      setDomains(domainsWithStatus);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchDomains, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Filter domains based on search query and status filter
  const filteredDomains = domains.filter(domain => {
    const matchesSearch = 
      domain.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (domain.display_name && domain.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'up') return matchesSearch && domain.uptime?.status === true;
    if (statusFilter === 'down') return matchesSearch && domain.uptime?.status === false;
    if (statusFilter === 'ssl-expiring') return matchesSearch && (domain.ssl?.days_remaining ?? 999) <= 30;
    if (statusFilter === 'domain-expiring') return matchesSearch && (domain.domain_expiry?.days_remaining ?? 999) <= 30;
    
    return matchesSearch;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <DashboardHeader
        title="Domain Status"
        description="Monitor the status of domains, SSL certificates, and domain expiry dates"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        totalCount={domains.length}
        filteredCount={filteredDomains.length}
      />

      {domains.length > 0 && <StatsOverview domains={domains} />}

      {error && (
        <div className="card border-red-300 mb-6 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertTriangle size={18} />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading && domains.length === 0 ? (
        <div className="py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : domains.length === 0 ? (
        <div className="card text-center py-16">
          <h3 className="text-xl font-medium mb-2">No domains found</h3>
          <p className="text-muted-foreground">
            There are no domains registered in the system. Check back later or contact the administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {filteredDomains.map((domain) => (
            <StatusCard key={domain.id} domain={domain} />
          ))}
        </div>
      )}
    </div>
  );
} 