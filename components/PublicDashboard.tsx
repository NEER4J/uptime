"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import StatusCard from "@/components/StatusCard";
import DashboardHeader from "@/components/DashboardHeader";
import StatsOverview from "@/components/StatsOverview";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AlertTriangle, Grid, List, Clock, Lock, Globe, Server, ExternalLink } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Domain Status</h1>
          <div className="flex items-center gap-2 bg-muted rounded-md p-1">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <DashboardHeader
        title=""
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
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {filteredDomains.map((domain) => (
            <StatusCard key={domain.id} domain={domain} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Domain</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Last Check</th>
                  <th className="px-4 py-3 text-left font-medium">SSL Expires</th>
                  <th className="px-4 py-3 text-left font-medium">Domain Expires</th>
                  <th className="px-4 py-3 text-left font-medium">IP Address</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDomains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-base">{domain.display_name || domain.domain_name}</div>
                        <a 
                          href={domain.uptime_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 mt-1"
                        >
                          <Globe size={14} />
                          {domain.domain_name}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {!domain.uptime ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <span className="status-indicator status-unknown mr-1"></span>
                          Unknown
                        </span>
                      ) : domain.uptime.status ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="status-indicator status-up mr-1"></span>
                          Operational
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <span className="status-indicator status-down mr-1"></span>
                          Down
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="text-brand h-4 w-4" />
                        <span className="text-sm">
                          {!domain.uptime?.checked_at ? "Never" : 
                            formatTimeAgo(domain.uptime.checked_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Lock className="text-brand h-4 w-4" />
                        {!domain.ssl ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unknown
                          </span>
                        ) : domain.ssl.days_remaining < 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expired {Math.abs(domain.ssl.days_remaining)} days ago
                          </span>
                        ) : domain.ssl.days_remaining <= 7 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {domain.ssl.days_remaining} days
                          </span>
                        ) : domain.ssl.days_remaining <= 30 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {domain.ssl.days_remaining} days
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {domain.ssl.days_remaining} days
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="text-brand h-4 w-4" />
                        {!domain.domain_expiry ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unknown
                          </span>
                        ) : domain.domain_expiry.days_remaining < 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expired {Math.abs(domain.domain_expiry.days_remaining)} days ago
                          </span>
                        ) : domain.domain_expiry.days_remaining <= 7 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {domain.domain_expiry.days_remaining} days
                          </span>
                        ) : domain.domain_expiry.days_remaining <= 30 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {domain.domain_expiry.days_remaining} days
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {domain.domain_expiry.days_remaining} days
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Server className="text-brand h-4 w-4" />
                        {!domain.ip_records?.primary_ip ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unknown
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-mono">
                            {domain.ip_records.primary_ip}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a 
                        href={`/domain/${domain.domain_name}`}
                        className="btn-outline text-xs py-1.5"
                      >
                        See Details
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
} 