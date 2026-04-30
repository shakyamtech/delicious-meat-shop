import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, recoveryKey, newPassword } = await request.json();
    if (!email || !recoveryKey || !newPassword) {
      return NextResponse.json({ error: 'Missing reset information' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('admins')
      .update({ password: newPassword })
      .eq('email', email)
      .eq('recovery_key', recoveryKey)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid email or recovery key' }, { status: 401 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Reset password err:", error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
