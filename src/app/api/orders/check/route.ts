import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('id');
    
    if (!orderId) return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ status: 'Not Found' }, { status: 404 });
    }
    
    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error("Check order status err:", error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
