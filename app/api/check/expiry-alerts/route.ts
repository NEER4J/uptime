import { NextResponse } from 'next/server';
import { checkAndSendExpiryAlerts } from '@/utils/email';

// This endpoint can be called by a cron job to check for expiry alerts
export async function GET(request: Request) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.split(' ')[1]; // Format: "Bearer API_KEY"
    
    // Check that the API key matches the one in environment variables
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for expiry alerts
    await checkAndSendExpiryAlerts();
    
    return NextResponse.json(
      { success: true, message: 'Expiry alerts check completed' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error checking expiry alerts:', error);
    
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 