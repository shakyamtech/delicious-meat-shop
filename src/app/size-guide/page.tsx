"use client";
import Link from "next/link";

export default function SizeGuidePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "4rem 2rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
           <span>←</span> BACK TO STORE
        </Link>
        
        <div style={{ background: "white", padding: "4rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", border: "1px solid #e2e8f0" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>SIZE GUIDE</h1>
          
          <p style={{ color: "#64748b", fontSize: "1.1rem", marginBottom: "3rem", lineHeight: 1.6 }}>
            Finding the right fit is the key to comfort and style. Use our size charts below to help determine your perfect size at LYKA Nepal.
          </p>

          {/* SECTION: CLOTHING */}
          <section style={{ marginBottom: "5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "1.5rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              Women&apos;s Clothing
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>Size</th>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>Bust (Inches)</th>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>Waist (Inches)</th>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>Hips (Inches)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { s: "Small", b: "33-34", w: "26-27", h: "35-36" },
                    { s: "Medium", b: "35-36", w: "28-29", h: "37-38" },
                    { s: "Large", b: "37-39", w: "30-32", h: "39-41" },
                    { s: "X-Large", b: "40-42", w: "33-35", h: "42-44" },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0", fontWeight: "700" }}>{row.s}</td>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>{row.b}</td>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>{row.w}</td>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>{row.h}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
              * Most of our items follow a standard tailored fit. For oversized styles, we recommend sticking to your usual size.
            </p>
          </section>

          {/* SECTION: SHOES */}
          <section style={{ marginBottom: "5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "1.5rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              Footwear Guide
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>EU Size</th>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>UK Size</th>
                    <th style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>Foot Length (CM)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { eu: "36", uk: "3", cm: "23.0" },
                    { eu: "37", uk: "4", cm: "23.5" },
                    { eu: "38", uk: "5", cm: "24.0" },
                    { eu: "39", uk: "6", cm: "24.5" },
                    { eu: "40", uk: "7", cm: "25.0" },
                    { eu: "41", uk: "8", cm: "25.5" },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0", fontWeight: "700" }}>{row.eu}</td>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>{row.uk}</td>
                      <td style={{ padding: "1rem", border: "1px solid #e2e8f0" }}>{row.cm} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION: TIPS */}
          <section style={{ padding: "2rem", background: "#fdf2f8", borderRadius: "8px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "1rem", color: "#9d174d", textTransform: "uppercase" }}>How to Measure</h2>
            <ul style={{ color: "#be185d", fontSize: "0.95rem", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
              <li><strong>Bust:</strong> Measure around the fullest part of your chest.</li>
              <li><strong>Waist:</strong> Measure around your natural waistline (narrowest part).</li>
              <li><strong>Hips:</strong> Measure around the fullest part of your hips.</li>
              <li><strong>Foot Length:</strong> Measure from your heel to your longest toe.</li>
            </ul>
          </section>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "2rem", marginTop: "4rem" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Still unsure? Chat with our team via Instagram <strong>@lykanepal</strong> for personalized sizing advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
