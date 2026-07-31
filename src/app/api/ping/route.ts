import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Lightweight query to keep Supabase active & prevent auto-pause
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase ping error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase ping successful - database kept active!',
      timestamp: new Date().toISOString(),
      data
    });
  } catch (err: any) {
    console.error('Ping handler error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
