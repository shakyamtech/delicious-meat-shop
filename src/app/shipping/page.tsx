"use client";
import Link from "next/link";

export default function ShippingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "4rem 2rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
           <span>←</span> BACK TO STORE
        </Link>
        
        <div style={{ background: "white", padding: "4rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", border: "1px solid #e2e8f0" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>SHIPPING INFORMATION</h1>
          
          <p style={{ color: "#64748b", fontSize: "1.1rem", marginBottom: "3rem", lineHeight: 1.6 }}>
            At LYKA Nepal, we strive to deliver your favorite pieces as quickly as possible. Every order is handled with care and verified personally before dispatch.
          </p>

          <section style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "1.5rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Delivery Timelines</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
              <div style={{ padding: "1.5rem", background: "#f1f5f9", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>Inside Kathmandu Valley</h3>
                <p style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>24–48 Hours</p>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>Order before 2 PM for next-day delivery.</p>
              </div>
              <div style={{ padding: "1.5rem", background: "#f1f5f9", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.5rem" }}>Outside Kathmandu Valley</h3>
                <p style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>3–5 Business Days</p>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>Delivery across major cities in Nepal via our logistics partners.</p>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "1rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shipping Rates</h2>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              We offer a straightforward shipping fee structure across all regions:
              <br /><br />
              <strong>• Flat Rate: NPR 100</strong> for all orders, regardless of size or weight.
            </p>
          </section>

          <section style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "1rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verification Process</h2>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              To ensure accuracy and prevent failed deliveries, our team will <strong>call you personally</strong> on the phone number provided during checkout. Your order will be dispatched only after successful phone verification.
            </p>
          </section>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "2rem", marginTop: "4rem" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Questions about your delivery? Contact us at <strong>+977 9762850637</strong> or email <strong>shop@lykanepal.com</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
