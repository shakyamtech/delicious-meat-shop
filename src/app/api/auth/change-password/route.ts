import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { adminId, currentPassword, newPassword } = await request.json();

    if (!adminId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify current password
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('password', currentPassword)
      .single();

    if (fetchError || !admin) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    // 2. Update to new password
    const { error: updateError } = await supabaseAdmin
      .from('admins')
      .update({ password: newPassword })
      .eq('id', adminId);

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200 });

  } catch (error) {
    console.error("Change password route error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
