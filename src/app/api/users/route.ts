import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Map back to recoveryKey if frontend expects camelCase
    const safeUsers = data.map((u: any) => ({ 
      id: u.id, 
      email: u.email, 
      role: u.role, 
      recoveryKey: u.recovery_key,
      displayName: u.display_name
    }));

    return NextResponse.json(safeUsers, { status: 200 });
  } catch (error) {
    console.error("Fetch admins err:", error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, role, recoveryKey, displayName } = await request.json();
    if (!email || !password || !role || !recoveryKey) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const payload: any = {
      email,
      password,
      role,
      recovery_key: recoveryKey,
    };

    // Try first with display_name
    let result = await supabaseAdmin
      .from('admins')
      .insert([{ ...payload, display_name: displayName }])
      .select()
      .single();

    // If it fails because the column doesn't exist, try without it
    if (result.error && (result.error.message.includes('display_name') || result.error.code === '42703')) {
      console.warn("display_name column missing, falling back...");
      result = await supabaseAdmin
        .from('admins')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) {
      if (result.error.code === '23505') {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
      throw result.error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Create admin err:", error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

    // Check count first to prevent deleting last admin
    const { count, error: countError } = await supabaseAdmin
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    if (count! <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining user' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete admin err:", error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, displayName } = await request.json();
    if (!id || !displayName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('admins')
      .update({ display_name: displayName })
      .eq('id', id);

    if (error) {
      if (error.message.includes('display_name') || error.code === '42703') {
        return NextResponse.json({ 
          error: "Column 'display_name' does not exist in your Supabase table. Please add it first." 
        }, { status: 400 });
      }
      throw error;
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update admin err:", error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
