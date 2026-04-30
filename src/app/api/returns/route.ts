import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Admin fetches all return requests
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: Customer submits a return request
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_name, customer_phone, product_name, product_id, quantity, reason, amount } = body;
    if (!customer_name || !customer_phone || !product_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.from("return_requests").insert([{
      customer_name, customer_phone, product_name,
      product_id: product_id || null,
      quantity: Number(quantity) || 1,
      reason: reason || "",
      status: "PENDING"
    }]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Admin approves or rejects
export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("return_requests")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Clear history or delete specific request
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearHistory = searchParams.get('clearHistory');

    if (id) {
      const { error } = await supabaseAdmin.from("return_requests").delete().eq("id", id);
      if (error) throw error;
    } else if (clearHistory === 'true') {
      // Only delete processed history, keep PENDING ones
      const { error } = await supabaseAdmin.from("return_requests").delete().neq("status", "PENDING");
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Missing parameter" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
