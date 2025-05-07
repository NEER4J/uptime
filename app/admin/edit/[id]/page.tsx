"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Globe, Tag, LinkIcon, Activity, ShieldCheck, Clock, CheckCircle, AlertTriangle, Server } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface EditDomainProps {
  params: {
    id: string;
  };
}

export default function EditDomain({ params }: EditDomainProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [domain, setDomain] = useState<any>(null);
  const [formData, setFormData] = useState({
    domain_name: "",
    display_name: "",
    uptime_url: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkLoading, setCheckLoading] = useState<Record<string, boolean>>({});
  const [checkResults, setCheckResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    const fetchDomain = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("domains")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setDomain(data);
          setFormData({
            domain_name: data.domain_name || "",
            display_name: data.display_name || "",
            uptime_url: data.uptime_url || "",
          });
        }
      } catch (error: any) {
        console.error("Error fetching domain:", error);
        setError("Error loading domain: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDomain();
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Input validation
    if (!formData.domain_name || !formData.uptime_url) {
      setError("Domain name and uptime URL are required");
      return;
    }

    try {
      setSubmitLoading(true);
      const { error } = await supabase
        .from("domains")
        .update({
          domain_name: formData.domain_name,
          display_name: formData.display_name || null,
          uptime_url: formData.uptime_url,
        })
        .eq("id", params.id);

      if (error) throw error;
      
      setSuccess("Domain updated successfully!");
      
      // After successful update, check the domain status
      triggerCheck('uptime');
      triggerCheck('ssl');
      triggerCheck('whois');
      triggerCheck('ip');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const triggerCheck = async (type: 'uptime' | 'ssl' | 'whois' | 'ip') => {
    setCheckResults(prev => ({ ...prev, [type]: null }));
    setCheckLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      let endpoint, body;
      
      switch (type) {
        case 'uptime':
          endpoint = '/api/check/uptime';
          body = { domainId: domain.id, url: formData.uptime_url };
          break;
        case 'ssl':
          endpoint = '/api/check/ssl';
          body = { domainId: domain.id, domain: formData.domain_name };
          break;
        case 'whois':
          endpoint = '/api/check/whois';
          body = { domainId: domain.id, domain: formData.domain_name };
          break;
        case 'ip':
          endpoint = '/api/check/ip';
          body = { domainId: domain.id, domain: formData.domain_name };
          break;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to check ${type}`);
      }
      
      let resultMessage = '';
      switch (type) {
        case 'uptime':
          resultMessage = data.status ? 'Website is up!' : 'Website is down!';
          break;
        case 'ssl':
          resultMessage = `SSL valid for ${data.days_remaining} days`;
          break;
        case 'whois':
          resultMessage = `Domain expires in ${data.days_remaining} days`;
          break;
        case 'ip':
          resultMessage = `IP: ${data.primary_ip}`;
          break;
      }
      
      setCheckResults(prev => ({ ...prev, [type]: { success: true, message: resultMessage } }));
    } catch (error: any) {
      console.error(`Error checking ${type}:`, error);
      setCheckResults(prev => ({ ...prev, [type]: { success: false, message: error.message } }));
    } finally {
      setCheckLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const renderCheckButtonContent = (type: 'uptime' | 'ssl' | 'whois' | 'ip', icon: React.ReactNode, text: string) => {
    if (checkLoading[type]) {
      return (
        <>
          <LoadingSpinner size="sm" />
          <span>Checking...</span>
        </>
      );
    }
    
    if (checkResults[type]) {
      return (
        <>
          {checkResults[type]?.success ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <div className="text-red-500">{icon}</div>
          )}
          <span>{checkResults[type]?.message}</span>
        </>
      );
    }
    
    return (
      <>
        {icon}
        <span>{text}</span>
      </>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="card text-center py-10">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading domain information...</p>
        </div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="card border-red-300 mb-6 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertTriangle size={18} />
            <p>Domain not found or you don't have permission to edit it.</p>
          </div>
        </div>
        <Link href="/admin" className="btn-outline flex items-center gap-2 w-fit">
          <ChevronLeft size={16} />
          Back to Admin Panel
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="btn-outline flex items-center gap-2 mr-4">
          <ChevronLeft size={16} />
          Back to Admin Panel
        </Link>
        <h1 className="text-3xl font-bold">Edit Domain</h1>
      </div>

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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <form onSubmit={updateDomain} className="card">
            <div className="card-header">
              <h2 className="card-title">Domain Details</h2>
              <p className="card-description">Update information for this domain</p>
            </div>
            
            <div className="space-y-4 mt-6">
              <div>
                <label htmlFor="domain_name" className="block text-sm font-medium text-foreground mb-1">
                  Domain Name*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    id="domain_name"
                    name="domain_name"
                    value={formData.domain_name}
                    onChange={handleInputChange}
                    className="w-full pl-10 py-2 px-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors bg-background"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-foreground mb-1">
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    id="display_name"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    className="w-full pl-10 py-2 px-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors bg-background"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="uptime_url" className="block text-sm font-medium text-foreground mb-1">
                  URL to Check*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="url"
                    id="uptime_url"
                    name="uptime_url"
                    value={formData.uptime_url}
                    onChange={handleInputChange}
                    className="w-full pl-10 py-2 px-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors bg-background"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Link
                href="/admin"
                className="btn-outline"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitLoading}
                className="btn-brand"
              >
                {submitLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
        
        {/* Manual check panel */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Domain Status</h2>
            <p className="card-description">Run checks for this domain</p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => triggerCheck('uptime')}
              disabled={checkLoading['uptime']}
              className="btn-secondary"
            >
              {renderCheckButtonContent('uptime', <Activity size={16} />, 'Check Uptime')}
            </button>
            
            <button
              onClick={() => triggerCheck('ssl')}
              disabled={checkLoading['ssl']}
              className="btn-secondary"
            >
              {renderCheckButtonContent('ssl', <ShieldCheck size={16} />, 'Check SSL Certificate')}
            </button>
            
            <button
              onClick={() => triggerCheck('whois')}
              disabled={checkLoading['whois']}
              className="btn-secondary"
            >
              {renderCheckButtonContent('whois', <Globe size={16} />, 'Check Domain Expiry')}
            </button>
            
            <button
              onClick={() => triggerCheck('ip')}
              disabled={checkLoading['ip']}
              className="btn-secondary"
            >
              {renderCheckButtonContent('ip', <Server size={16} />, 'Check IP Records')}
            </button>
          </div>
          
          <div className="mt-6 text-xs text-muted-foreground">
            Note: All checks will run automatically when you save changes to the domain.
          </div>
        </div>
      </div>
    </div>
  );
} 