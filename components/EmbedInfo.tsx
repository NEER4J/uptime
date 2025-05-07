"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface EmbedInfoProps {
  domain: string;
}

export default function EmbedInfo({ domain }: EmbedInfoProps) {
  const [copied, setCopied] = useState<string | null>(null);
  
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
  
  const badgeUrl = `${baseUrl}/api/badge/${domain}`;
  const markdownCode = `[![Status](${badgeUrl})](${baseUrl})`;
  const htmlCode = `<a href="${baseUrl}"><img src="${badgeUrl}" alt="Status Badge"></a>`;
  
  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-center mb-4">
        <img src={badgeUrl} alt="Status Badge" className="mb-2" />
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Markdown</span>
            <button 
              onClick={() => copyCode(markdownCode, 'markdown')}
              className="btn-secondary text-xs py-1 px-2 h-7 flex items-center gap-1"
              aria-label="Copy markdown code"
            >
              {copied === 'markdown' ? (
                <>
                  <Check size={12} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-secondary/30 p-2 rounded-md text-sm overflow-x-auto border border-border">
            {markdownCode}
          </pre>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">HTML</span>
            <button 
              onClick={() => copyCode(htmlCode, 'html')}
              className="btn-secondary text-xs py-1 px-2 h-7 flex items-center gap-1"
              aria-label="Copy HTML code"
            >
              {copied === 'html' ? (
                <>
                  <Check size={12} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-secondary/30 p-2 rounded-md text-sm overflow-x-auto border border-border">
            {htmlCode}
          </pre>
        </div>
      </div>
    </div>
  );
} 