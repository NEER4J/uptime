import { Clock, Globe, Lock, BarChart, Link as LinkIcon, ExternalLink, Server } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from "next/router";

interface StatusCardProps {
  domain: {
    id: string;
    domain_name: string;
    display_name: string | null;
    uptime_url: string;
    uptime?: {
      status: boolean;
      checked_at: string;
    };
    ssl?: {
      expiry_date: string;
      days_remaining: number;
      checked_at: string;
    };
    domain_expiry?: {
      expiry_date: string;
      days_remaining: number;
      checked_at: string;
    };
    ip_records?: {
      primary_ip: string;
      checked_at: string;
    };
  };
  isAdmin?: boolean;
}

export default function StatusCard({ domain, isAdmin = false }: StatusCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Never";
    
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
  };

  // Status indicators
  const getStatusBadge = () => {
    if (!domain.uptime) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <span className="status-indicator status-unknown"></span>
        Unknown
      </span>;
    }
    
    return domain.uptime.status 
      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="status-indicator status-up"></span>
          Operational
        </span>
      : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <span className="status-indicator status-down"></span>
          Down
        </span>;
  };

  const getSslBadge = () => {
    if (!domain.ssl) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Unknown
      </span>;
    }
    
    if (domain.ssl.days_remaining < 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Expired {Math.abs(domain.ssl.days_remaining)} days ago
      </span>;
    }
    
    if (domain.ssl.days_remaining <= 7) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        {domain.ssl.days_remaining} days
      </span>;
    }
    
    if (domain.ssl.days_remaining <= 30) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        {domain.ssl.days_remaining} days
      </span>;
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {domain.ssl.days_remaining} days
    </span>;
  };

  const getDomainExpiryBadge = () => {
    if (!domain.domain_expiry) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Unknown
      </span>;
    }
    
    if (domain.domain_expiry.days_remaining < 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Expired {Math.abs(domain.domain_expiry.days_remaining)} days ago
      </span>;
    }
    
    if (domain.domain_expiry.days_remaining <= 7) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        {domain.domain_expiry.days_remaining} days
      </span>;
    }
    
    if (domain.domain_expiry.days_remaining <= 30) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        {domain.domain_expiry.days_remaining} days
      </span>;
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {domain.domain_expiry.days_remaining} days
    </span>;
  };

  // Get IP badge
  const getIpBadge = () => {
    if (!domain.ip_records?.primary_ip) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Unknown
      </span>;
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-mono">
      {domain.ip_records.primary_ip}
    </span>;
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-xl">{domain.display_name || domain.domain_name}</h3>
          <a 
            href={domain.uptime_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-brand flex items-center gap-1 mt-1"
          >
            <Globe size={14} />
            {domain.domain_name}
            <ExternalLink size={12} />
          </a>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div className="flex items-center gap-2">
          <Clock className="text-brand h-4 w-4" />
          <div>
            <p className="text-xs text-muted-foreground">Last Check</p>
            <p className="text-sm font-medium">{formatTimeAgo(domain.uptime?.checked_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Lock className="text-brand h-4 w-4" />
          <div>
            <p className="text-xs text-muted-foreground">SSL Expires</p>
            <div className="flex items-center">{getSslBadge()}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Globe className="text-brand h-4 w-4" />
          <div>
            <p className="text-xs text-muted-foreground">Domain Expires</p>
            <div className="flex items-center">{getDomainExpiryBadge()}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Server className="text-brand h-4 w-4" />
          <div>
            <p className="text-xs text-muted-foreground">IP Address</p>
            <div className="flex items-center">{getIpBadge()}</div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        {isAdmin ? (
          <Link
            href={`/protected/admin/edit/${domain.id}`}
            className="btn-secondary text-xs py-1.5"
          >
            <LinkIcon size={14} />
            Manage
          </Link>
        ) : (
          <Link
            href={`/domain/${domain.domain_name}`}
            className="btn-outline text-xs py-1.5"
          >
            See Details
          </Link>
        )}
      </div>
    </div>
  );
} 