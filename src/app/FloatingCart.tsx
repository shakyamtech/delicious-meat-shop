"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const FloatingCart = () => {
  const [cartCount, setCartCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleCartUpdate = (e: any) => {
      setCartCount(e.detail?.count || 0);
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    
    const saved = localStorage.getItem('lyka_cart');
    if (saved) {
      try { setCartCount(JSON.parse(saved).length); } catch (e) {}
    }
    
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  if (!isMounted) return null;

  return (
    <Link href="/#cart" className="floating-cart-button no-print">
      <div className="cart-icon-wrapper">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </div>
      <span className="cart-count">({cartCount})</span>
    </Link>
  );
};

export default FloatingCart;
