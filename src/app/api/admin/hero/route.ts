import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const bgImage = formData.get('heroImage') as File | null;
    
    if (!bgImage) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const bytes = await bgImage.arrayBuffer();
    
    // Upload to site-assets bucket with upsert: true to replace old background
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('site-assets')
      .upload('hero-bg.png', bytes, {
        contentType: bgImage.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error("Hero BG Upload err:", error);
    return NextResponse.json({ error: 'Failed to upload background' }, { status: 500 });
  }
}
