"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navigation from "../app/Navigation";
import FloatingContact from "../app/FloatingContact";
import SiteLogo from "../app/SiteLogo";
import Link from "next/link";
import NepaliDate from "nepali-date-converter";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = pathname?.startsWith("/admin");

  // During SSR and first client pass, render a consistent shell
  if (!mounted) {
    return <div className="loading-shell" style={{ opacity: 0 }}>{children}</div>;
  }

  if (isAdmin) {
    return <div className="admin-layout-root">{children}</div>;
  }

  return (
    <>
      <Navigation />
      <main>{children}</main>
      <FloatingContact />
      <footer className="main-footer">
        <div className="container">
          <div className="footer-branding">
            <div className="footer-logo-wrap">
              <SiteLogo />
            </div>
            <p style={{ marginTop: '1.5rem' }}>
              Premium Women&apos;s Fashion.<br />
              Curated styles for the modern woman.
            </p>
          </div>
          <div>
            <h3>Visit Us</h3>
            <address>
              Imadole, Patan<br />
              Lalitpur, Nepal<br />
              Open 10am – 8pm daily
            </address>
          </div>
          <div>
            <h3>Contact</h3>
            <p><a href="mailto:shop@deliciousmeat.com" style={{ color: '#aaa' }}>shop@deliciousmeat.com</a></p>
            <p><a href="tel:+9779762850637" style={{ color: '#aaa' }}>+977 9762850637</a></p>
          </div>
          <div>
            <h3>Shop</h3>
            <p><Link href="/?category=Clothes#collection" style={{ color: '#aaa', display: 'block', marginBottom: '0.4rem', textDecoration: 'none' }}>Clothes</Link></p>
            <p><Link href="/?category=Bags%20%26%20Accessories#collection" style={{ color: '#aaa', display: 'block', marginBottom: '0.4rem', textDecoration: 'none' }}>Bags &amp; Accessories</Link></p>
            <p><Link href="/?category=Shoes#collection" style={{ color: '#aaa', display: 'block', marginBottom: '0.4rem', textDecoration: 'none' }}>Shoes</Link></p>
          </div>
          <div className="footer-customer-care">
            <h3>Customer Care</h3>
            <p style={{ color: '#aaa', marginBottom: '1rem', lineHeight: '1.4' }}>
              We prioritize customer care, and we are here to help YOU.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <a href="https://www.facebook.com/lykanepal" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://www.instagram.com/lykanepal/" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://www.tiktok.com/@lyka.nepal" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
              </a>
              <a href="https://www.youtube.com/@lykanepal" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              </a>
            </div>
            <p><Link href="/request-return" style={{ color: '#aaa', display: 'block', marginBottom: '0.4rem', textDecoration: 'none' }}>Returns &amp; Exchanges</Link></p>
            <p><Link href="/shipping" style={{ color: '#aaa', display: 'block', marginBottom: '0.4rem', textDecoration: 'none' }}>Shipping Information</Link></p>
            <p><Link href="/size-guide" style={{ color: '#aaa', display: 'block', marginBottom: '0.4rem', textDecoration: 'none' }}>Size Guide</Link></p>
          </div>
        </div>
        <div className="footer-bottom">
          <div style={{ display: 'flex', gap: '3.5rem', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <Link href="/payment-methods" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label="Pay with eSewa">
              <img src="/esewa.svg?v=3" alt="eSewa" style={{ height: '35px', transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
            </Link>
            <Link href="/payment-methods" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label="Pay with Khalti">
              <img src="/Khalti.svg" alt="Khalti" style={{ height: '32px', transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
            </Link>
            <Link href="/payment-methods" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff', opacity: 0.8, transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} aria-label="View Bank Transfer Details">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M3 10h18"></path><path d="M5 6l7-3 7 3"></path><path d="M4 10v11"></path><path d="M20 10v11"></path><path d="M8 14v3"></path><path d="M12 14v3"></path><path d="M16 14v3"></path></svg>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bank Transfer</span>
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} ({new NepaliDate().getYear()} BS) Delicious Meat Shop. All rights reserved. Premium Quality Meat & Cold Store.</p>
        </div>
      </footer>
    </>
  );
}
