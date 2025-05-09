import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { email_enabled, sms_enabled } = await request.json();
    
    // Get the ID of the first (and likely only) record
    const { data: existingData, error: fetchError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // If preferences are being toggled
    const { error: updateError } = await supabase
      .from('notification_settings')
      .update({
        email_enabled: email_enabled !== undefined ? email_enabled : existingData.email_enabled,
        sms_enabled: sms_enabled !== undefined ? sms_enabled : existingData.sms_enabled
      })
      .eq('id', existingData.id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 