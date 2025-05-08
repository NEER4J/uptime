"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { signOutAction } from "@/app/actions";
import StatusCard from "@/components/StatusCard";
import DomainForm from "@/components/DomainForm";
import DashboardHeader from "@/components/DashboardHeader";
import StatsOverview from "@/components/StatsOverview";
import DomainActions from "@/components/DomainActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AlertTriangle, Clock, CheckCircle, RefreshCw, Activity, Shield, Globe, Server } from "lucide-react";

export default function AdminPanel() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [checkInterval, setCheckInterval] = useState("daily");
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkResults, setCheckResults] = useState<{
    successes: number;
    failures: number;
    total: number;
  }>({ successes: 0, failures: 0, total: 0 });
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
        // Get the latest IP records for this domain
        const latestIp = ipData?.find(ip => ip.domain_id === domain.id);

        return {
          ...domain,
          uptime: latestUptime,
          ssl: latestSSL,
          domain_expiry: latestExpiry,
          ip_records: latestIp
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
  }, []);

  const deleteDomain = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      
      if (error) throw error;
      
      setSuccess("Domain deleted successfully!");
      fetchDomains();
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };
  
  const saveCheckInterval = async () => {
    // In a production app, you might save this to a settings table in Supabase
    setSuccess(`Monitoring interval set to ${checkInterval}`);
  };

  const checkAllDomains = async () => {
    if (domains.length === 0) return;
    
    setCheckingAll(true);
    setSuccess(""); // Clear any previous messages
    setError("");
    
    let successes = 0;
    let failures = 0;
    
    try {
      // Process each domain
      for (const domain of domains) {
        try {
          // Check uptime
          await fetch('/api/check/uptime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: domain.id, url: domain.uptime_url })
          });
          
          // Check SSL
          await fetch('/api/check/ssl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: domain.id, domain: domain.domain_name })
          });
          
          // Check domain expiry
          await fetch('/api/check/whois', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: domain.id, domain: domain.domain_name })
          });
          
          // Check IP records
          await fetch('/api/check/ip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domainId: domain.id, domain: domain.domain_name })
          });
          
          successes++;
        } catch (err) {
          failures++;
          console.error(`Error checking domain ${domain.domain_name}:`, err);
        }
      }
      
      // Update stats and fetch fresh data
      setCheckResults({
        successes,
        failures,
        total: domains.length
      });
      
      setSuccess(`Domain checks completed: ${successes} successful, ${failures} failed`);
      fetchDomains(); // Refresh data
      
    } catch (err: any) {
      setError("Error during batch domain check: " + err.message);
    } finally {
      setCheckingAll(false);
    }
  };

  // Function to determine tag based on IP address
  const getTagFromIP = (ip: string) => {
    if (!ip) return null;

    const ipMappings: Record<string, string> = {
      "91.204.209.205": "uranium Direct Admin",
      "91.204.209.204": "iridium Direct Admin",
      "109.70.148.64": "cPanel draftforclients.com",
      "91.204.209.29": "cPanel webuildtrades.com",
      "91.204.209.39": "cPanel webuildtrades.io",
      "35.214.4.69": "SiteGround",
      "165.22.127.156": "Cloudways",
      "64.227.39.249": "Digitalocean"
    };

    return ipMappings[ip] || null;
  };

  // Get all unique categories from domains
  const categories = ["all", ...Array.from(new Set(domains
    .filter(domain => domain.category)
    .map(domain => domain.category)
  ))];

  // Filter domains based on search query and status filter
  const filteredDomains = domains.filter(domain => {
    const matchesSearch = 
      domain.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (domain.display_name && domain.display_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'up' && domain.uptime?.status === true) ||
      (statusFilter === 'down' && domain.uptime?.status === false) ||
      (statusFilter === 'ssl-expiring' && (domain.ssl?.days_remaining ?? 999) <= 30) ||
      (statusFilter === 'domain-expiring' && (domain.domain_expiry?.days_remaining ?? 999) <= 30);
    
    const matchesCategory = 
      categoryFilter === 'all' || 
      domain.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <DashboardHeader
        title="Admin Panel"
        description="Manage monitored domains and view their status"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
        totalCount={domains.length}
        filteredCount={filteredDomains.length}
        isAdmin={true}
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

      {success && (
        <div className="card border-green-300 mb-6 bg-green-50 dark:bg-green-900/10">
          <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle size={18} />
            <p>{success}</p>
          </div>
        </div>
      )}


      {/* Monitored Domains Table */}
      {loading && domains.length === 0 ? (
        <div className="py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : domains.length === 0 ? (
        <div className="card text-center py-16 mb-8">
          <h3 className="text-xl font-medium mb-2">No domains found</h3>
          <p className="text-muted-foreground">
            Use the form above to add your first domain to monitor.
          </p>
        </div>
      ) : (
        <div className="card mb-8">
          <div className="card-header border-b border-border pb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="card-title">Monitored Domains</h2>
                <p className="card-description">List of all domains you are currently monitoring</p>
              </div>
              
              <button 
                onClick={checkAllDomains}
                disabled={checkingAll || domains.length === 0}
                className="btn-brand flex items-center gap-2"
              >
                {checkingAll ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Checking All Domains...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Check All Domains</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Domain</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">SSL Expires</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Domain Expires</th>
                  <th className="px-4 py-3 text-left font-medium hidden xl:table-cell">IP / Server</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDomains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{domain.display_name || domain.domain_name}</div>
                        <div className="text-xs text-muted-foreground">{domain.domain_name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {!domain.uptime ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <span className="status-indicator status-unknown"></span>
                          Unknown
                        </span>
                      ) : domain.uptime.status ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="status-indicator status-up"></span>
                          Operational
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <span className="status-indicator status-down"></span>
                          Down
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {!domain.ssl ? (
                        <span className="text-muted-foreground">Unknown</span>
                      ) : domain.ssl.days_remaining < 0 ? (
                        <span className="text-red-600 font-medium">Expired {Math.abs(domain.ssl.days_remaining)} days ago</span>
                      ) : domain.ssl.days_remaining <= 7 ? (
                        <span className="text-red-600 font-medium">{domain.ssl.days_remaining} days</span>
                      ) : domain.ssl.days_remaining <= 15 ? (
                        <span className="text-amber-600 font-medium">{domain.ssl.days_remaining} days</span>
                      ) : (
                        <span className="text-green-600">{domain.ssl.days_remaining} days</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {!domain.domain_expiry ? (
                        <span className="text-muted-foreground">Unknown</span>
                      ) : domain.domain_expiry.days_remaining < 0 ? (
                        <span className="text-red-600 font-medium">Expired {Math.abs(domain.domain_expiry.days_remaining)} days ago</span>
                      ) : domain.domain_expiry.days_remaining <= 7 ? (
                        <span className="text-red-600 font-medium">{domain.domain_expiry.days_remaining} days</span>
                      ) : domain.domain_expiry.days_remaining <= 30 ? (
                        <span className="text-amber-600 font-medium">{domain.domain_expiry.days_remaining} days</span>
                      ) : (
                        <span className="text-green-600">{domain.domain_expiry.days_remaining} days</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {!domain.ip_records ? (
                        <span className="text-muted-foreground">Unknown</span>
                      ) : (
                        <div className="group relative">
                          <span className="font-mono text-xs">{domain.ip_records.primary_ip}</span>
                          {/* Show server name and tag on hover */}
                          {(domain.tag || getTagFromIP(domain.ip_records.primary_ip)) && (
                            <div className="absolute left-0 mt-1 hidden group-hover:block z-10">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap">
                                {domain.tag || getTagFromIP(domain.ip_records.primary_ip)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DomainActions domain={domain} onDelete={deleteDomain} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

            {/* Form for adding new domains */}
            <DomainForm onSuccess={fetchDomains} />


      {/* Monitoring Settings */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="card-title">Monitoring Settings</h2>
          <p className="card-description">Configure how frequently automatic checks should run</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <label htmlFor="check_interval" className="block text-sm font-medium text-foreground mb-2">
              Automatic Check Interval
            </label>
            <div className="flex items-center relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <select
                id="check_interval"
                value={checkInterval}
                onChange={(e) => setCheckInterval(e.target.value)}
                className="block w-full pl-10 py-2 px-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors bg-background"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={saveCheckInterval}
              className="btn-brand"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 