import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (email) {
      query = query.eq('customer_email', email);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map back to what frontend expects
    const orders = data.map((o: any) => ({
      id: o.id,
      email: o.customer_email,
      name: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address,
      items: (o.items as any).map((i: any) => i.name),
      rawItems: o.items,
      total: o.total,
      date: o.created_at,
      screenshotUrl: o.screenshot_url,
      status: o.status
    }));

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch orders err:", error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const items = JSON.parse(formData.get('items') as string || '[]');
    const total = formData.get('total');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    const screenshot = formData.get('screenshot') as File | null;
    
    let screenshotUrl = '';
    
    if (screenshot) {
      const bytes = await screenshot.arrayBuffer();
      const ext = screenshot.name.split('.').pop() || 'jpg';
      const fileName = `payment_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('receipts')
        .upload(fileName, bytes, {
          contentType: screenshot.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseAdmin
        .storage
        .from('receipts')
        .getPublicUrl(fileName);
        
      screenshotUrl = publicUrlData.publicUrl;
    }

    const orderId = `ORD-${Date.now()}`;

    // 2. Insert the order as 'Pending Verification'
    const { error } = await supabaseAdmin
      .from('orders')
      .insert([{
        id: orderId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_address: address,
        items: items,
        total: Number(total),
        screenshot_url: screenshotUrl,
        status: "Pending Verification"
      }]);

    if (error) {
      console.error("Database Insert Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Send a silent notification to Admin Panel
    try {
      const now = Date.now();
      await supabaseAdmin
        .from('notifications')
        .insert([{
          type: 'PURCHASE',
          message: `NEW ORDER: ${name} just placed an order for Rs.${Number(total).toLocaleString()}!`,
          timestamp: now
        }]);
    } catch (nErr) {
      console.error("Notification Error (Non-fatal):", nErr);
    }

    return NextResponse.json({ success: true, orderId, notificationTimestamp: Date.now() });
  } catch (error: any) {
    console.error("Order submission critical failure:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete order err:", error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Update order status err:", error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
