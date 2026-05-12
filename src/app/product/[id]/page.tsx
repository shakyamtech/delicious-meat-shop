"use client";

import { useState, useEffect, use, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./product.css"; // We will create this

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [cart, setCart] = useState<any[]>([]);

  // Wishlist States
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistSize, setWishlistSize] = useState<string | null>(null);
  const [wishlistPhone, setWishlistPhone] = useState("");
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playBlip = () => {
    try {
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(2000, ctx.currentTime);
      
      if (ctx.state === 'suspended') ctx.resume();
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const playSweetDing = () => {
    try {
      const ctx = initAudio();
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      if (ctx.state === 'suspended') ctx.resume();
      playNote(523.25, now, 0.4); 
      playNote(659.25, now + 0.15, 0.4); 
      playNote(783.99, now + 0.3, 0.6); 
    } catch (e) { }
  };


  useEffect(() => {
    // Load existing cart
    const saved = localStorage.getItem('lyka_cart');
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch (e) {}
    }

    // Fetch product
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        const found = data.find((p: any) => p.id === productId || p.id.toString() === productId);
        setProduct(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    // Keep local storage synced with any changes here
    if (!loading) {
        localStorage.setItem('lyka_cart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: cart.length } }));
    }
  }, [cart, loading]);

  const getAdjustedPrice = (basePrice: number, size: string | null) => {
    if (!size) return basePrice;
    const s = size.toLowerCase();
    if (s.includes('500gm') || s.includes('500ml') || s.includes('half')) return basePrice * 0.5;
    if (s.includes('250gm')) return basePrice * 0.25;
    if (s.includes('1.5kg')) return basePrice * 1.5;
    if (s.includes('2kg')) return basePrice * 2.0;
    if (s.includes('1kg') || s.includes('1 litre') || s.includes('whole')) return basePrice;
    if (s.includes('2 litre')) return basePrice * 2.0;
    if (s.includes('100gm')) return basePrice * 0.1;
    return basePrice;
  };

  const handleAddToCart = () => {
    if (['Meat', 'Frozen', 'Bulk', 'Dairy'].includes(product.category) && product.sizes && !selectedSize) {
      alert("Please select a weight / portion first.");
      return;
    }

    const finalPrice = getAdjustedPrice(product.price, selectedSize);

    const itemToAdd = {
      ...product,
      price: finalPrice, // Use the calculated price for this specific weight
      selectedSize: selectedSize || null,
    };

    const newItems = Array(quantity).fill(itemToAdd);
    setCart(prev => [...prev, ...newItems]);


    // Notify admin
    fetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'CART_ADD', 
        message: `Customer added ${product.name} ${itemToAdd.selectedSize ? `(Variant: ${itemToAdd.selectedSize})` : ''} to their cart from Product Page.` 
      })
    }).catch(()=>{});
    
    // Redirect to homepage with a cart trigger - slight delay for sound
    setTimeout(() => {
      router.push('/?cart=open#cart');
    }, 150);
  };

  const handleJoinWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistPhone || wishlistPhone.length < 10) {
      alert("Please enter a valid phone number.");
      return;
    }
    setWishlistLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          phone: wishlistPhone,
          size: wishlistSize
        })
      });
      if (res.ok) {
        alert("Success! We'll notify you via SMS/WhatsApp when this item is restocked.");
        router.push('/');
      } else {
        alert("Failed to join wishlist. Please try again.");
      }
    } catch (e) {
      alert("Network error. Please try again.");
    }
    setWishlistLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h2>Product not found</h2>
        <Link href="/" style={{ marginTop: '1rem', textDecoration: 'underline' }}>Return to Home</Link>
      </div>
    );
  }

  const sizes = product.sizes ? product.sizes.split(',').filter(Boolean) : [];

  return (
    <div className="pdp-container">
      <div className="pdp-breadcrumbs">
        <Link href="/">Home</Link> / <Link href={`/?category=${encodeURIComponent(product.category)}#collection`}>{product.category}</Link> / <span>{product.name}</span>
      </div>

      <div className="pdp-grid">
        {/* Left: Image */}
        <div className="pdp-image-col">
          <div className="pdp-image-wrapper" style={{ position: 'relative' }}>
            {!product.image || product.image.trim() === "" || product.image.includes("placeholder") ? (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: product.category === 'Meat' ? 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)' :
                            product.category === 'Frozen' ? 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' :
                            product.category === 'Bakery' ? 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' :
                            product.category === 'Dairy' ? 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)' :
                            'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                padding: '2rem',
                textAlign: 'center',
                boxSizing: 'border-box',
                borderRadius: 'inherit'
              }}>
                <span style={{ fontSize: '4rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))', marginBottom: '0.5rem' }}>
                  {product.category === 'Meat' ? '🥩' : product.category === 'Frozen' ? '❄️' : product.category === 'Bakery' ? '🥖' : product.category === 'Dairy' ? '🥛' : '✨'}
                </span>
                <strong style={{ fontSize: '1.8rem', fontFamily: 'Playfair Display, serif', letterSpacing: '0.05em', lineHeight: 1.1, textShadow: '0 4px 8px rgba(0,0,0,0.3)', marginBottom: '1rem' }}>
                  Delicious Meat Shop
                </strong>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.35)', padding: '0.4rem 1.2rem', borderRadius: '30px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  ⏳ Image Uploading Soon
                </span>
              </div>
            ) : (
              <Image 
                src={product.image} 
                alt={product.name} 
                layout="fill" 
                objectFit="cover" 
                priority
              />
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="pdp-info-col">
          <h1 className="pdp-title">{product.name}</h1>
          <p className="pdp-price">
            {selectedSize ? (
              <>
                <span style={{ fontSize: '0.9rem', opacity: 0.6, textDecoration: 'line-through', marginRight: '0.5rem' }}>Rs. {product.price.toLocaleString()}</span>
                Rs. {getAdjustedPrice(product.price, selectedSize).toLocaleString()}
              </>
            ) : (
              `Rs. ${product.price.toLocaleString()}`
            )}
            <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 'normal', marginLeft: '0.5rem' }}>
              {product.category === 'Frozen' ? '/ Per Packet' : product.category === 'Dairy' ? '/ Per Litre/Unit' : '/ Per Unit (Base)'}
            </span>
          </p>
          
          <div className="pdp-description">
            {product.description || "No description available."}
          </div>

          {sizes.length > 0 && (
            <div className="pdp-sizes">
              <h4>Variant / Weight</h4>
              <div className="pdp-size-buttons">
                {sizes.map((sStr: string) => {
                  const parts = sStr.split(':');
                  const szName = parts[0].trim();
                  const szQty = parts.length > 1 ? Number(parts[1].trim()) : 1;

                  return (
                    <button
                      key={szName}
                      onClick={() => {
                        if (szQty > 0) {
                          setSelectedSize(szName);
                        } else {
                          setWishlistSize(szName);
                          setShowWishlistModal(true);
                        }
                      }}
                      className={`pdp-size-btn ${selectedSize === szName ? 'selected' : ''} ${szQty <= 0 ? 'out-of-stock' : ''}`}
                      title={szQty <= 0 ? "Out of Stock - Click to be notified" : ""}
                    >
                      {szName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pdp-actions">
            <div className="pdp-quantity">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>

            {product.stock > 0 ? (
              <button 
                className="pdp-add-to-cart" 
                onClick={handleAddToCart}
              >
                ADD TO CART
              </button>
            ) : (
              <button 
                className="pdp-add-to-cart wishlist-trigger" 
                onClick={() => {
                  setWishlistSize(null);
                  setShowWishlistModal(true);
                }}
              >
                NOTIFY ME
              </button>
            )}
          </div>
          
          <div className="pdp-shipping-info">
            <p>✦ Free delivery on orders above Rs. 3000</p>
            <p>✦ Standard delivery 2-3 business days</p>
          </div>
        </div>
      </div>

      {/* Wishlist Modal */}
      {showWishlistModal && (
        <div className="wishlist-modal-overlay">
          <div className="wishlist-modal-content">
            <button className="close-modal" onClick={() => setShowWishlistModal(false)}>✕</button>
            <div className="modal-icon">🔔</div>
            <h2>Restock Notification</h2>
            <p>
              The <strong>{product.name}</strong> {wishlistSize ? `in variant ${wishlistSize}` : ''} is currently out of stock. 
              Leave your number and we'll notify you the moment it's back!
            </p>
            <form onSubmit={handleJoinWishlist}>
              <input 
                type="tel" 
                placeholder="Your Phone Number (e.g. 98...)" 
                value={wishlistPhone}
                onChange={(e) => setWishlistPhone(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" disabled={wishlistLoading}>
                {wishlistLoading ? "Joining..." : "Notify Me"}
              </button>
            </form>
            <p className="modal-footer-note">We only send restock alerts. No spam, ever.</p>
          </div>
        </div>
      )}
    </div>
  );
}
