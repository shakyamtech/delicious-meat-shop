import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('wishlist')
      .select('*, products(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { productId, phone, size } = await request.json();
    if (!productId || !phone) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('wishlist')
      .insert([{ product_id: productId, customer_phone: phone, selected_size: size }])
      .select()
      .single();

    if (error) {
      console.error("Wishlist insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Wishlist catch error:", error);
    return NextResponse.json({ error: error.message || 'Failed to join wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const size = searchParams.get('size');

    if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

    let query = supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('product_id', productId);
    
    if (size && size !== 'null' && size !== 'undefined') {
      query = query.eq('selected_size', size);
    } else {
      query = query.is('selected_size', null);
    }

    const { error } = await query;

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Wishlist delete error:", error);
    return NextResponse.json({ error: error.message || 'Failed to clear wishlist' }, { status: 500 });
  }
}
