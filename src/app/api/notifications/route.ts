import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const since = url.searchParams.get('since') || "0";
    
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .gt('timestamp', Number(since))
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch notifications err:", error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const now = Date.now();
    
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        timestamp: now,
        type: body.type,
        message: body.message
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Save notification err:", error);
    return NextResponse.json({ error: 'Failed to save notification' }, { status: 500 });
  }
}
