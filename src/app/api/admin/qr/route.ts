import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const qrImage = formData.get('qrImage') as File | null;
    
    if (!qrImage) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const bytes = await qrImage.arrayBuffer();
    
    // Upload to site-assets bucket with upsert: true to replace old qr
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('site-assets')
      .upload('qr.png', bytes, {
        contentType: qrImage.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error("QR Upload err:", error);
    return NextResponse.json({ error: 'Failed to upload QR code' }, { status: 500 });
  }
}
