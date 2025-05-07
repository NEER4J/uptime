"use client";

import { useState, useEffect, useRef } from 'react';
import { Activity, ShieldCheck, Globe, MoreVertical, ExternalLink, CheckCircle, Server } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import Link from 'next/link';
import { Button } from './ui/button';

interface DomainActionsProps {
  domain: {
    id: string;
    domain_name: string;
    uptime_url: string;
  };
  onDelete: (id: string) => void;
}

export default function DomainActions({ domain, onDelete }: DomainActionsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [checkLoading, setCheckLoading] = useState<Record<string, boolean>>({});
  const [checkResults, setCheckResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        buttonRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const triggerCheck = async (type: 'uptime' | 'ssl' | 'whois' | 'ip') => {
    // Close dropdown if open
    setShowDropdown(false);
    
    setCheckResults(prev => ({ ...prev, [type]: null }));
    setCheckLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      let endpoint, body;
      
      switch (type) {
        case 'uptime':
          endpoint = '/api/check/uptime';
          body = { domainId: domain.id, url: domain.uptime_url };
          break;
        case 'ssl':
          endpoint = '/api/check/ssl';
          body = { domainId: domain.id, domain: domain.domain_name };
          break;
        case 'whois':
          endpoint = '/api/check/whois';
          body = { domainId: domain.id, domain: domain.domain_name };
          break;
        case 'ip':
          endpoint = '/api/check/ip';
          body = { domainId: domain.id, domain: domain.domain_name };
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
          resultMessage = data.status === true ? 'Website is up!' : 'Website is down!';
          break;
        case 'ssl':
          if (data.days_remaining < 0) {
            resultMessage = `SSL expired ${Math.abs(data.days_remaining)} days ago`;
          } else {
            resultMessage = `SSL valid for ${data.days_remaining} days`;
          }
          break;
        case 'whois':
          if (data.days_remaining < 0) {
            resultMessage = `Domain expired ${Math.abs(data.days_remaining)} days ago`;
          } else {
            resultMessage = `Domain expires in ${data.days_remaining} days`;
          }
          break;
        case 'ip':
          resultMessage = `IP: ${data.primary_ip}`;
          break;
      }
      
      setCheckResults(prev => ({ ...prev, [type]: { success: true, message: resultMessage } }));
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setCheckResults(prev => ({ ...prev, [type]: null }));
      }, 5000);
      
    } catch (error: any) {
      console.error(`Error checking ${type}:`, error);
      setCheckResults(prev => ({ ...prev, [type]: { success: false, message: error.message } }));
      
      // Clear the error message after 5 seconds
      setTimeout(() => {
        setCheckResults(prev => ({ ...prev, [type]: null }));
      }, 5000);
    } finally {
      setCheckLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDelete = () => {
    setShowDropdown(false);
    if (window.confirm(`Are you sure you want to delete ${domain.domain_name}?`)) {
      onDelete(domain.id);
    }
  };

  const renderCheckButtonContent = (type: 'uptime' | 'ssl' | 'whois' | 'ip', icon: React.ReactNode, text: string) => {
    if (checkLoading[type]) {
      return (
        <>
          <LoadingSpinner size="sm" />
          <span className="hidden sm:inline">Checking...</span>
        </>
      );
    }
    
    if (checkResults[type]) {
      return (
        <>
          {checkResults[type]?.success ? (
            <CheckCircle size={14} className="text-green-500" />
          ) : (
            <div className="text-red-500">{icon}</div>
          )}
          <span className="hidden sm:inline">{checkResults[type]?.message}</span>
        </>
      );
    }
    
    return (
      <>
        {icon}
        <span className="hidden sm:inline">{text}</span>
      </>
    );
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Show only uptime check button in mobile view */}
      <button 
        onClick={() => triggerCheck('uptime')}
        className={`btn-secondary py-1.5 px-3 text-xs ${checkResults['uptime']?.success ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''} ${checkResults['uptime'] && !checkResults['uptime']?.success ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}`}
        disabled={checkLoading['uptime']}
      >
        {renderCheckButtonContent('uptime', <Activity size={14} />, 'Check Uptime')}
      </button>
      
      {/* Hide these buttons on mobile */}
      <button 
        onClick={() => triggerCheck('ssl')}
        className={`btn-secondary py-1.5 px-3 text-xs hidden sm:flex ${checkResults['ssl']?.success ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''} ${checkResults['ssl'] && !checkResults['ssl']?.success ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}`}
        disabled={checkLoading['ssl']}
      >
        {renderCheckButtonContent('ssl', <ShieldCheck size={14} />, 'Check SSL')}
      </button>
      
      <button 
        onClick={() => triggerCheck('whois')}
        className={`btn-secondary py-1.5 px-3 text-xs hidden sm:flex ${checkResults['whois']?.success ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''} ${checkResults['whois'] && !checkResults['whois']?.success ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}`}
        disabled={checkLoading['whois']}
      >
        {renderCheckButtonContent('whois', <Globe size={14} />, 'Check Domain')}
      </button>
      
      {/* IP check button (hidden on mobile) */}
      <button 
        onClick={() => triggerCheck('ip')}
        className={`btn-secondary py-1.5 px-3 text-xs hidden sm:flex ${checkResults['ip']?.success ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''} ${checkResults['ip'] && !checkResults['ip']?.success ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}`}
        disabled={checkLoading['ip']}
      >
        {renderCheckButtonContent('ip', <Server size={14} />, 'Check IP')}
      </button>
      
      {/* Dropdown menu */}
      <div className="relative">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowDropdown(!showDropdown)}
          ref={buttonRef}
        >
          <MoreVertical size={16} />
        </Button>
        
        {showDropdown && (
          <div 
            className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-background border border-border z-50"
            style={{ transform: 'translateX(-75%)' }}
            ref={dropdownRef}
          >
            <div className="py-1">
              <Link href={`/admin/edit/${domain.id}`} className="block px-4 py-2 text-sm hover:bg-muted">
                Edit Domain
              </Link>
              <button 
                className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                onClick={() => triggerCheck('uptime')}
                disabled={checkLoading.uptime}
              >
                {checkLoading.uptime ? 'Checking Uptime...' : 'Check Uptime Now'}
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                onClick={() => triggerCheck('ssl')}
                disabled={checkLoading.ssl}
              >
                {checkLoading.ssl ? 'Checking SSL...' : 'Check SSL Now'}
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                onClick={() => triggerCheck('whois')}
                disabled={checkLoading.whois}
              >
                {checkLoading.whois ? 'Checking Domain...' : 'Check Domain Expiry Now'}
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                onClick={() => triggerCheck('ip')}
                disabled={checkLoading.ip}
              >
                {checkLoading.ip ? 'Checking IP...' : 'Check IP Records Now'}
              </button>
              <hr className="my-1 border-border" />
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-muted"
                onClick={handleDelete}
              >
                Delete Domain
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 