import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Map DB fields to what frontend expects if naming differs
    const products = data.map((p: any) => ({
      ...p,
      salesCount: p.sales_count // Adjusting to camelCase for frontend
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error("Fetch products err:", error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const price = formData.get('price') as string;
    const cost = formData.get('cost') as string;
    const stock = formData.get('stock') as string;
    const description = formData.get('description') as string;
    const sizes = formData.get('sizes') as string; // Comma-separated list
    const file = formData.get('image') as File | null;
    
    let imageUrl = "";

    // Upload to Supabase Storage
    if (file && typeof file !== 'string') {
      const bytes = await file.arrayBuffer();
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('inventory')
        .upload(fileName, bytes, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: publicUrlData } = supabaseAdmin
        .storage
        .from('inventory')
        .getPublicUrl(fileName);
        
      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
        name,
        category,
        price: Number(price),
        cost: Number(cost) || 0,
        image: imageUrl || "https://dummyimage.com/400x500/ccc/fff.png",
        stock: Number(stock) || 10,
        description: description || "",
        sizes: sizes || "",
        sales_count: 0
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Save product err:", error);
    return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product err:", error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, stock, cost, price, sizes, salesCount } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const updates: any = {};
    if (stock !== undefined) updates.stock = Number(stock);
    if (cost !== undefined) updates.cost = Number(cost);
    if (price !== undefined) updates.price = Number(price);
    if (sizes !== undefined) updates.sizes = sizes;
    if (salesCount !== undefined) updates.sales_count = Number(salesCount);

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Update product stock err:", error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}

