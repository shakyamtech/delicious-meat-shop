"use client";

import Link from "next/link";

export default function SiteLogo() {
  return (
    <Link href="/" className="logo" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
      {/* Forcing the premium boutique text logo which we perfected - rollback to 'Flawless' version */}
      <div style={{ 
        background: "transparent", 
        color: "var(--primary, #000)", 
        border: "1px solid var(--primary, #000)",
        padding: "0.25rem 0.8rem", 
        fontWeight: "300", 
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        whiteSpace: "nowrap",
        transition: 'all 0.3s'
      }} className="boutique-logo-box">
        <style jsx>{`
          @media (max-width: 768px) {
            .boutique-logo-box {
              padding: 0.4rem 0.8rem !important;
              letter-spacing: 0.12em !important;
            }
            .desktop-logo-text { display: none !important; }
            .mobile-logo-text { display: inline !important; font-size: 1.05rem !important; font-weight: 500 !important; }
          }
          /* Optimized adjustment for compact devices (iPhone SE, Fold 5, etc.) */
          @media (max-width: 400px) {
            .boutique-logo-box {
              padding: 0.25rem 0.6rem !important;
              letter-spacing: 0.1em !important;
            }
            .mobile-logo-text { font-size: 0.95rem !important; }
          }
          @media (min-width: 769px) {
            .mobile-logo-text { display: none !important; }
            .desktop-logo-text { display: inline !important; font-size: 1.15rem !important; }
          }
        `}</style>
        <span className="desktop-logo-text">THE MEATLY</span>
        <span className="mobile-logo-text">THE MEATLY</span>
      </div>
    </Link>
  );
}


