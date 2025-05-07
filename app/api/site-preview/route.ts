import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph image
    let ogImage = extractMetaTag(html, 'og:image');
    
    // If no OG image, try Twitter image
    if (!ogImage) {
      ogImage = extractMetaTag(html, 'twitter:image');
    }

    // Extract site title
    let title = extractMetaTag(html, 'og:title');
    if (!title) {
      title = extractTitle(html);
    }

    // Extract favicon
    const favicon = extractFavicon(html, url);

    return NextResponse.json({
      ogImage,
      title,
      favicon,
      url
    });
  } catch (error) {
    console.error('Error fetching site metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch site metadata' }, { status: 500 });
  }
}

// Helper functions
function extractMetaTag(html: string, property: string): string | null {
  const regex = new RegExp(`<meta(?:[^>]+)?property=["']${property}["'](?:[^>]+)?content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  
  if (!match) {
    // Try name attribute instead of property
    const nameRegex = new RegExp(`<meta(?:[^>]+)?name=["']${property}["'](?:[^>]+)?content=["']([^"']+)["']`, 'i');
    const nameMatch = html.match(nameRegex);
    return nameMatch ? nameMatch[1] : null;
  }
  
  return match[1];
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  // Look for link rel="icon" or rel="shortcut icon"
  const regex = /<link[^>]+rel=["'](icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i;
  const match = html.match(regex);
  
  if (!match) {
    return null;
  }
  
  let faviconUrl = match[2];
  
  // Convert relative URL to absolute
  if (faviconUrl.startsWith('/')) {
    const urlObj = new URL(baseUrl);
    faviconUrl = `${urlObj.protocol}//${urlObj.host}${faviconUrl}`;
  } else if (!faviconUrl.startsWith('http')) {
    // Handle relative paths without leading slash
    const urlObj = new URL(baseUrl);
    const basePath = urlObj.pathname.split('/').slice(0, -1).join('/') + '/';
    faviconUrl = `${urlObj.protocol}//${urlObj.host}${basePath}${faviconUrl}`;
  }
  
  return faviconUrl;
} 