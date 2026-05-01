"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "./page.css";

// Separate content component to use searchParams
const RevealWrapper = ({ children, className = "", ...props }: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold: 0.01,
        rootMargin: '50px 0px'
      }
    );

    observer.observe(ref.current);

    const rect = ref.current.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`${className} reveal ${isVisible ? "active" : ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

const ProductCard = ({ product, addToCart }: any) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    // If product requires size selection, don't prevent default. 
    // This allows the click to bubble up to the Link and take the user to the product page.
    if (['Clothes', 'Shoes', 'Meat', 'Frozen', 'Bulk'].includes(product.category) && product.sizes && product.sizes.trim() !== "") {
      return; 
    }

    e.preventDefault();
    e.stopPropagation();
    if (addToCart) addToCart(product);
  };

  return (
    <RevealWrapper className="product-card">
      <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="product-image" style={{ position: 'relative' }}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            style={{ objectFit: 'cover' }}
            priority={false}
            onLoad={() => setImgLoaded(true)}
            className={imgLoaded ? 'loaded' : ''}
          />
          {product.stock === 0 && (
            <div style={{
              position: 'absolute', top: '0.75rem', left: '0.75rem',
              background: '#fff', color: '#111', fontSize: '0.68rem',
              fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.3rem 0.7rem'
            }}>Sold Out</div>
          )}
          {product.stock > 0 && (
            <div className="hover-order-overlay" onClick={handleQuickAdd}>
              ORDER NOW
            </div>
          )}
        </div>

        <div className="product-info">
          <div>
            <h3>{product.name}</h3>
            <p className="price">Rs.{product.price.toLocaleString()}</p>
            {product.description && (
              <p className="product-description">{product.description}</p>
            )}
          </div>
        </div>
      </Link>
    </RevealWrapper>
  );
};

const CategoryScroll = (props: any) => {
  const { products, category, addToCart } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleScroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
    }
  };

  return (
    <div className="slider-wrapper">
      <button className="slider-arrow left" onClick={() => handleScroll('left')} aria-label="Previous">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="20" y1="12" x2="4" y2="12"></line><polyline points="10 18 4 12 10 6"></polyline></svg>
      </button>
      <div className="product-grid horizontal-scroll" ref={scrollRef}>
        {products.map((product: any) => (
          <ProductCard 
            key={`slider-${category}-${product.id}`} 
            product={product} 
            addToCart={addToCart}
          />
        ))}
      </div>
      <button className="slider-arrow right" onClick={() => handleScroll('right')} aria-label="Next">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><polyline points="14 6 20 12 14 18"></polyline></svg>
      </button>
    </div>
  );
};

function HomeContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedSizes, setSelectedSizes] = useState<{[key: number]: string}>({});
  const [showAll, setShowAll] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    let category = searchParams.get('category');
    // Normalize "Bags & Accessories" to match the internal "Bags" filter
    if (category === "Bags & Accessories") category = "Bags";
    setCategoryFilter(category || "All");

    // Handle the cart redirect from PDP
    if (searchParams.get('cart') === 'open') {
      const timer = setTimeout(() => {
        const cartElement = document.getElementById('cart');
        if (cartElement) {
          const offset = 80; // Account for sticky header
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = cartElement.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
        window.history.replaceState({}, '', window.location.pathname);
      }, 600); 
      return () => clearTimeout(timer);
    }
  }, [searchParams]);
  
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      });
  }, []);

  // New QR flow states
  const [showQR, setShowQR] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);

  // Autofill forms
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [heroBg, setHeroBg] = useState(""); // Dynamic Hero Background
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });

    // Load cart from localStorage
    const savedCart = localStorage.getItem('lyka_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCart(parsed);
        // Initial sync for header
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: parsed.length } }));
      } catch (e) {
        console.error("Failed to parse saved cart");
      }
    }

    // Handle hash changes to automatically set the filter when clicking header links
    const handleHashChange = () => {
      const hash = decodeURIComponent(window.location.hash.replace('#', ''));
      if (['Meat', 'Frozen', 'Bakery', 'Dairy', 'Bulk'].includes(hash)) {
        setCategoryFilter(hash);
        document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    // Trigger on initial load as well
    handleHashChange();

    setHeroBg(`/hero-bg.png?v=${Date.now()}`);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash === '#cart') {
      setTimeout(() => {
        const cartElement = document.getElementById('cart');
        if (cartElement) {
          cartElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  }, []);

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    if (loading) return;
    localStorage.setItem('lyka_cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: cart.length } }));
  }, [cart, loading]);

  const addToCart = (product: any, overrideSize?: string) => {
    const sizeToUse = overrideSize || selectedSizes[product.id];
    
    // We no longer alert on the home page; ProductCard redirects if size is missing.
    const itemToAdd = {
      ...product,
      selectedSize: sizeToUse || null
    };

    setCart([...cart, itemToAdd]);
    
    // Silent notification to admin
    fetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ type: 'CART_ADD', message: `Customer added ${product.name} ${itemToAdd.selectedSize ? `(Size: ${itemToAdd.selectedSize})` : ''} to their cart.` })
    }).catch(()=>{});

    // Guide the user to the checkout section with a stabilized delay for production
    setTimeout(() => {
      const cartElement = document.getElementById('cart');
      if (cartElement) {
        const offset = 100; // Account for the sticky header
        const elementPosition = cartElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 500);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    // Switch view to QR mode instead of hitting API
    setShowQR(true);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentScreenshot) {
      alert("Please upload your payment screenshot before submitting.");
      return;
    }

    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append('items', JSON.stringify(cart));
    formData.append('total', totalBill.toString());
    formData.append('name', customerName || "LYKA Guest");
    formData.append('email', customerEmail || "guest@lykanepal.com");
    formData.append('phone', customerPhone);
    formData.append('address', customerAddress);
    if (paymentScreenshot) formData.append('screenshot', paymentScreenshot);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();

      if (data.success) {
        // Clear cart after successful submission
        setCart([]);
        localStorage.removeItem('lyka_cart');
        
        // Redirect to success page (the "Sweet Ding" is now played on that page load)
        setTimeout(() => {
          window.location.href = `/success?orderId=${data.orderId}&total=${totalBill}&status=pending&nt=${data.notificationTimestamp || ''}`;
        }, 100);
      } else {
        alert(`Failed to submit order: ${data.error || 'Please check your connection'}`);
        setIsProcessing(false);
      }
    } catch (err) {
      alert("Network error.");
      setIsProcessing(false);
    }
  };

  const totalBill = cart.reduce((sum, item) => sum + item.price, 0);

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));


  return (
    <>
      {/* Hero */}
      {heroBg && <img src={heroBg} onLoad={() => setHeroLoaded(true)} style={{ display: 'none' }} alt="" />}
      <section
        className={`hero luxury-fade-in ${heroLoaded ? 'active' : ''}`}
        style={heroBg ? {
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : { background: '#1a1a1a' }}
      >
        <div className="hero-overlay">
          <div className="container">
            <h1>Fresh from the Coldstore</h1>
            <a href="#catalog" className="hero-cta">Shop now</a>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="catalog container" id="catalog">
        <RevealWrapper className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>Today's Specials</h2>
        </RevealWrapper>
        
        {/* Top Section: New Arrivals Slider */}
        <RevealWrapper style={{ marginBottom: '1rem' }}>
          <div className="slider-wrapper">
            <button className="slider-arrow left" onClick={scrollLeft} aria-label="Previous">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="20" y1="12" x2="4" y2="12"></line><polyline points="10 18 4 12 10 6"></polyline></svg>
            </button>
            <div className="product-grid horizontal-scroll" ref={sliderRef}>
              {products.length === 0 && (
                <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#999", padding: "4rem 0", fontStyle: "italic" }}>
                  No products found.
                </p>
              )}
              {products.map((product) => (
                <ProductCard 
                  key={`slider-${product.id}`} 
                  product={product} 
                  addToCart={addToCart}
                />
              ))}
            </div>
            <button className="slider-arrow right" onClick={scrollRight} aria-label="Next">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><polyline points="14 6 20 12 14 18"></polyline></svg>
            </button>
          </div>
          
          <div className="view-all-container">
            <button 
              onClick={() => { document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }) }} 
              className="view-all-btn"
            >
              VIEW ALL
            </button>
          </div>
        </RevealWrapper>

        {/* Bottom Section: Collection Grid */}
        <div id="collection" style={{ paddingTop: '2rem' }}>
          <RevealWrapper className="section-header" style={{ marginBottom: '3rem' }}>
            <h2>Our Selection</h2>
            <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {categories.map(c => c.name).join(' · ')}
            </p>
          </RevealWrapper>

          <div className="catalog-filters" style={{ marginBottom: '2rem' }}>
            <div className="filter-group">
              {["All", ...categories.map(c => c.name)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`filter-btn ${categoryFilter === cat ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <label htmlFor="product-search" className="visually-hidden">Search products</label>
            <input
              id="product-search"
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="product-grid product-grid-regular">
            {filteredProducts.length === 0 && (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#999", padding: "4rem 0", fontStyle: "italic" }}>
                No products found.
              </p>
            )}
            {filteredProducts.slice(0, showAll ? undefined : (isMobile ? 8 : 12)).map((product) => (
              <ProductCard 
                key={`grid-${product.id}`} 
                product={product} 
                addToCart={addToCart}
              />
            ))}
          </div>

          {!showAll && filteredProducts.length > (isMobile ? 8 : 12) && (
            <div className="view-all-container">
              <button 
                onClick={() => setShowAll(true)} 
                className="view-all-btn"
              >
                VIEW ALL
              </button>
            </div>
          )}
        </div>

        {/* Individual Category Sliders */}
        <div className="container" style={{ marginTop: '2rem' }}>
          {categories.map((item) => {
            const catProducts = products.filter(p => p.category === item.name);
            if (catProducts.length === 0) return null;
            
            return (
              <RevealWrapper key={item.name} style={{ marginTop: '5rem', marginBottom: '4rem' }}>
                <RevealWrapper className="section-header" style={{ marginBottom: '1.5rem' }}>
                  <h2>{item.name}</h2>
                </RevealWrapper>
                <CategoryScroll 
                  products={catProducts} 
                  category={item.name} 
                  addToCart={addToCart}
                />
                
                <div className="view-all-container">
                  <Link 
                    href={`/?category=${encodeURIComponent(item.name)}#collection`}
                    className="view-all-btn"
                  >
                    VIEW ALL
                  </Link>
                </div>
              </RevealWrapper>
            );
          })}
        </div>

        {/* Promotional Sale Banners */}
        <div className="promo-section">
          {/* Left Promo: Season Sale */}
          <RevealWrapper className="promo-banner" style={{ backgroundImage: "url('/promo-season-sale.png')" }}>
            <span className="promo-side-text left">30%</span>
            <div className="promo-content">
              <h3>SALE</h3>
              <p>#WEEKEND BBQ SPECIAL</p>
              <button 
                onClick={() => {
                  setCategoryFilter('Meat');
                  document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="promo-btn"
                style={{ background: 'white', color: 'black', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                VIEW
              </button>
            </div>
          </RevealWrapper>

          {/* Right Promo: Premium Knitwear */}
          <RevealWrapper className="promo-banner" style={{ backgroundImage: "url('/promo-half-price.png')" }}>
            <span className="promo-side-text right">50%</span>
            <div className="promo-content">
              <h3>NEW</h3>
              <p>#FROZEN FOOD SPECIALS</p>
              <button 
                onClick={() => {
                  setCategoryFilter('Frozen');
                  document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="promo-btn"
                style={{ background: 'white', color: 'black', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                VIEW
              </button>
            </div>
          </RevealWrapper>
        </div>

      </section>

      {/* Cart / Billing */}
      <section className="billing-section container" id="cart" style={{ scrollMarginTop: '90px' }}>
        <div className="billing-container">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--secondary)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <h2>Your Cart</h2>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem 0', fontSize: '0.9rem' }}>
              Your cart is empty. Browse our collection above.
            </p>
          ) : (
            <div>
              <ul className="cart-list">
                {cart.map((item, index) => (
                  <li key={index}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '0.92rem' }}>
                        {item.name}
                        {item.selectedSize && (
                          <span style={{ color: '#888', fontWeight: '400', marginLeft: '0.5rem', fontSize: '0.82rem' }}>/ {item.selectedSize}</span>
                        )}
                      </strong>
                      <span style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.2rem' }}>NPR {item.price.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => removeFromCart(index)}
                      style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '1.1rem', padding: '0.4rem', transition: 'color 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#111')}
                      onMouseOut={e => (e.currentTarget.style.color = '#bbb')}
                      title="Remove item"
                    >✕</button>
                  </li>
                ))}
              </ul>

              <div className="bill-total">
                <span>Total</span>
                <span>NPR {totalBill.toLocaleString()}</span>
              </div>

              {!showQR ? (
                <form className="checkout-form" onSubmit={handleCheckout}>
                  <label htmlFor="cust-name" className="visually-hidden">Full Name</label>
                  <input id="cust-name" type="text" placeholder="Full Name" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                  <label htmlFor="cust-email" className="visually-hidden">Email Address</label>
                  <input id="cust-email" type="email" placeholder="Email Address" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                  <label htmlFor="cust-phone" className="visually-hidden">Phone Number</label>
                  <input id="cust-phone" type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                  <label htmlFor="cust-address" className="visually-hidden">Delivery Address</label>
                  <textarea id="cust-address" placeholder="Delivery Address (e.g., Imadole Area)" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} required></textarea>
                  <button type="submit" className="checkout-btn">Proceed to Payment</button>
                </form>
              ) : (
                <form className="checkout-form" onSubmit={handleFinalSubmit} style={{ marginTop: '2rem' }}>
                  <div style={{ border: '1px solid var(--border)', padding: '1.5rem', background: '#fafafa', marginBottom: '1rem' }}>
                    {/* Placeholder for branding toggle logic */}
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: '#666' }}>
                      Step 2 — Scan &amp; Pay NPR {totalBill.toLocaleString()}
                    </p>
                    <div style={{ margin: '0 auto', width: '220px', height: '220px', position: 'relative' }}>
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/qr.png?v=${Date.now()}`}
                        alt="Payment QR Code"
                        fill
                        style={{ objectFit: 'contain' }}
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:0.85rem;text-align:center;">QR not uploaded yet.<br/>Check Admin Dashboard.</div>';
                        }}
                      />
                    </div>
                  </div>
                  <label htmlFor="screenshot-upload" style={{ fontSize: '0.78rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#666', marginBottom: '0.4rem', display: 'block' }}>
                    Upload Payment Screenshot:
                  </label>
                  <input id="screenshot-upload" type="file" accept="image/*" onChange={e => setPaymentScreenshot(e.target.files?.[0] || null)} required style={{ marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" onClick={() => setShowQR(false)} style={{ flex: 1, padding: '0.9rem', background: 'white', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter, sans-serif' }}>← Back</button>
                    <button type="submit" className="checkout-btn" disabled={isProcessing} style={{ flex: 2, margin: 0 }}>
                      {isProcessing ? "Uploading..." : "Submit Payment"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <Link href="/payment-methods" className="feature-item" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="23"></line></svg>
              </div>
              <h3>PAYMENT</h3>
              <p>We accept all Mobile Banking, eSewa, and Khalti for your convenience.</p>
            </Link>
            <Link href="/request-return" className="feature-item" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </div>
              <h3>RETURN</h3>
              <p>Return your order easily with just one click.</p>
            </Link>
            <Link href="/shipping" className="feature-item" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              </div>
              <h3>DELIVERY</h3>
              <p>Delivery available for any location; domestic or international.</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

