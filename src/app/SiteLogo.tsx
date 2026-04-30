"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function SiteLogo() {
  const [imageError, setImageError] = useState(false);
  const [logoUrl, setLogoUrl] = useState(""); 
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (baseUrl) {
      setLogoUrl(`${baseUrl}/storage/v1/object/public/site-assets/logo.png?v=${Date.now()}`);
    } else {
      setLogoUrl("/logo.png");
    }
    setIsReady(true);
  }, []);

  if (!isReady) return <span style={{ fontSize: "1.4rem", fontWeight: "800" }}>MEAT SHOP</span>;

  return (
    <Link href="/" className="logo" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
      {/* Forcing the premium boutique text logo which we perfected - rollback to 'Flawless' version */}
      {true ? (
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
          <span className="desktop-logo-text">DELICIOUS MEAT SHOP</span>
          <span className="mobile-logo-text">DELICIOUS MEAT SHOP</span>
        </div>
      ) : (
        <div style={{ position: 'relative', height: '40px', width: '120px', border: '1px solid var(--border)', padding: '0.2rem' }}>
          <Image 
            src={logoUrl || "/logo.png"} 
            alt="LYKA Nepal" 
            fill
            style={{ objectFit: 'contain', objectPosition: 'center' }}
            unoptimized={true} 
            onError={() => {
              if (logoUrl && !logoUrl.includes("/logo.png")) {
                setLogoUrl("/logo.png");
              } else {
                setImageError(true);
              }
            }}
          />
        </div>
      )}
    </Link>
  );
}
