"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ReturnPageContent() {
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get("orderId");

  const [products, setProducts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fast Return Search State
  const [orderSearchId, setOrderSearchId] = useState("");
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Custom Modal State
  const [quickReturnItem, setQuickReturnItem] = useState<any>(null);
  const [quickReturnReason, setQuickReturnReason] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);

  const performSearch = useCallback(async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    setIsSearching(true);
    setFoundOrder(null);
    try {
      const res = await fetch(`/api/orders/check?id=${idToSearch.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setFoundOrder(data);
        
        // DYNAMICALLY POPULATE THE FORM
        setName(data.customer_name || "");
        setPhone(data.customer_phone || "");
        
        // Pre-select first item in dropdown if available and matches live product
        if (data.items && data.items.length > 0) {
          const firstItemName = data.items[0].name;
          // Find matching live product ID to select in dropdown
          // Note: products state might still be loading, so we rely on finding it once products are loaded
        }
      } else {
        if (!urlOrderId) setError("Order not found. Please check your Order ID.");
      }
    } catch (e) {
      console.error("Error finding order:", e);
    }
    setIsSearching(false);
  }, [urlOrderId]);

  // Sync productId dropdown when foundOrder or products change
  useEffect(() => {
    if (foundOrder?.items?.[0] && products.length > 0) {
      const firstItemName = foundOrder.items[0].name;
      const matchedProd = products.find(p => p.name === firstItemName);
      if (matchedProd) setProductId(matchedProd.id.toString());
    }
  }, [foundOrder, products]);

  // Handle URL parameter search
  useEffect(() => {
    if (urlOrderId && products.length > 0) {
      setOrderSearchId(urlOrderId);
      performSearch(urlOrderId);
    }
  }, [urlOrderId, products.length, performSearch]);

  const handleOrderSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(orderSearchId);
  };

  const selectedProduct = products.find(p => p.id.toString() === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          product_name: selectedProduct?.name || productId,
          product_id: productId,
          quantity: Number(qty),
          reason,
          amount: (selectedProduct?.price || 0) * Number(qty)
        })
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);

      // Notify Admin
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RETURN",
          message: `New Return Request from ${name} for ${selectedProduct?.name || productId}.`
        })
      }).catch(() => {});
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleQuickReturnTrigger = (item: any) => {
    setQuickReturnItem(item);
    setQuickReturnReason("");
    setModalError("");
  };

  const handleQuickReturnSubmit = async () => {
    if (!quickReturnReason.trim()) {
      setModalError("Please select or enter a reason.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: foundOrder.customer_name,
          customer_phone: foundOrder.customer_phone,
          product_name: quickReturnItem.name,
          product_id: quickReturnItem.id?.toString(),
          quantity: quickReturnItem.quantity || 1,
          reason: quickReturnReason,
          amount: (Number(quickReturnItem.price) || 0) * (quickReturnItem.quantity || 1)
        })
      });
      if (res.ok) {
        setSubmitted(true);
        setQuickReturnItem(null);
        // Notify Admin
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "RETURN",
            message: `New Return Request from ${foundOrder.customer_name} for ${quickReturnItem.name}.`
          })
        }).catch(() => {});
      } else {
        setError("Failed to submit. Please try the manual form below.");
        setQuickReturnItem(null);
      }
    } catch (e) {
      setError("Network error.");
      setQuickReturnItem(null);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "4rem 2rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
           <span>←</span> BACK TO STORE
        </Link>
        
        <div style={{ background: "white", padding: "3rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", border: "1px solid #e2e8f0" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>RETURNS & EXCHANGES</h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            The fastest way to request a return is using your Order ID. You can find it in your receipt or confirmation.
          </p>

          {submitted ? (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📦</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "1rem" }}>Request Submitted!</h2>
              <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                We have received your return request. Our team will review it and contact you on your phone number within 1–2 business days.
              </p>
              <Link href="/">
                <button style={{ marginTop: "2.5rem", padding: "1rem 2.5rem", background: "#1e293b", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", transition: "transform 0.2s" }}>
                  RETURN TO STORE
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* SECTION: ORDER SEARCH */}
              <div style={{ background: "#f1f5f9", padding: "1.5rem", borderRadius: "8px", marginBottom: "2.5rem" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "1rem", color: "#334155" }}>SEARCH BY ORDER ID</h3>
                <form onSubmit={handleOrderSearch} style={{ display: "flex", gap: "0.5rem" }}>
                  <label htmlFor="search-order-id" className="visually-hidden">Order ID</label>
                  <input 
                    id="search-order-id"
                    type="text" placeholder="e.g. ORD-171..." 
                    value={orderSearchId} onChange={e => setOrderSearchId(e.target.value)}
                    style={{ flex: 1, padding: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                  <button 
                    type="submit"
                    disabled={isSearching}
                    style={{ background: "#1e293b", color: "white", border: "none", padding: "0 1.5rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                  >
                    {isSearching ? "..." : "SEARCH"}
                  </button>
                </form>

                {foundOrder && (
                  <div style={{ marginTop: "1.5rem", background: "white", padding: "1.2rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "1rem" }}>Items in your order:</p>
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {(foundOrder.items as any[]).map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i !== foundOrder.items.length - 1 ? "1px solid #f1f5f9" : "none", paddingBottom: "0.75rem" }}>
                          <div>
                            <p style={{ fontWeight: "600", fontSize: "0.9rem" }}>{item.name}</p>
                            {item.selectedSize && <p style={{ fontSize: "0.75rem", color: "#64748b" }}>Size: {item.selectedSize}</p>}
                          </div>
                          <button 
                            onClick={() => handleQuickReturnTrigger(item)}
                            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fee2e2", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}
                          >
                            Return
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
                <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e2e8f0" }} />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700" }}>OR FILL MANUALLY</span>
                <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e2e8f0" }} />
              </div>

              {/* SECTION: MANUAL FORM */}
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label htmlFor="manual-name" style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>FULL NAME</label>
                  <input
                    id="manual-name"
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Same name used in order"
                    style={{ width: "100%", padding: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem" }}
                  />
                </div>

                <div>
                  <label htmlFor="manual-phone" style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>PHONE NUMBER</label>
                  <input
                    id="manual-phone"
                    type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="98********"
                    style={{ width: "100%", padding: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem" }}
                  />
                </div>

                <div>
                  <label htmlFor="manual-product" style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>PRODUCT</label>
                  <select
                    id="manual-product"
                    required value={productId} onChange={e => setProductId(e.target.value)}
                    style={{ width: "100%", padding: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem" }}
                  >
                    <option value="">Select Item</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id.toString()}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manual-reason" style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.5rem" }}>REASON</label>
                  <select
                    id="manual-reason"
                    value={reason} onChange={e => setReason(e.target.value)}
                    style={{ width: "100%", padding: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem" }}
                  >
                    <option value="">Select Reason</option>
                    <option value="Wrong size">Wrong size</option>
                    <option value="Defective">Defective / Damaged</option>
                    <option value="Changed mind">Changed my mind</option>
                  </select>
                </div>

                {error && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error}</p>}

                <button
                  type="submit" disabled={loading}
                  style={{ padding: "1.2rem", background: loading ? "#94a3b8" : "#111", color: "white", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer", marginTop: "1rem" }}
                >
                  {loading ? "SUBMITTING..." : "SUBMIT MANUAL REQUEST"}
                </button>
              </form>
            </>
          )}
        </div>
        
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", marginTop: "2rem" }}>
          Questions? Contact us at <strong>shop@lykanepal.com</strong>
        </p>
      </div>

      {/* QUICK RETURN MODAL */}
      {quickReturnItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 10000 }}>
          <div style={{ background: "white", width: "100%", maxWidth: "450px", borderRadius: "12px", padding: "2rem", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "0.5rem" }}>Reason for Return</h2>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.5rem" }}>
              Returning: <strong>{quickReturnItem.name}</strong>
            </p>

            <select 
              value={quickReturnReason} 
              onChange={e => setQuickReturnReason(e.target.value)}
              style={{ width: "100%", padding: "0.8rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "1rem" }}
            >
              <option value="">Select a reason...</option>
              <option value="Wrong size">Wrong size</option>
              <option value="Defective">Defective / Damaged</option>
              <option value="Changed mind">Changed my mind</option>
              <option value="Other">Other</option>
            </select>

            {quickReturnReason === "Other" && (
              <textarea 
                placeholder="Please specify..."
                onChange={e => setQuickReturnReason("Other: " + e.target.value)}
                style={{ width: "100%", padding: "0.8rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", marginBottom: "1rem", minHeight: "80px" }}
              />
            )}

            {modalError && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "1rem" }}>{modalError}</p>}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button 
                onClick={() => setQuickReturnItem(null)}
                style={{ flex: 1, padding: "0.8rem", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleQuickReturnSubmit}
                disabled={loading}
                style={{ flex: 2, padding: "0.8rem", background: "#111", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
              >
                {loading ? "Submitting..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestReturnPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "10rem" }}>Loading...</div>}>
      <ReturnPageContent />
    </Suspense>
  );
}
