import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { orderId, action } = await request.json(); // action = 'VERIFY' or 'REJECT'
    
    // 1. Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let finalStatus = order.status;

    if (action === 'VERIFY' && order.status !== 'Verified') {
      // 2. Update stock and sales count for each item
      const items = order.items as any[];
      if (items && Array.isArray(items)) {
        for (const item of items) {
            // We use the product ID from the order data
            // We can do a relative update in SQL using RPC or just fetch and update
            // For simplicity and to avoid more SQL setup, we'll fetch then update
            const { data: product } = await supabaseAdmin
              .from('products')
              .select('stock, sales_count, sizes')
              .eq('id', item.id)
              .single();

            if (product) {
              let newSizes = product.sizes;
              if (item.selectedSize && product.sizes && product.sizes.includes(':')) {
                const sizesMap = product.sizes.split(',').map((s: string) => s.trim().split(':')); 
                const updatedMap = sizesMap.map((parts: string[]) => {
                  const name = parts[0];
                  const qty = parts.length > 1 ? Number(parts[1]) : 1;
                  if (name === item.selectedSize) {
                    return `${name}:${Math.max(0, qty - 1)}`;
                  }
                  return parts.join(':');
                });
                newSizes = updatedMap.join(', ');
              }

              const { error: updError } = await supabaseAdmin
                .from('products')
                .update({
                  stock: Math.max(0, product.stock - 1),
                  sizes: newSizes,
                  sales_count: (product.sales_count || 0) + 1
                })
                .eq('id', item.id);
              
              if (updError) {
                console.error(`Failed to update stock for product ${item.id}:`, updError);
                return NextResponse.json({ error: `Could not update stock for product: ${item.name}` }, { status: 500 });
              }
            }
        }
      }
      finalStatus = 'Verified';
    } else if (action === 'REJECT') {
      finalStatus = 'Rejected';
    }

    // 3. Update the order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: finalStatus })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, status: finalStatus });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
