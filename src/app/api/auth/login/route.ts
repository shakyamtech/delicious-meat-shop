import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id, email, role, display_name')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const safeUser = {
      id: data.id,
      email: data.email,
      role: data.role,
      displayName: data.display_name
    };

    return NextResponse.json({ success: true, user: safeUser }, { status: 200 });
  } catch (error) {
    console.error("Login err:", error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
