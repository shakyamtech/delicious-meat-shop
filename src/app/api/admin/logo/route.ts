import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const logoImage = formData.get('logoImage') as File | null;
    
    if (!logoImage) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const bytes = await logoImage.arrayBuffer();
    
    // Upload to site-assets bucket with upsert: true to replace old logo
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('site-assets')
      .upload('logo.png', bytes, {
        contentType: logoImage.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error("Logo Upload err:", error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
