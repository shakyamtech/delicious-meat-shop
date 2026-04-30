"use client";

import { useState, useEffect, useRef } from "react";
import NepaliDate from "nepali-date-converter";
import { supabase } from "@/lib/supabase";
import "./admin.css";

function AnalyticsSection({ orders, products, expenses = [], lastSync, isSyncing }: { orders: any[], products: any[], expenses?: any[], lastSync: Date | null, isSyncing: boolean }) {
  const [filterItemId, setFilterItemId] = useState<string>("ALL");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const verifiedOrders = orders.filter(o => o.status === 'Verified' || o.status === 'Paid & Verified' || !o.status);

  const calcMetrics = (filteredOrders: any[], filteredExpenses: any[]) => {
    let revenue = 0;
    let costTotal = 0;

    // 1. Process Online Orders
    filteredOrders.forEach(o => {
      if (!o.items || !Array.isArray(o.rawItems || o.items)) return;
      const orderItems = o.rawItems || o.items;

      orderItems.forEach((item: any) => {
        if (typeof item !== 'object') return;
        const selectedProduct = filterItemId !== "ALL" ? products.find(p => p.id?.toString() === filterItemId.toString()) : null;
        
        if (filterItemId !== "ALL") {
          const idMatch = item.id?.toString() === filterItemId.toString();
          const nameMatch = selectedProduct && item.name && selectedProduct.name && 
                            item.name.toString().toLowerCase().trim() === selectedProduct.name.toString().toLowerCase().trim();
          if (!idMatch && !nameMatch) return;
        }

        let itemCost = item.cost;
        if (itemCost === undefined || itemCost === null) {
          const liveProduct = products.find(p => 
            p.id?.toString() === item.id?.toString() || 
            (p.name && item.name && p.name.toString().toLowerCase().trim() === item.name.toString().toLowerCase().trim())
          );
          itemCost = liveProduct?.cost || 0;
        }
        let itemPrice = item.price || 0;
        let qty = Number(item.quantity || 1);

        revenue += (Number(itemPrice) * qty);
        costTotal += (Number(itemCost) * qty);
      });
    });

    // 2. Process Offline Sales (from Expenses with category 'Offline Sale')
    const offlineSales = filteredExpenses.filter(e => 
      e.type === 'INCOME' && 
      e.category?.toString().toLowerCase().trim() === 'offline sale'
    );
    offlineSales.forEach(sale => {
      // Check if it matches the filtered product if one is selected
      if (filterItemId !== "ALL") {
        const pidTag = `[PID:${filterItemId}]`;
        if (!sale.description?.includes(pidTag)) return;
      }

      const saleAmount = Number(sale.amount || 0);
      revenue += saleAmount;

      // Extract COGS for offline sale using unified regex
      const pidMatches = Array.from((sale.description || "").matchAll(/\[PID:(.+?)\]/g)) as any[];
      const qtyMatches = Array.from((sale.description || "").matchAll(/\(x(\d+)\)/g)) as any[];
      
      let saleCost = 0;
      if (pidMatches.length > 0) {
        pidMatches.forEach((match: any, index: number) => {
          const pid = match[1];
          const qty = qtyMatches[index] ? Number(qtyMatches[index][1]) : 1;
          const product = products.find(p => p.id?.toString() === pid);
          if (product) saleCost += (Number(product.cost || 0) * qty);
        });
      } else {
        // Fallback for single-item legacy entries
        const productName = sale.description.replace("Offline Sale: ", "").split(" (x")[0];
        const p = products.find(prod => prod.name === productName);
        const qtyMatch = sale.description.match(/\(x(\d+)\)/);
        const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
        saleCost = p ? (Number(p.cost) || 0) * qty : 0;
      }
      costTotal += saleCost;
    });

    // 3. Process Returns (Refund Paid)
    const returns = filteredExpenses.filter(e => e.category === 'Refund Paid');
    returns.forEach(ret => {
      const retAmount = Number(ret.amount || 0);
      revenue -= retAmount;

      const pidMatches = Array.from((ret.description || "").matchAll(/\[PID:(.+?)\]/g)) as any[];
      const qtyMatches = Array.from((ret.description || "").matchAll(/\(x(\d+)\)/g)) as any[];
      
      if (pidMatches.length > 0) {
        pidMatches.forEach((match: any, index: number) => {
          const pid = match[1];
          const qty = qtyMatches[index] ? Number(qtyMatches[index][1]) : 1;
          const product = products.find(p => p.id?.toString() === pid);
          if (product) costTotal -= (Number(product.cost || 0) * qty);
        });
      }
    });

    return {
      revenue,
      profit: revenue - costTotal,
      margin: revenue > 0 ? ((revenue - costTotal) / revenue * 100).toFixed(1) : 0
    };
  };

  const dailyMetrics = calcMetrics(
    verifiedOrders.filter(o => new Date(o.date) >= startOfDay),
    expenses.filter(e => new Date(e.date) >= startOfDay)
  );
  const monthlyMetrics = calcMetrics(
    verifiedOrders.filter(o => new Date(o.date) >= startOfMonth),
    expenses.filter(e => new Date(e.date) >= startOfMonth)
  );
  const yearlyMetrics = calcMetrics(
    verifiedOrders.filter(o => new Date(o.date) >= startOfYear),
    expenses.filter(e => new Date(e.date) >= startOfYear)
  );

  return (
    <div style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Analytics & Profit Dashboard</h2>
          {isSyncing && <span className="sync-spinner" style={{ fontSize: '0.8rem', color: '#6366f1' }}>🔄 Syncing...</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {lastSync && (
            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Last Updated: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <select
            value={filterItemId}
            onChange={e => setFilterItemId(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--admin-border)", fontFamily: "inherit", background: 'var(--admin-card)', color: 'var(--admin-text)' }}
          >
            <option value="ALL">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {[
          { label: "Today's Sales", metrics: dailyMetrics },
          { label: "This Month", metrics: monthlyMetrics },
          { label: "This Year", metrics: yearlyMetrics },
        ].map((block, idx) => (
          <div key={idx} className="theme-card" style={{ background: "var(--admin-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--admin-border)", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
            <h3 style={{ color: "var(--admin-text-muted)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "1rem" }}>{block.label}</h3>
            <div style={{ fontSize: "2.4rem", fontWeight: "900", color: "var(--admin-text)", marginBottom: "0.5rem" }}>
              NPR {block.metrics.revenue.toLocaleString()}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--admin-border)", paddingTop: "1rem", marginTop: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", textTransform: 'uppercase' }}>Profit</p>
                <p style={{ fontSize: '1.1rem', fontWeight: "800", color: block.metrics.profit >= 0 ? "#10b981" : "#ef4444" }}>
                  {block.metrics.profit >= 0 ? "+" : ""}NPR {block.metrics.profit.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", textTransform: 'uppercase' }}>Margin</p>
                <p style={{ fontSize: '1.1rem', fontWeight: "800", color: "#6366f1" }}>{block.metrics.margin}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminHeader({ currentUser, weather, themeMode, toggleTheme, refreshWeather, isRefreshing }: { currentUser: any, weather: any, themeMode: string, toggleTheme: () => void, refreshWeather: () => void, isRefreshing: boolean }) {
  if (!weather || !currentUser) return null;
  const hour = new Date().getHours();

  const renderWeatherIcon = () => {
    const desc = weather.desc.toLowerCase();
    const isNight = hour >= 18 || hour < 6;
    if (desc.includes('thunder')) return <div className="weather-icon-thunder">⚡</div>;
    if (desc.includes('rain') || desc.includes('drizzle')) return <div className="weather-icon-rain">🌧️</div>;
    if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('fog')) return <div className="weather-icon-cloud">☁️</div>;
    if (desc.includes('snow')) return <div className="weather-icon-cloud">❄️</div>;
    
    if (isNight) return <div className="weather-icon-moon" style={{ fontSize: '2.2rem' }}>🌙</div>;
    return <div className="weather-icon-sun">☀️</div>;
  };

  return (
    <header className="admin-header-flex" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '3rem', 
      paddingTop: '1rem',
      width: '100%'
    }}>
      <div style={{ flex: 1 }}>
        <h1 className="greeting-text" style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--admin-text)', margin: 0 }}>
          {hour >= 18 || hour < 6 ? '🌙' : '☀️'} Good {hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'}, {currentUser.displayName || currentUser.email.split('@')[0]} !
        </h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem', margin: '0.4rem 0 0 0' }}>Welcome back to your Admin Suite.</p>
      </div>
      
      <div className="weather-card" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1.2rem', 
        background: 'var(--admin-card)', 
        padding: '0.8rem 1.5rem', 
        borderRadius: '16px', 
        border: '1px solid var(--admin-border)', 
        boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
        flexShrink: 0,
        position: 'relative'
      }}>
        <button 
          onClick={refreshWeather}
          disabled={isRefreshing}
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            background: 'var(--admin-card)',
            border: '1px solid var(--admin-border)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isRefreshing ? 'wait' : 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            zIndex: 10,
            opacity: isRefreshing ? 0.7 : 1
          }}
          title="Refresh Location"
        >
          <svg 
            className={isRefreshing ? "weather-icon-thunder" : ""} 
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: isRefreshing ? 0.5 : 1, transition: 'opacity 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', fontSize: '2.2rem' }}>
            {isRefreshing ? '📍' : renderWeatherIcon()}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', lineHeight: 1, color: 'var(--admin-text)' }}>
              {isRefreshing ? '--' : weather.temp}°C
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', textTransform: 'capitalize', marginTop: '4px' }}>
              {isRefreshing ? 'Detecting...' : `${weather.city}, ${weather.desc}`}
            </div>
          </div>
        </div>
        <div style={{ width: '1px', height: '25px', background: 'var(--admin-border)' }}></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{weather.humidity}%</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Humidity</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{weather.wind} <span style={{fontSize: '0.6rem'}}>km/h</span></div>
            <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Wind</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  // Reset Password State
  const [resetEmail, setResetEmail] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");

  // Change Password State
  const [currentPass, setCurrentPass] = useState("");
  const [changeNewPass, setChangeNewPass] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  // New Product Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Clothes");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stock, setStock] = useState("10");
  const [description, setDescription] = useState("");
  const [sizeQuantities, setSizeQuantities] = useState<{ [key: string]: string }>({});
  const [refillingProduct, setRefillingProduct] = useState<any | null>(null);
  const [refillSizes, setRefillSizes] = useState<{ [key: string]: string }>({});
  const [previousSizes, setPreviousSizes] = useState<{ [key: string]: string }>({});
  const [refillCost, setRefillCost] = useState("");
  const [refillPrice, setRefillPrice] = useState("");
  const [originalStock, setOriginalStock] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [topSellersRange, setTopSellersRange] = useState("ALL");
  const [isMounted, setIsMounted] = useState(false);
  const [printingOrders, setPrintingOrders] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState<string | null>(null); // orderId being verified
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("auto");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // POS (Point of Sale) State
  const [posProductId, setPosProductId] = useState("");
  const [posQty, setPosQty] = useState("1");
  const [posCart, setPosCart] = useState<any[]>([]);
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posCustomerPhone, setPosCustomerPhone] = useState("");
  const [posDiscount, setPosDiscount] = useState("");
  const [posAmount, setPosAmount] = useState("");
  const [isPOSProcessing, setIsPOSProcessing] = useState(false);
  const [posManualPrice, setPosManualPrice] = useState("");
  const [printingPOSData, setPrintingPOSData] = useState<any | null>(null);
  
  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    action: () => void;
    type: 'danger' | 'primary' | 'success';
  }>({
    show: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    action: () => {},
    type: 'primary'
  });

  const updateLocation = () => {
    setIsWeatherRefreshing(true);
    const fetchWeatherData = (lat: number, lon: number, cityName: string) => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
        .then(res => res.json())
        .then(data => {
          const cur = data.current;
          const codeMap: any = {
            0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
            45: "Foggy", 48: "Fog", 51: "Drizzle", 61: "Rain", 71: "Snow", 95: "Thunderstorm"
          };
          setWeather({
            temp: Math.round(cur.temperature_2m),
            desc: codeMap[cur.weather_code] || "Clear",
            humidity: cur.relative_humidity_2m,
            wind: Math.round(cur.wind_speed_10m),
            city: cityName
          });
          setIsWeatherRefreshing(false);
        })
        .catch(() => {
          setWeather({ temp: "22", desc: "Clear Sky", humidity: "40", wind: "10", city: "Lalitpur" });
          setIsWeatherRefreshing(false);
        });
    };

    const tryIPDetection = () => {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(ipData => {
          if (ipData.latitude && ipData.longitude) {
            fetchWeatherData(ipData.latitude, ipData.longitude, ipData.city || "Local Area");
          } else {
            throw new Error("IP data incomplete");
          }
        })
        .catch(() => {
          // Final fallback
          fetchWeatherData(27.6710, 85.3240, "Lalitpur");
        });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(res => res.json())
            .then(geo => {
              const city = geo.address.city || geo.address.town || geo.address.village || geo.address.suburb || "Local Area";
              fetchWeatherData(latitude, longitude, city);
            })
            .catch(() => fetchWeatherData(latitude, longitude, "Local Area"));
        },
        () => tryIPDetection(),
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      tryIPDetection();
    }
  };

  useEffect(() => {
    updateLocation();
    
    // Auto-login from localStorage
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      fetchProducts();
      fetchOrders();
      fetchExpenses();
      fetchCategories();
      if (parsed.role === 'admin' || parsed.email === 'shakya.mahes@gmail.com') fetchUsers();
    }
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem('adminThemeMode') as "light" | "dark" | "auto";
    if (savedMode) setThemeMode(savedMode);

    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    
    document.body.classList.add('admin-body');
    return () => {
      document.body.classList.remove('admin-body');
    };
  }, []);

  useEffect(() => {
    if (themeMode === "auto") {
      const hour = new Date().getHours();
      setEffectiveTheme(hour >= 18 || hour < 6 ? "dark" : "light");
    } else {
      setEffectiveTheme(themeMode);
    }
  }, [themeMode]);

  // --- POS Logic ---
  useEffect(() => {
    const cartTotal = posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    if (cartTotal === 0) {
      setPosAmount("");
      return;
    }

    if (posDiscount) {
      const discStr = posDiscount.toString().trim();
      const isPercent = discStr.endsWith("%");
      const discVal = Number(discStr.replace("%", ""));

      if (!isNaN(discVal)) {
        if (isPercent) {
          setPosAmount(Math.round(cartTotal * (1 - discVal / 100)).toString());
        } else {
          setPosAmount((cartTotal - discVal).toString());
        }
      }
    } else {
      setPosAmount(cartTotal.toString());
    }
  }, [posCart, posDiscount]);

  const handlePOSCheckout = async (e?: React.FormEvent, shouldPrint: boolean = false) => {
    if (e) e.preventDefault();
    if (posCart.length === 0 || !posAmount || !posCustomerName || !posCustomerPhone) {
      alert("Please fill all required fields and add items to cart.");
      return;
    }

    setIsPOSProcessing(true);
    try {
      // 1. Update Stock
      for (const item of posCart) {
        const product = products.find(p => p.id.toString() === item.id.toString());
        if (product) {
          if (product.stock < item.quantity) {
            alert(`Out of stock for ${product.name}!`);
            setIsPOSProcessing(false);
            return;
          }
          await fetch("/api/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              id: item.id, 
              stock: Number(product.stock) - item.quantity,
              salesCount: (Number(product.salesCount) || 0) + item.quantity
            })
          });
        }
      }

      // 2. Log Ledger Entry
      const itemStrings = posCart.map(i => `${i.name} (x${i.quantity})`);
      const pidStrings = posCart.map(i => `[PID:${i.id}]`).join(' ');
      const cartTotal = posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const discountVal = cartTotal - Number(posAmount);
      
      let finalDesc = `Offline Sale: ${itemStrings.join(", ")} ${posCustomerName} | ${posCustomerPhone} ${pidStrings}`;
      if (discountVal > 0) finalDesc += ` [DISC:${discountVal}]`;

      const ledgerRes = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          category: "Offline Sale",
          description: finalDesc,
          amount: Number(posAmount)
        })
      });

      if (ledgerRes.ok) {
        if (shouldPrint) {
          const mockOrder = {
            id: `POS-${Date.now().toString().slice(-6)}`,
            name: posCustomerName,
            phone: posCustomerPhone,
            address: "Offline Store Purchase",
            email: "N/A",
            date: new Date().toISOString(),
            status: "Completed",
            items: posCart,
            discount: discountVal,
            total: posAmount
          };
          setPrintingOrders([mockOrder]);
          setTimeout(() => {
            window.print();
            setPrintingOrders([]);
          }, 500);
        }

        alert("✅ Sale completed successfully!");
        setPosCart([]);
        setPosCustomerName("");
        setPosCustomerPhone("");
        setPosDiscount("");
        setPosAmount("");
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
      alert("Error processing sale");
    }
    setIsPOSProcessing(false);
  };

  const handlePrintIndividual = (order: any) => {
    setPrintingOrders([order]);
    setTimeout(() => {
      window.print();
      setPrintingOrders([]);
    }, 500);
  };

  const handlePrintAll = () => {
    // Filter currently showing orders that are Verified
    const verifiedOrders = orders.filter(o => o.status === 'Verified');
    if (verifiedOrders.length === 0) {
      alert("No verified orders to print.");
      return;
    }
    setPrintingOrders(verifiedOrders);
    setTimeout(() => {
      window.print();
      setPrintingOrders([]);
    }, 500);
  };

  // New User Form State
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newKey, setNewKey] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [audioStatus, setAudioStatus] = useState<'blocked' | 'ready' | 'idle'>('idle');
  const lastCheckRef = useRef(Date.now() - (24 * 60 * 60 * 1000));
  const playedSoundsRef = useRef<Set<number>>(new Set());
  const hasFetchedHistoryRef = useRef(false);
  const activeTabRef = useRef(activeTab);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundTimeRef = useRef(0);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
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

  const playSadSound = () => {
    try {
      const ctx = initAudio();
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      if (ctx.state === 'suspended') ctx.resume();
      playNote(220, now, 0.4);
      playNote(164.81, now + 0.2, 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    const ctx = initAudio();
    if (ctx.state === 'suspended') {
      setAudioStatus('blocked');
    } else {
      setAudioStatus('ready');
    }
  }, []);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Admin Heartbeat to let other tabs (Navigation) know to stay silent
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      localStorage.setItem('lyka_admin_active_ts', Date.now().toString());
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'dashboard' && currentUser) {
      fetchAllData();
    }
  }, [activeTab, currentUser]);

  // Polling Effect (Updates list only, NO SOUND - handled by Navigation)
  useEffect(() => {
    setIsMounted(true);
    if (!currentUser) return;

    const fetchHistory = async () => {
      if (hasFetchedHistoryRef.current) return;
      hasFetchedHistoryRef.current = true;
      try {
        const since = Date.now() - (24 * 60 * 60 * 1000);
        const res = await fetch(`/api/notifications?since=${since}`);
        const data = await res.json();
        const clearedAt = Number(localStorage.getItem('lyka_notifications_cleared_at') || 0);
        const filtered = data.filter((n: any) => n.timestamp > clearedAt);
        if (filtered.length > 0) {
          setNotifications(filtered.slice(0, 10));
          setUnreadCount(filtered.length > 10 ? 10 : filtered.length);
        }
      } catch (e) {}
    };
    const processNotification = (n: any) => {
      const clearedAt = Number(localStorage.getItem('lyka_notifications_cleared_at') || 0);
      if (n.timestamp <= clearedAt) return;
      
      // UI update
      setNotifications(prev => {
        if (prev.some(existing => existing.timestamp === n.timestamp)) return prev;
        return [n, ...prev].slice(0, 10);
      });
      if (n.type === 'PURCHASE') {
        setUnreadCount(prev => prev + 1);
      }

      // Audio Logic
      const nowTime = Date.now();
      const lastPlayedTs = localStorage.getItem('lyka_last_sound_ts');
      
      if (!playedSoundsRef.current.has(n.timestamp) && 
          lastPlayedTs !== n.timestamp.toString() &&
          (nowTime - lastSoundTimeRef.current > 1000)) {
        
        // Cross-tab claim jitter
        setTimeout(() => {
          const reCheckLastPlayed = localStorage.getItem('lyka_last_sound_ts');
          const reCheckClearedAt = Number(localStorage.getItem('lyka_notifications_cleared_at') || 0);
          if (reCheckLastPlayed === n.timestamp.toString() || n.timestamp <= reCheckClearedAt) return;

          const claimKey = `lyka_sound_claim_${n.timestamp}`;
          const alreadyClaimed = localStorage.getItem(claimKey);
          if (!alreadyClaimed && n.type === 'PURCHASE') {
            localStorage.setItem(claimKey, 'claimed');
            playSweetDing();
            localStorage.setItem('lyka_last_sound_ts', n.timestamp.toString());
            lastSoundTimeRef.current = Date.now();
          }
          setTimeout(() => localStorage.removeItem(claimKey), 10000);
        }, Math.random() * 500);

        playedSoundsRef.current.add(n.timestamp);
      }
    };

    fetchHistory();

    // Supabase Realtime Subscription
    const channel = supabase?.channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          console.log('Realtime notification:', payload.new);
          processNotification(payload.new);
          if (activeTabRef.current === 'dashboard') fetchAllData();
        }
      )
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'lyka_notifications_cleared_at') {
        setNotifications([]);
        setUnreadCount(0);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      setCurrentUser(data.user);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      fetchProducts();
      fetchOrders();
      fetchExpenses();
      fetchCategories();
      if (data.user.role === 'admin' || data.user.email === 'shakya.mahes@gmail.com') fetchUsers();
    } else {
      alert("Invalid credentials!");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/reset', {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail, recoveryKey: resetKey, newPassword: resetNewPass })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert("Password changed successfully! You can now log in.");
      setShowForgot(false);
      setResetEmail(""); setResetKey(""); setResetNewPass("");
    } else {
      alert("Password reset failed: " + (data.error || "Invalid details."));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeNewPass !== confirmNewPass) {
      alert("New passwords do not match!");
      return;
    }
    setIsChangingPass(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id, currentPassword: currentPass, newPassword: changeNewPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Password changed successfully!");
        setCurrentPass("");
        setChangeNewPass("");
        setConfirmNewPass("");
      } else {
        alert("Failed to change password: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while changing password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  // Content Fetchers
  const fetchAllData = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchExpenses(),
        fetchCategories(),
        fetchWishlist()
      ]);
      setLastSync(new Date());
    } catch (e) {
      console.error("Data sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchProducts = async () => {
    const res = await fetch(`/api/products?t=${Date.now()}`);
    const data = await res.json();
    setProducts(data);
  };
  const fetchOrders = async () => {
    const res = await fetch(`/api/orders?t=${Date.now()}`);
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const fetchUsers = async () => {
    const res = await fetch(`/api/users?t=${Date.now()}`);
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
  };
  const fetchCategories = async () => {
    const res = await fetch(`/api/categories?t=${Date.now()}`);
    const data = await res.json();
    if (Array.isArray(data)) setCategories(data);
  };
  const fetchExpenses = async () => {
    const res = await fetch(`/api/expenses?t=${Date.now()}`);
    const data = await res.json();
    if (Array.isArray(data)) setExpenses(data);
  };
  const fetchWishlist = async () => {
    const res = await fetch(`/api/wishlist?t=${Date.now()}`);
    const data = await res.json();
    if (Array.isArray(data)) setWishlist(data);
  };

  const handleClearWishlist = async (productId: number, size: string | null) => {
    if (!confirm("Are you sure you want to clear these requests? Only do this if you have contacted the customers or restocked the item.")) return;
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}&size=${size || 'null'}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Wishlist cleared!");
        fetchWishlist();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Failed to clear wishlist");
    }
  };

  // Handlers
  const handleVerifyOrder = async (orderId: string, action: 'VERIFY' | 'REJECT') => {
    setModalConfig({
      show: true,
      title: `${action === 'VERIFY' ? 'Verify' : 'Reject'} Order`,
      message: `Are you sure you want to ${action.toLowerCase()} order ${orderId}? This will ${action === 'VERIFY' ? 'deduct stock' : 'cancel the request'}.`,
      confirmLabel: action === 'VERIFY' ? 'Verify Payment' : 'Reject Order',
      type: action === 'VERIFY' ? 'success' : 'danger',
      action: async () => {
        setIsVerifying(orderId);
        setModalConfig(prev => ({ ...prev, show: false }));
        try {
          const res = await fetch("/api/orders/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, action })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            alert(`Order ${orderId} has been successfully ${action.toLowerCase()}ed.`);
            if (action === 'REJECT') {
              await fetch("/api/notifications", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  timestamp: Date.now(),
                  type: 'REJECT',
                  message: `Admin rejected order ${orderId}.`
                })
              });
            }
            await fetchOrders(); 
            await fetchProducts();
          } else {
            alert("Verification failed: " + (data.error || "Unknown error"));
          }
        } catch (e) {
          alert("Network error while verifying order.");
        } finally {
          setIsVerifying(null);
        }
      }
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    setModalConfig({
      show: true,
      title: 'Delete Order Record',
      message: `Are you sure you want to permanently delete order ${orderId}? This action cannot be undone.`,
      confirmLabel: 'Permanently Delete',
      type: 'danger',
      action: async () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        try {
          const res = await fetch(`/api/orders?id=${orderId}`, { method: "DELETE" });
          if (res.ok) {
            alert("Order record deleted.");
            await fetchOrders();
          } else {
            const data = await res.json();
            alert("Failed to delete order: " + (data.error || "Unknown error"));
          }
        } catch (e) {
          alert("Network error while deleting order.");
        }
      }
    });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return alert("Please select an image file first.");
    const formData = new FormData();
    formData.append('name', name); formData.append('category', category);
    formData.append('price', price); formData.append('cost', cost);
    formData.append('description', description);

    let sizesStr = "";
    let finalStock = stock;

    if (['Meat', 'Frozen'].includes(category)) {
      const validSizes = Object.entries(sizeQuantities).filter(([, qty]) => Number(qty) > 0);
      sizesStr = validSizes.map(([sz, qty]) => `${sz}:${qty}`).join(', ');
      finalStock = validSizes.reduce((sum, [, qty]) => sum + Number(qty), 0).toString();
      if (validSizes.length === 0) {
        return alert("Please enter stock for at least one size.");
      }
    }

    formData.append('stock', finalStock);
    formData.append('sizes', sizesStr);
    formData.append('image', imageFile);

    await fetch("/api/products", { method: "POST", body: formData });
    
    // Automatically settle the amount in accounting
    const totalInitialCost = Number(finalStock) * (Number(cost) || 0);
    if (totalInitialCost > 0) {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalInitialCost,
          category: "Inventory Purchase (Asset)",
          description: `Asset Investment: ${name} (${finalStock} units)`,
          date: new Date().toISOString()
        })
      }).catch(err => console.error("Settlement failed", err));
    }

    setName(""); setPrice(""); setCost(""); setImageFile(null); setStock("10");
    setDescription(""); setSizeQuantities({});
    fetchProducts();
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    const product = products.find(p => p.id === id);
    setModalConfig({
      show: true,
      title: "Delete Product",
      message: `Are you sure you want to delete "${product?.name || 'this product'}"? This action cannot be undone.`,
      confirmLabel: "Delete Product",
      type: 'danger',
      action: async () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        try {
          const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            alert("Product deleted successfully.");
            await fetchProducts();
          } else {
            const data = await res.json();
            alert("Failed to delete product: " + (data.error || "Unknown error"));
          }
        } catch (e) {
          alert("Network error while deleting product.");
        }
      }
    });
  };

  const handleUpdateStock = (product: any) => {
    setRefillingProduct(product);
    setOriginalStock(Number(product.stock) || 0);
    setRefillCost(product.cost?.toString() || "");
    setRefillPrice(product.price?.toString() || "");
    const sizes: { [key: string]: string } = {};
    if (product.sizes) {
      product.sizes.split(',').forEach((s: string) => {
        const [name, qty] = s.trim().split(':');
        if (name) sizes[name] = qty || "0";
      });
    }
    setRefillSizes(sizes);
    setPreviousSizes({ ...sizes });
  };

  const handleSaveRefill = async () => {
    if (!refillingProduct) return;
    
    let finalSizes = "";
    let finalStock = refillingProduct.stock;

    if (['Clothes', 'Shoes'].includes(refillingProduct.category)) {
      finalSizes = Object.entries(refillSizes).map(([sz, qty]) => `${sz}:${qty}`).join(', ');
      finalStock = Object.values(refillSizes).reduce((sum, qty) => sum + Number(qty || 0), 0);
    } else {
      finalStock = Number(refillingProduct.stock);
    }

    if (Math.abs(Number(finalStock) - Number(refillingProduct.stock)) > 100) {
      setModalConfig({
        show: true,
        title: "Large Stock Change",
        message: `⚠️ Large stock change detected: from ${refillingProduct.stock} to ${finalStock}. Is this correct?`,
        confirmLabel: "Yes, Update Stock",
        type: 'danger',
        action: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          performRefill(finalSizes, finalStock);
        }
      });
      return;
    }

    performRefill(finalSizes, finalStock);
  };

  const performRefill = async (finalSizes: string, finalStock: number) => {
    const res = await fetch(`/api/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id: refillingProduct.id, 
        stock: finalStock,
        sizes: finalSizes,
        cost: Number(refillCost),
        price: Number(refillPrice)
      })
    });

    if (res.ok) {
      // Automatically settle the amount in accounting if stock increased
      const stockAdded = finalStock - originalStock;
      if (stockAdded > 0) {
        const costToUse = Number(refillCost) || Number(refillingProduct.cost) || 0;
        const totalRefillCost = stockAdded * costToUse;
        if (totalRefillCost > 0) {
          await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(totalRefillCost),
              type: "EXPENSE",
              category: "Inventory Restock",
              description: `Restock: ${refillingProduct.name} (+${stockAdded} units)`,
              date: new Date().toISOString()
            })
          }).catch(err => console.error("Settlement failed", err));
        }
      }

      setRefillingProduct(null);
      fetchProducts();
      fetchExpenses();
    } else {
      alert("Failed to update stock.");
    }
  };

  const handleDeleteSubUser = async (id: string) => {
    const user = users.find(u => u.id === id);
    setModalConfig({
      show: true,
      title: "Remove Staff Member",
      message: `Are you sure you want to remove ${user?.displayName || user?.email || 'this user'}? They will lose all access to the admin suite.`,
      confirmLabel: "Remove User",
      type: 'danger',
      action: async () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) fetchUsers();
        else alert(data.error);
      }
    });
  };

  const handleAddSubUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST', headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPass, role: newRole, recoveryKey: newKey, displayName: newDisplayName })
    });
    if (res.ok) {
      alert("User added successfully!");
      setNewEmail(""); setNewPass(""); setNewRole("user"); setNewKey(""); setNewDisplayName("");
      fetchUsers();
    } else {
      const data = await res.json();
      alert("Failed: " + data.error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName })
    });
    if (res.ok) {
      setNewCategoryName("");
      fetchCategories();
    } else {
      alert("Failed to add category.");
    }
  };

  const handleUpdateMyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName) return;
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentUser.id, displayName: newDisplayName })
    });
    if (res.ok) {
      alert("Name updated successfully!");
      setCurrentUser({ ...currentUser, displayName: newDisplayName });
      setNewDisplayName("");
      fetchUsers();
    } else {
      alert("Failed to update name.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const cat = categories.find(c => c.id === id);
    setModalConfig({
      show: true,
      title: "Delete Category",
      message: `Delete the category "${cat?.name}"? Products in this category will still exist but won't have a linked category in filters.`,
      confirmLabel: "Delete Category",
      type: 'danger',
      action: async () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        try {
          const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            alert("Category deleted successfully.");
            await fetchCategories();
          } else {
            const data = await res.json();
            alert("Failed to delete category: " + (data.error || "Unknown error"));
          }
        } catch (e) {
          alert("Network error while deleting category.");
        }
      }
    });
  };

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('qrImage', file);
    const res = await fetch('/api/admin/qr', { method: 'POST', body: fd });
    if (res.ok) {
      alert("QR Code updated successfully! It is now live on the site.");
    } else {
      alert("Failed to upload QR.");
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logoImage', file);
    const res = await fetch('/api/admin/logo', { method: 'POST', body: fd });
    if (res.ok) {
      // Force refresh the page to reflect logo if they just uploaded it, or alert
      alert("Site Logo updated successfully! It is now live on the site.");
    } else {
      alert("Failed to upload the site logo.");
    }
  };

  const handleUploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('heroImage', file);
    const res = await fetch('/api/admin/hero', { method: 'POST', body: fd });
    if (res.ok) {
      alert("Hero Background updated successfully! Check the storefront to see the parallax effect.");
    } else {
      alert("Failed to upload the background.");
    }
  };

  // Render Login Layout
  if (!currentUser) {
    const toggleTheme = () => {
      let next: "light" | "dark" | "auto";
      if (themeMode === "light") next = "dark";
      else if (themeMode === "dark") next = "auto";
      else next = "light";
      setThemeMode(next);
      localStorage.setItem('adminThemeMode', next);
    };

    const themeLabel = themeMode === "light" ? "☀️ Light" : themeMode === "dark" ? "🌙 Dark" : "🕒 Auto";

    return (
      <div className={`admin-login-container ${effectiveTheme}-theme`} style={{ background: 'var(--admin-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button 
          onClick={toggleTheme}
          style={{ position: 'absolute', top: '2rem', right: '2rem', padding: '0.6rem 1.2rem', borderRadius: '50px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', cursor: 'pointer', zIndex: 10, fontWeight: 'bold' }}
        >
          {themeLabel} Mode
        </button>
        {!showForgot ? (
          <form className="admin-login-form" onSubmit={handleLogin} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ 
                background: "transparent", 
                color: "var(--admin-text)", 
                border: "1px solid var(--admin-border)",
                padding: "0.5rem 1.5rem", 
                fontWeight: "300", 
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "1.4rem", whiteSpace: "nowrap" }}>DELICIOUS MEAT SHOP</span>
              </div>
            </div>
            <h2 style={{ color: 'var(--admin-text)', fontSize: '1.6rem', fontWeight: '300', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '0', textAlign: 'center' }}>Welcome</h2>
            <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.9rem', marginTop: '-1rem' }}>Admin Access Panel</p>
            
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ borderRadius: '12px', border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--admin-text)' }} />
            <div style={{ position: 'relative' }}>
              <input type={showPass ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ borderRadius: '12px', border: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.05)', width: '100%', color: 'var(--admin-text)' }} />
              <span 
                onClick={() => setShowPass(!showPass)} 
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
              >
                {showPass ? "👁️" : "🙈"}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: 'auto', accentColor: '#ff9a9e' }} id="remember" />
              <label htmlFor="remember" style={{ cursor: 'pointer', color: 'var(--admin-text-muted)' }}>Stay logged in</label>
            </div>
            <button type="submit" style={{ background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', color: 'white', borderRadius: '12px', padding: '1.2rem', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 10px 20px rgba(255, 154, 158, 0.3)', border: 'none' }}>Login to Suite</button>
            <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowForgot(true); }} style={{ color: '#ff9a9e', fontWeight: '500' }}>Forgot Password?</a>
            </p>
          </form>
        ) : (
          <form className="admin-login-form" onSubmit={handleReset} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
            <img src="/logo.png" alt="MEAT SHOP" style={{ width: '80px', margin: '0 auto', filter: effectiveTheme === 'dark' ? 'brightness(0) invert(1)' : 'none' }} />
            <h2 style={{ fontSize: "1.5rem", color: 'var(--admin-text)', fontWeight: '300' }}>Reset Password</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--admin-text-muted)", marginBottom: "1rem", textAlign: 'center' }}>Secure key required for instant reset.</p>
            <input type="email" placeholder="Your Email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required style={{ borderRadius: '12px' }} />
            <input type="text" placeholder="Recovery Key" value={resetKey} onChange={(e) => setResetKey(e.target.value)} required style={{ borderRadius: '12px' }} />
            <input type="password" placeholder="New Password" value={resetNewPass} onChange={(e) => setResetNewPass(e.target.value)} required style={{ borderRadius: '12px' }} />
            <button type="submit" style={{ background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', color: 'white', borderRadius: '12px' }}>Reset Access</button>
            <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowForgot(false); }} style={{ color: '#ff9a9e' }}>Back to Login</a>
            </p>
          </form>
        )}
      </div>
    );
  }

  const toggleTheme = () => {
    let next: "light" | "dark" | "auto";
    if (themeMode === "light") next = "dark";
    else if (themeMode === "dark") next = "auto";
    else next = "light";
    setThemeMode(next);
    localStorage.setItem('adminThemeMode', next);
  };

  const themeLabel = themeMode === "light" ? "☀️ Light" : themeMode === "dark" ? "🌙 Dark" : "🕒 Auto";



  // Render Dashboard
  const lowStockItems = products.filter(p => typeof p.stock === 'number' && p.stock < 3);
  
  const getDynamicTopSellers = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const verifiedOrders = orders.filter(o => o.status === 'Verified' || o.status === 'Paid & Verified' || !o.status);
    
    const filteredOrders = verifiedOrders.filter(o => {
      const orderDate = new Date(o.date);
      if (topSellersRange === "TODAY") return orderDate >= startOfToday;
      if (topSellersRange === "MONTH") return orderDate >= startOfMonth;
      return true; // ALL
    });

    const itemCounts: { [key: string]: { id: string, name: string, count: number } } = {};
    
    // 1. Process Online Orders
    filteredOrders.forEach(o => {
      const orderItems = o.rawItems || o.items || [];
      if (Array.isArray(orderItems)) {
        orderItems.forEach((item: any) => {
          const id = item.id?.toString() || item.name;
          if (!itemCounts[id]) {
            itemCounts[id] = { id, name: item.name, count: 0 };
          }
          itemCounts[id].count += Number(item.quantity || 1);
        });
      }
    });

    // 2. Process Offline Sales from Expenses
    const offlineSales = expenses.filter(e => 
      e.category?.toString().toLowerCase().trim() === 'offline sale'
    );
    offlineSales.forEach(sale => {
      const saleDate = new NepaliDate(new Date(sale.date));
      const saleDateJS = new Date(sale.date);
      
      if (topSellersRange === "TODAY" && saleDateJS < startOfToday) return;
      if (topSellersRange === "MONTH") {
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (saleDateJS < currentMonthStart) return;
      }

      const pidMatches = Array.from((sale.description || "").matchAll(/\[PID:(.+?)\]/g)) as any[];
      const qtyMatches = Array.from((sale.description || "").matchAll(/\(x(\d+)\)/g)) as any[];
      
      if (pidMatches.length > 0) {
        pidMatches.forEach((match: any, index: number) => {
          const pid = match[1];
          const qty = qtyMatches[index] ? Number(qtyMatches[index][1]) : 1;
          const product = products.find(p => p.id?.toString() === pid);
          if (product) {
            const id = product.id?.toString() || product.name;
            if (!itemCounts[id]) {
              itemCounts[id] = { id, name: product.name, count: 0 };
            }
            itemCounts[id].count += qty;
          }
        });
      } else {
        // Legacy parsing for: "Offline Sale: Product Name (x2) | Customer"
        const cleanDesc = (sale.description || "").replace(/^Offline Sale:\s*/i, "").split('|')[0].trim();
        const qtyMatch = cleanDesc.match(/\(x(\d+)\)/);
        const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
        const productName = cleanDesc.split('(x')[0].trim();
        
        const product = products.find(p => p.name.toLowerCase().trim() === productName.toLowerCase().trim());
        if (product) {
          const id = product.id?.toString() || product.name;
          if (!itemCounts[id]) {
            itemCounts[id] = { id, name: product.name, count: 0 };
          }
          itemCounts[id].count += qty;
        }
      }
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const dynamicTopSellers = getDynamicTopSellers();

  if (!isMounted) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading MEAT SHOP Admin...</div>;

  const isSuperAdmin = currentUser.email === 'shakya.mahes@gmail.com';
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin' || isSuperAdmin;

  return (
    <div className={`admin-layout ${effectiveTheme}-theme`}>
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar no-print">
        <div className="sidebar-logo">MEAT SHOP ADMIN</div>
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
            </div>
            <span>Dashboard</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </div>
            <span>Orders</span>
            <div className="desktop-spacer" />
            {orders.filter(o => !o.status || o.status === 'Pending Verification').length > 0 && (
              <span className="order-badge">
                {orders.filter(o => !o.status || o.status === 'Pending Verification').length}
              </span>
            )}
          </button>

          <button 
            className={`sidebar-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M7 15h0M2 9.5h20"></path></svg>
            </div>
            <span>POS (Quick Sale)</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <span>Inventory</span>
            <div className="desktop-spacer" />
            {products.length > 0 && (
              <span className="inventory-badge" style={{ background: '#10b981', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}>
                {products.length}
              </span>
            )}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </div>
            <span>Categories</span>
          </button>
          <button 
            className="sidebar-item"
            onClick={() => window.location.href = '/admin/account'}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <span>Accounting</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <div className="sidebar-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <span>Settings</span>
          </button>
          
          {/* Theme Toggle - Now part of the main group for even spacing on mobile */}
          <button 
            className="sidebar-item theme-toggle-item" 
            onClick={toggleTheme}
          >
            {themeMode === 'light' ? (
              <><div className="sidebar-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></div><span className="theme-label-hidden">Dark Mode</span></>
            ) : themeMode === 'dark' ? (
              <><div className="sidebar-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path><circle cx="12" cy="12" r="5"></circle></svg></div><span className="theme-label-hidden">Auto Mode</span></>
            ) : (
              <><div className="sidebar-icon-wrapper"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg></div><span className="theme-label-hidden">Light Mode</span></>
            )}
          </button>
        </nav>

        {/* Footer Area - Only Logout for clean right-side placement */}
        <div className="sidebar-footer-area" style={{ marginTop: 'auto', padding: '1rem' }}>
          <button className="logout-btn" onClick={() => setCurrentUser(null)} style={{ width: '100%', marginBottom: 0 }}>Logout</button>
        </div>
      </aside>

      <main className="admin-main-content">
        <AdminHeader 
          currentUser={currentUser} 
          weather={weather} 
          themeMode={themeMode} 
          toggleTheme={toggleTheme} 
          refreshWeather={updateLocation}
          isRefreshing={isWeatherRefreshing}
        />

        <div className="tab-content">
          {activeTab === 'pos' && (
            <div className="pos-container">
              <div className="pos-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                <section className="theme-card pos-controls" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>Quick POS</h2>
                      <p style={{ color: 'var(--admin-text-muted)', margin: '0.5rem 0 0 0' }}>Meat Shop & Coldstore Terminal</p>
                    </div>
                    <button 
                      onClick={() => {
                        setPosCart([]);
                        setPosCustomerName("");
                        setPosCustomerPhone("");
                        setPosDiscount("");
                      }}
                      style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="pos-input-group" style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--admin-border)' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', color: 'var(--admin-text-muted)' }}>Product Selection</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="Qty"
                          value={posQty} 
                          onChange={(e) => setPosQty(e.target.value)} 
                          style={{ width: '100%', padding: '1rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', borderRadius: '12px', fontSize: '1rem', textAlign: 'center' }}
                        />
                        <input 
                          type="number" 
                          placeholder="Price override (Optional)"
                          value={posManualPrice} 
                          onChange={(e) => setPosManualPrice(e.target.value)} 
                          style={{ width: '100%', padding: '1rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', borderRadius: '12px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => {
                            const p = products.find(prod => prod.id.toString() === posProductId);
                            if (!p) return alert("Please select a product");
                            const finalPrice = posManualPrice ? Number(posManualPrice) : Number(p.price);
                            setPosCart([...posCart, { id: p.id, name: p.name, quantity: Number(posQty), price: finalPrice }]);
                            setPosProductId("");
                            setPosQty("1");
                            setPosManualPrice("");
                          }}
                          style={{ flex: 1, padding: '1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                        >
                          Add Item
                        </button>
                      </div>
                    </div>

                    <div className="pos-input-group" style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--admin-border)' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', color: 'var(--admin-text-muted)' }}>Customer Details</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <input 
                          type="text" 
                          placeholder="Customer Name" 
                          value={posCustomerName} 
                          onChange={e => setPosCustomerName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && posCart.length > 0) handlePOSCheckout(undefined, true); }}
                          style={{ padding: '1rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', borderRadius: '12px' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Phone Number" 
                          value={posCustomerPhone} 
                          onChange={e => setPosCustomerPhone(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && posCart.length > 0) handlePOSCheckout(undefined, true); }}
                          style={{ padding: '1rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', borderRadius: '12px' }}
                        />
                      </div>
                    </div>
                </section>

                <section className="theme-card pos-summary" style={{ padding: '2.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', background: 'var(--admin-card)', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                  <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Checkout List</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{posCart.length} items in cart</span>
                  </div>
                  
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '2rem', minHeight: '200px' }}>
                    {posCart.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', marginTop: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
                        <p>No items added yet</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {posCart.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(0,0,0,0.01)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--admin-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '1rem' }}>{item.name}</strong>
                              <button 
                                onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                &times;
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 'bold', opacity: 0.6 }}>QUANTITY</label>
                                <input 
                                  type="number"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newCart = [...posCart];
                                    newCart[idx].quantity = Number(e.target.value);
                                    setPosCart(newCart);
                                  }}
                                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)', fontSize: '0.9rem' }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 'bold', opacity: 0.6 }}>PRICE (NPR)</label>
                                <input 
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => {
                                    const newCart = [...posCart];
                                    newCart[idx].price = Number(e.target.value);
                                    setPosCart(newCart);
                                  }}
                                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)', fontSize: '0.9rem' }}
                                />
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: '900', color: 'var(--primary)', fontSize: '1.1rem' }}>
                              NPR {(item.quantity * item.price).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)' }}>
                      <span>Subtotal</span>
                      <span>NPR {posCart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.9rem' }}>Discount</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 500 or 10%" 
                        value={posDiscount} 
                        onChange={e => setPosDiscount(e.target.value)}
                        style={{ width: '100px', padding: '0.4rem', textAlign: 'right', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', borderRadius: '6px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.8rem', fontWeight: '900', borderTop: '2px solid var(--admin-border)', paddingTop: '1.5rem', marginTop: '0.5rem', color: '#10b981' }}>
                      <span>Total</span>
                      <span>NPR {Number(posAmount).toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <button 
                        onClick={() => handlePOSCheckout(undefined, false)}
                        disabled={isPOSProcessing || posCart.length === 0}
                        style={{ padding: '1.2rem', background: 'var(--admin-card)', border: '2px solid black', color: 'black', borderRadius: '16px', fontWeight: '800', cursor: 'pointer', opacity: (isPOSProcessing || posCart.length === 0) ? 0.5 : 1 }}
                      >
                        Sale Only
                      </button>
                      <button 
                        onClick={() => handlePOSCheckout(undefined, true)}
                        disabled={isPOSProcessing || posCart.length === 0}
                        style={{ padding: '1.2rem', background: 'black', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 25px rgba(0,0,0,0.2)', opacity: (isPOSProcessing || posCart.length === 0) ? 0.5 : 1 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Bill
                      </button>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', textAlign: 'center', margin: '0.5rem 0 0 0' }}>Tip: Press Enter in Phone field to Checkout & Print</p>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              {/* Live Notifications Ticker Hidden for cleaner UI */}


              {/* Analytics Dashboard */}
              <div id="analytics-section" style={{ scrollMarginTop: '100px' }}>
                <AnalyticsSection 
                  orders={orders} 
                  products={products} 
                  expenses={expenses} 
                  lastSync={lastSync}
                  isSyncing={isSyncing}
                />
              </div>

              {/* Low Stock Alerts */}
              {lowStockItems.length > 0 && (
                <div id="low-stock-section" style={{ marginBottom: "3rem", background: "rgba(239, 68, 68, 0.05)", padding: "2rem", borderRadius: "16px", border: "1px solid #fca5a5", scrollMarginTop: '100px' }}>
                  <h3 style={{ color: "#b91c1c", marginBottom: "1rem", display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ Low Stock Alerts
                    <span style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '50px' }}>{lowStockItems.length} items</span>
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                    {lowStockItems.map(p => (
                      <div key={p.id} style={{ background: "var(--admin-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--admin-border)", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: "bold", margin: 0, fontSize: '0.9rem' }}>{p.name}</p>
                          <p style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 'bold', margin: 0 }}>Only {p.stock} left!</p>
                        </div>
                        <button onClick={() => { setActiveTab('inventory'); handleUpdateStock(p); }} style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', background: 'var(--admin-sidebar)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Refill</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div id="top-sellers-section" style={{ marginBottom: "3rem", scrollMarginTop: '100px' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h2>Top Selling Items</h2>
                  <select
                    value={topSellersRange}
                    onChange={e => setTopSellersRange(e.target.value)}
                    style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "inherit" }}
                  >
                    <option value="ALL">All Time</option>
                    <option value="MONTH">This Month</option>
                    <option value="TODAY">Today</option>
                  </select>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
                  {dynamicTopSellers.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No sales recorded for this period.</p>
                  ) : (
                    dynamicTopSellers.map((item, index) => (
                      <div key={item.id} className="theme-card" style={{ background: "var(--admin-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--admin-border)", display: "flex", alignItems: "center", gap: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                        <div style={{ 
                          fontSize: "1.8rem", 
                          fontWeight: "900", 
                          color: index === 0 ? "#fbbf24" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "var(--admin-text-muted)",
                          width: '40px'
                        }}>
                          #{index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "700" }}>{item.name}</h4>
                          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--admin-text-muted)" }}>
                            <span style={{ color: '#6366f1', fontWeight: 'bold' }}>{item.count}</span> units sold
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Wishlist Dashboard */}
              <div id="wishlist-section" style={{ marginBottom: "3rem", scrollMarginTop: '100px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  Most Wanted (Restock Wishlist)
                  <span style={{ fontSize: '0.8rem', background: 'var(--primary)', color: 'white', padding: '2px 10px', borderRadius: '50px' }}>Demand</span>
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
                   {Object.values(wishlist.reduce((acc: any, item: any) => {
                    const pid = item.product_id;
                    const size = item.selected_size;
                    const key = `${pid}-${size || 'none'}`;
                    if (!acc[key]) acc[key] = { id: pid, name: item.products?.name || 'Unknown Product', size, count: 0, phones: [] };
                    acc[key].count++;
                    acc[key].phones.push(item.customer_phone);
                    return acc;
                  }, {})).sort((a: any, b: any) => b.count - a.count).map((item: any, i) => (
                    <div key={i} className="theme-card" style={{ background: "var(--admin-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--admin-border)", boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h4>
                          {item.size && <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 'bold' }}>Size: {item.size}</span>}
                        </div>
                        <span style={{ background: '#4f46e5', color: 'white', padding: '4px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          {item.count} waiting
                        </span>
                      </div>
                      <div style={{ maxHeight: '100px', overflowY: 'auto', borderTop: '1px solid var(--admin-border)', paddingTop: '0.8rem' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer Phones:</p>
                        {item.phones.map((phone: string, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <a href={`tel:${phone}`} style={{ color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none' }}>📞 {phone}</a>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => handleClearWishlist(item.id, item.size)}
                        style={{ 
                          marginTop: '1rem', 
                          width: '100%', 
                          padding: '0.6rem', 
                          background: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          cursor: 'pointer' 
                        }}
                      >
                        RESTOCKED & CLEAR
                      </button>
                    </div>
                  ))}
                  {wishlist.length === 0 && <p style={{ fontStyle: 'italic', opacity: 0.6 }}>No wishlist requests yet.</p>}
                </div>
              </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <div id="inventory-section" className="admin-grid" style={{ scrollMarginTop: '100px' }}>
              <section className="add-product-section">
                <h2>Add New Product</h2>
                <form className="add-product-form" onSubmit={handleAddProduct}>
                  <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  <select value={category} onChange={(e) => {
                    const cat = e.target.value;
                    setCategory(cat);
                    setSizeQuantities({});
                  }} required>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input type="number" placeholder="Sale Price (NPR)" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ flex: 1 }} />
                    <input type="number" placeholder="Your Cost (NPR)" value={cost} onChange={(e) => setCost(e.target.value)} required style={{ flex: 1 }} />
                  </div>
                  <input type="number" placeholder="Total Stock (Limit)" value={stock} onChange={(e) => setStock(e.target.value)} required />
                  <textarea placeholder="Product Description..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "4px", minHeight: "80px" }}></textarea>
                  {category === 'Meat' && (
                    <div className="theme-card" style={{ padding: "0.8rem", borderRadius: "4px" }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.2rem" }}>Portion/Weight Variants (Stock per variant):</p>
                      <p style={{ fontSize: "0.65rem", color: "#6366f1", marginBottom: "0.5rem", fontWeight: "600" }}>ℹ️ Note: System will auto-calculate price (e.g., 500gm = 50% price, 250gm = 25%)</p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {['1kg', '500gm', '250gm', 'Whole', 'Half'].map(s => (
                          <div key={s} style={{ display: "flex", flexDirection: "column", gap: "0.2rem", width: "60px" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: "600", textAlign: "center" }}>{s}</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={sizeQuantities[s] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                   setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                   return;
                                }
                                const newVal = Number(val);
                                const currentTotal = Object.entries(sizeQuantities).reduce((sum, [k, v]) => k === s ? sum : sum + Number(v || 0), 0);
                                const maxAllowed = Number(stock || 0);
                                
                                if (currentTotal + newVal <= maxAllowed) {
                                  setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                } else {
                                  const remaining = Math.max(0, maxAllowed - currentTotal);
                                  setSizeQuantities(prev => ({ ...prev, [s]: remaining.toString() }));
                                }
                              }}
                              style={{ padding: "0.4rem", textAlign: "center" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {category === 'Frozen' && (
                    <div className="theme-card" style={{ padding: "0.8rem", borderRadius: "4px" }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Packaging Units (Stock per type):</p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {['Packet', 'Box', 'Bulk Pack'].map(s => (
                          <div key={s} style={{ display: "flex", flexDirection: "column", gap: "0.2rem", width: "70px" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: "600", textAlign: "center" }}>{s}</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={sizeQuantities[s] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                   setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                   return;
                                }
                                const newVal = Number(val);
                                const currentTotal = Object.entries(sizeQuantities).reduce((sum, [k, v]) => k === s ? sum : sum + Number(v || 0), 0);
                                const maxAllowed = Number(stock || 0);
                                
                                if (currentTotal + newVal <= maxAllowed) {
                                  setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                } else {
                                  const remaining = Math.max(0, maxAllowed - currentTotal);
                                  setSizeQuantities(prev => ({ ...prev, [s]: remaining.toString() }));
                                }
                              }}
                              style={{ padding: "0.4rem", textAlign: "center" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {category === 'Dairy' && (
                    <div className="theme-card" style={{ padding: "0.8rem", borderRadius: "4px" }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.2rem" }}>Dairy Units (Stock per variant):</p>
                      <p style={{ fontSize: "0.65rem", color: "#6366f1", marginBottom: "0.5rem", fontWeight: "600" }}>ℹ️ Note: System will auto-calculate price (e.g., 500ml/gm = 50% price)</p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {['2 Litre', '1 Litre', '500ml', '1kg', '500gm'].map(s => (
                          <div key={s} style={{ display: "flex", flexDirection: "column", gap: "0.2rem", width: "65px" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: "600", textAlign: "center" }}>{s}</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={sizeQuantities[s] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                   setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                   return;
                                }
                                const newVal = Number(val);
                                const currentTotal = Object.entries(sizeQuantities).reduce((sum, [k, v]) => k === s ? sum : sum + Number(v || 0), 0);
                                const maxAllowed = Number(stock || 0);
                                
                                if (currentTotal + newVal <= maxAllowed) {
                                  setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                } else {
                                  const remaining = Math.max(0, maxAllowed - currentTotal);
                                  setSizeQuantities(prev => ({ ...prev, [s]: remaining.toString() }));
                                }
                              }}
                              style={{ padding: "0.4rem", textAlign: "center" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {category === 'Bulk' && (
                    <div className="theme-card" style={{ padding: "0.8rem", borderRadius: "4px" }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Bulk/Wholesale Units:</p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {['Tray', 'Box', '10kg', '20kg'].map(s => (
                          <div key={s} style={{ display: "flex", flexDirection: "column", gap: "0.2rem", width: "50px" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: "600", textAlign: "center" }}>{s}</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={sizeQuantities[s] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                   setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                   return;
                                }
                                const newVal = Number(val);
                                const currentTotal = Object.entries(sizeQuantities).reduce((sum, [k, v]) => k === s ? sum : sum + Number(v || 0), 0);
                                const maxAllowed = Number(stock || 0);
                                
                                if (currentTotal + newVal <= maxAllowed) {
                                  setSizeQuantities(prev => ({ ...prev, [s]: val }));
                                } else {
                                  const remaining = Math.max(0, maxAllowed - currentTotal);
                                  setSizeQuantities(prev => ({ ...prev, [s]: remaining.toString() }));
                                }
                              }}
                              style={{ padding: "0.4rem", textAlign: "center" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <label style={{ fontSize: "0.9rem", marginTop: "0.5rem", fontWeight: "bold" }}>Upload Photo:</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} required style={{ border: "none", padding: "0" }} />
                  <button type="submit" style={{ marginTop: "1rem" }}>Add Product</button>
                </form>
              </section>

              <section className="manage-products">
                <h2>Manage Inventory</h2>
                <div className="inventory-list">
                  {products.map((p) => (
                    <div key={p.id} className="inventory-item">
                      <div className="item-thumbnail" style={{ backgroundImage: `url(${p.image})` }}></div>
                      <div className="item-details">
                        <h4>{p.name}</h4>
                        <span style={{ fontSize: '0.85rem' }}>NPR {p.price} | {p.category} | Stock: {p.stock}</span>
                        {p.sizes && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>Variants: {p.sizes}</p>}
                      </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="edit-btn" onClick={() => handleUpdateStock(p)}>Refill</button>
                          <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>X</button>
                        </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'categories' && (
            <section id="categories-section" className="manage-categories-section" style={{ padding: "2.5rem", borderRadius: "8px", maxWidth: "800px", scrollMarginTop: '100px' }}>
              <h2>Manage Product Categories</h2>
              <form className="order-controls" onSubmit={handleAddCategory} style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
                <input 
                  type="text" 
                  placeholder="New Category Name (e.g. Perfume)" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)}
                  style={{ flex: 1, padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "8px" }}
                />
                <button type="submit" className="print-all-btn" style={{ padding: "0 2rem", borderRadius: '8px' }}>Add Category</button>
              </form>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                {categories.map(cat => (
                  <div key={cat.id} className="category-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderRadius: "8px" }}>
                    <span style={{ fontWeight: "700" }}>{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", fontWeight: 'bold' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'orders' && (
            <section id="orders-section" className="admin-orders" style={{ padding: "2rem", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", scrollMarginTop: '100px' }}>
              <h2>Customer Orders & Payments</h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>Review uploaded payment screenshots and verify orders to deduct inventory stock.</p>

              <div className="order-controls" style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{ flex: 1, display: "flex", gap: "1rem" }}>
                  <input
                    type="text"
                    placeholder="Search by ID, Name, or Email..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "8px" }}
                  />
                  {orderSearchTerm && (
                    <button
                      onClick={() => setOrderSearchTerm("")}
                      style={{ padding: "0.8rem 1.5rem", background: "#e5e7eb", border: "none", borderRadius: "8px", cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button 
                  className="print-all-btn"
                  onClick={handlePrintAll}
                  style={{ padding: "0.8rem 1.5rem", background: "#6366f1", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}
                >
                  🖨️ Print All Verified
                </button>
              </div>

              {orders.length === 0 ? (
                <p>No orders yet.</p>
              ) : (
                <div className="order-queue">
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {orders
                      .filter(order => {
                        const s = orderSearchTerm.toLowerCase();
                        return order.id.toLowerCase().includes(s) ||
                          order.name.toLowerCase().includes(s) ||
                          order.email.toLowerCase().includes(s);
                      })
                      .map(order => (
                        <div key={order.id} className="theme-card" style={{ background: "var(--admin-card)", padding: "2rem", borderRadius: "20px", border: "1px solid var(--admin-border)", display: "flex", gap: "3rem", flexWrap: "nowrap", width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                          <div style={{ flex: "1 1 300px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                              <h3 style={{ margin: 0 }}>{order.id}</h3>
                              <span className={`status-badge ${
                                order.status === 'Verified' ? 'verified' : 
                                order.status === 'Rejected' ? 'rejected' : 'pending'
                              }`}>
                                {order.status || 'Pending Verification'}
                              </span>
                            </div>
                            <p><strong>Customer:</strong> {order.name} ({order.email})</p>
                            <p><strong>Phone:</strong> <a href={`tel:${order.phone}`} className="admin-phone-link" style={{ fontWeight: "bold", textDecoration: "underline" }}><span style={{ color: "white" }}>{order.phone || "N/A"}</span></a></p>
                            <p><strong>Address:</strong> {order.address || "N/A"}</p>
                            <p><strong>Date:</strong> {new Date(order.date).toLocaleString('en-US', { hour12: true, timeZone: 'Asia/Kathmandu' })} ({new NepaliDate(new Date(order.date)).format('DD MMMM YYYY')} BS)</p>
                            <p><strong>Total:</strong> NPR {order.total}</p>
                            
                            {order.items && (
                              <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '6px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>🛒 Ordered Items:</p>
                                <div style={{ fontSize: '0.85rem' }}>
                                  {order.rawItems ? (
                                    order.rawItems.map((item: any, idx: number) => (
                                      <div key={idx} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>• {item.name} {item.selectedSize ? `(Size: ${item.selectedSize})` : ''}</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>x{item.quantity || 1}</span>
                                      </div>
                                    ))
                                  ) : (
                                    (Array.isArray(order.items) ? order.items : []).map((name: string, idx: number) => (
                                      <div key={idx} style={{ marginBottom: '4px' }}>• {name}</div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}

                            <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                              {order.status === 'Verified' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handlePrintIndividual(order);
                                  }}
                                  style={{ padding: "0.5rem 1rem", background: "#4f46e5", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  🖨️ Print Bill
                                </button>
                              )}
                                {(!order.status || order.status === 'Pending Verification') && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isVerifying === order.id}
                                      onClick={(e) => { e.stopPropagation(); handleVerifyOrder(order.id, 'VERIFY'); }}
                                      style={{ padding: "0.5rem 1rem", background: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: isVerifying === order.id ? "not-allowed" : "pointer", fontWeight: "bold", opacity: isVerifying === order.id ? 0.7 : 1 }}
                                    >
                                      {isVerifying === order.id ? "⌛ Verifying..." : "☑ Verify Payment"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isVerifying === order.id}
                                      onClick={(e) => { e.stopPropagation(); handleVerifyOrder(order.id, 'REJECT'); }}
                                      style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: isVerifying === order.id ? "not-allowed" : "pointer", fontWeight: "bold", opacity: isVerifying === order.id ? 0.7 : 1 }}
                                    >
                                      {isVerifying === order.id ? "..." : "✕ Reject"}
                                    </button>
                                  </>
                                )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                style={{ padding: "0.5rem 1rem", background: "none", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
                              >
                                🗑 Delete Record
                              </button>
                            </div>
                          </div>

                          {order.screenshotUrl && (
                            <div style={{ flex: "0 0 450px", borderLeft: "2px solid var(--admin-border)", paddingLeft: "3rem", display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <strong style={{ marginBottom: '1rem', display: 'block', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>Payment Screenshot</strong>
                              <a href={order.screenshotUrl} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                                <img src={order.screenshotUrl} alt="Payment" style={{ width: "100%", maxHeight: "350px", objectFit: "contain", border: "1px solid var(--admin-border)", borderRadius: "12px", boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'settings' && (
            <div id="settings-section" style={{ display: "flex", gap: "2rem", flexWrap: "wrap", scrollMarginTop: '100px' }}>
              {/* My Profile - Only for Super Admin to edit, others just see info */}
              <section className="theme-card" style={{ flex: "1 1 100%", padding: "2rem", borderRadius: "8px" }}>
                <h2>My Profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Current Display Name: <strong style={{ color: 'var(--primary)' }}>{currentUser.displayName || "Not Set"}</strong></p>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Email: {currentUser.email}</p>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>Role: {isSuperAdmin ? "Super Admin" : "Administrator"}</p>
                  </div>
                  {isAdmin && (
                    <form onSubmit={handleUpdateMyName} style={{ display: 'flex', gap: '0.5rem', flex: 2 }}>
                      <input 
                        type="text" 
                        placeholder="Update My Name" 
                        value={newDisplayName} 
                        onChange={(e) => setNewDisplayName(e.target.value)} 
                        style={{ flex: 1, padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '8px' }} 
                      />
                      <button type="submit" style={{ padding: '0 1.5rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Name</button>
                    </form>
                  )}
                </div>
              </section>

              {/* Account Security Box */}
              <section className="theme-card" style={{ flex: "1 1 400px", padding: "2rem", borderRadius: "12px", border: "1px solid var(--admin-border)", marginBottom: "2rem" }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Account Security</h2>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Update your login password securely.
                </p>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input 
                    type="password" 
                    placeholder="Current Password" 
                    value={currentPass} 
                    onChange={(e) => setCurrentPass(e.target.value)} 
                    required 
                    style={{ padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} 
                  />
                  <input 
                    type="password" 
                    placeholder="New Password" 
                    value={changeNewPass} 
                    onChange={(e) => setChangeNewPass(e.target.value)} 
                    required 
                    style={{ padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} 
                  />
                  <input 
                    type="password" 
                    placeholder="Confirm New Password" 
                    value={confirmNewPass} 
                    onChange={(e) => setConfirmNewPass(e.target.value)} 
                    required 
                    style={{ padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} 
                  />
                  <button 
                    type="submit" 
                    disabled={isChangingPass}
                    style={{ 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      background: 'var(--primary)', 
                      color: 'white', 
                      border: 'none', 
                      cursor: isChangingPass ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      opacity: isChangingPass ? 0.7 : 1
                    }}
                  >
                    {isChangingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </section>

              {/* Theme Settings Box */}
              <section className="theme-card" style={{ flex: "1 1 100%", padding: "2rem", borderRadius: "12px", border: "1px solid var(--admin-border)" }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Interface Theme</h2>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Personalize how your Delicious Meat Shop Admin Suite looks.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { mode: 'light', icon: '☀️', label: 'Light' },
                    { mode: 'dark', icon: '🌙', label: 'Dark' },
                    { mode: 'auto', icon: '🕒', label: 'Auto' }
                  ].map((item) => (
                    <button 
                      key={item.mode}
                      onClick={() => {
                        const mode = item.mode as any;
                        setThemeMode(mode);
                        localStorage.setItem('adminThemeMode', mode);
                      }}
                      style={{ 
                        flex: 1, 
                        minWidth: '100px',
                        padding: '1.5rem', 
                        borderRadius: '12px', 
                        border: themeMode === item.mode ? '2px solid #ff9a9e' : '1px solid var(--admin-border)', 
                        background: themeMode === item.mode ? 'rgba(255, 154, 158, 0.05)' : 'var(--admin-card)', 
                        color: 'var(--admin-text)',
                        cursor: 'pointer', 
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.label}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Team Management - Only Admins can see and manage staff */}
              {isAdmin && (
                <section className="theme-card" style={{ flex: "1 1 400px", padding: "2rem", borderRadius: "8px" }}>
                  <h2>Staff & User Management</h2>
                  <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>Add staff accounts to help review orders.</p>
                  <form onSubmit={handleAddSubUser} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
                    <input type="text" placeholder="Full Name (e.g. Anjali Shakya)" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} required style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "4px" }} />
                    <input type="email" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "4px" }} />
                    <input type="text" placeholder="Password" value={newPass} onChange={e => setNewPass(e.target.value)} required style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "4px" }} />
                    <input type="text" placeholder="Recovery Key (Secret word to reset password)" value={newKey} onChange={e => setNewKey(e.target.value)} required style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "4px" }} />
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "4px", background: 'var(--admin-card)', color: 'var(--admin-text)' }}>
                      <option value="admin">Administrator (Full Control)</option>
                      <option value="user">Staff (Restricted)</option>
                    </select>
                    <button type="submit" style={{ padding: "0.8rem", background: "var(--foreground)", color: "white", border: "none", borderRadius: "4px" }}>Create User</button>
                  </form>
                  <div>
                    <h3>Active Accounts</h3>
                    {users
                      .filter(u => u.email !== 'shakya.mahes@gmail.com' || isSuperAdmin)
                      .map(u => (
                      <div key={u.id} style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid var(--border)" }}>
                        <span>
                          <strong style={{ display: 'block' }}>{u.displayName || "No Name Set"}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{u.email} ({u.role})</span>
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isAdmin && (
                            <button 
                              onClick={() => {
                                const newN = prompt("Enter new name for this user:", u.displayName || "");
                                if (newN !== null) {
                                  fetch('/api/users', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: u.id, displayName: newN })
                                  }).then(res => {
                                    if (res.ok) fetchUsers();
                                    else alert("Failed to update name");
                                  });
                                }
                              }} 
                              style={{ color: "white", border: "none", background: "none", cursor: "pointer", fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.8 }}
                            >
                              Edit Name
                            </button>
                          )}
                          {u.id !== currentUser.id && isAdmin && (
                            <button onClick={() => handleDeleteSubUser(u.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer", fontSize: '0.8rem', fontWeight: 'bold' }}>Remove</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Branding Assets - Only Admins can update branding */}
              {isAdmin && (
                <section style={{ flex: "1 1 400px", padding: "2rem", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <h2>Site Branding</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Update Logo</label><input type="file" onChange={handleUploadLogo} accept="image/*" /></div>
                    <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Update Payment QR</label><input type="file" onChange={handleUploadQR} accept="image/*" /></div>
                    <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold' }}>Update Hero Image</label><input type="file" onChange={handleUploadHero} accept="image/*" /></div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <footer style={{ marginTop: '4rem', padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', fontSize: '0.8rem', opacity: 0.6 }}>
          <p>&copy; {new Date().getFullYear()} Delicious Meat Shop • Fresh Cold Store</p>
          <p style={{ marginTop: '0.5rem' }}>Premium Cold Store Management</p>
        </footer>
      </main>

      <PrintableBill printingOrders={printingOrders} />

      {/* Refill Stock Modal */}
      {refillingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '16px', maxWidth: '500px', width: '100%', border: '1px solid var(--admin-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--admin-text)' }}>Refill Inventory</h2>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Update stock levels for <strong>{refillingProduct.name}</strong></p>

            {['Clothes', 'Shoes'].includes(refillingProduct.category) ? (
              <>
                <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                   Prev Total: <strong>{originalStock}</strong> → New Total: <strong>{Object.values(refillSizes).reduce((sum, qty) => sum + Number(qty || 0), 0)}</strong>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {Object.keys(refillSizes).sort().map(size => (
                    <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'center', color: 'var(--admin-text-muted)' }}>{size}</label>
                      <span style={{ fontSize: '0.65rem', color: '#ff9a9e', textAlign: 'center', marginTop: '-0.3rem' }}>Prev: {previousSizes[size] || 0}</span>
                      <input 
                        type="number" 
                        value={refillSizes[size]} 
                        onChange={(e) => setRefillSizes(prev => ({ ...prev, [size]: e.target.value }))}
                        style={{ padding: '0.8rem', textAlign: 'center', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--admin-text-muted)' }}>
                  General Stock Quantity (Prev: {originalStock})
                </label>
                <input 
                  type="number" 
                  value={refillingProduct.stock} 
                  onChange={(e) => setRefillingProduct({ ...refillingProduct, stock: Number(e.target.value) })}
                  style={{ width: '100%', padding: '1rem', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--admin-text-muted)' }}>New Unit Cost (NPR)</label>
                <input 
                  type="number" 
                  value={refillCost} 
                  onChange={(e) => setRefillCost(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--admin-text-muted)' }}>New Selling Price (NPR)</label>
                <input 
                  type="number" 
                  value={refillPrice} 
                  onChange={(e) => setRefillPrice(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'var(--admin-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setRefillingProduct(null)}
                style={{ flex: 1, padding: '1rem', borderRadius: '8px', background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRefill}
                style={{ flex: 2, padding: '1rem', borderRadius: '8px', background: 'var(--primary)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {modalConfig.show && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className={`modal-icon ${modalConfig.type}`}>
              {modalConfig.type === 'danger' ? '⚠️' : modalConfig.type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <h2>{modalConfig.title}</h2>
            <p>{modalConfig.message}</p>
            <div className="modal-actions">
              <button 
                className="modal-btn-cancel" 
                onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
              >
                Cancel
              </button>
              <button 
                className={`modal-btn-confirm ${modalConfig.type}`} 
                onClick={modalConfig.action}
              >
                {modalConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      <PrintableBill printingOrders={printingOrders} />
    </div>
  );
}

const PrintableBill = ({ printingOrders }: { printingOrders: any[] }) => {
  if (printingOrders.length === 0) return null;
  
  return (
    <div className="printable-bill light-theme" style={{ color: '#000000', background: '#ffffff' }}>
      {printingOrders.map((order) => (
        <div key={order.id} className="bill-page" style={{ color: '#000000', background: '#ffffff', padding: '20px', border: 'none' }}>
          <div className="bill-header" style={{ borderBottom: '2px solid black', paddingBottom: '0.6rem', marginBottom: '1rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.1rem 0', color: 'black' }}>DELICIOUS MEAT SHOP</h1>
            <p style={{ color: 'black', margin: 0, fontSize: '0.8rem' }}>Invoice for Order #{order.id}</p>
          </div>
          <div className="bill-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: 'black', marginBottom: '1rem' }}>
            <div style={{ color: 'black' }}>
              <p style={{ color: 'black', fontWeight: 'bold', marginBottom: '0.2rem', fontSize: '0.8rem' }}>Bill To:</p>
              <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'black', margin: '0' }}>{order.name}</p>
              <p style={{ color: 'black', margin: '0.1rem 0', fontSize: '0.8rem' }}>{order.address || "No Address Provided"}</p>
              <p style={{ color: 'black', margin: '0.1rem 0', fontSize: '0.8rem' }}>Phone: {order.phone || "N/A"}</p>
              <p style={{ color: 'black', margin: '0.1rem 0', fontSize: '0.8rem' }}>Email: {order.email || "N/A"}</p>
            </div>
            <div style={{ textAlign: 'right', color: 'black' }}>
              <p style={{ color: 'black', fontWeight: 'bold', marginBottom: '0.2rem', fontSize: '0.8rem' }}>Order Reference:</p>
              <p style={{ fontWeight: 'bold', color: 'black', margin: '0', fontSize: '0.9rem' }}>#{order.id}</p>
              <p style={{ color: 'black', fontWeight: 'bold', marginTop: '0.6rem', marginBottom: '0.2rem', fontSize: '0.8rem' }}>Order Date:</p>
              <p style={{ color: 'black', margin: '0', fontSize: '0.8rem' }}>{new Date(order.date).toLocaleString('en-US', { hour12: true, timeZone: 'Asia/Kathmandu' })} ({new NepaliDate(new Date(order.date)).format('DD MMMM YYYY')} BS)</p>
              <p style={{ color: 'black', marginTop: '0.3rem', fontSize: '0.8rem' }}><strong>Status:</strong> {order.status || 'Verified'}</p>
            </div>
          </div>
          <table className="bill-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', color: 'black' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left', color: 'black', fontSize: '0.75rem' }}>Description</th>
                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left', color: 'black', fontSize: '0.75rem' }}>Qty</th>
                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left', color: 'black', fontSize: '0.75rem' }}>Unit Price</th>
                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left', color: 'black', fontSize: '0.75rem' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(order.rawItems || order.items || []).map((item: any, i: number) => (
                <tr key={i}>
                  <td style={{ border: '1px solid black', padding: '6px', color: 'black', fontSize: '0.75rem' }}>{item.name}</td>
                  <td style={{ border: '1px solid black', padding: '6px', color: 'black', fontSize: '0.75rem' }}>{item.quantity || 1}</td>
                  <td style={{ border: '1px solid black', padding: '6px', color: 'black', fontSize: '0.75rem' }}>NPR {item.price}</td>
                  <td style={{ border: '1px solid black', padding: '6px', color: 'black', fontSize: '0.75rem' }}>NPR {Number(item.price) * Number(item.quantity || 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bill-total" style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid black' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginBottom: '8px' }}>
              Thank you for choosing Delicious Meat Shop. We appreciate your business!
            </div>
            <div style={{ fontSize: '0.8rem', color: '#000', textAlign: 'right' }}>
              Total Items: {(order.rawItems || order.items || []).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0)}
            </div>

            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', marginTop: '4px', fontSize: '0.85rem' }}>
                <span style={{ color: '#666' }}>Standard Subtotal:</span>
                <span style={{ color: '#000' }}>NPR {Number(order.total) + Number(order.discount)}</span>
              </div>
            )}
            
            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', marginTop: '2px', fontSize: '0.85rem', color: '#dc2626', fontWeight: 'bold' }}>
                <span>Discount:</span>
                <span>- NPR {order.discount}</span>
              </div>
            )}

            <div className="bill-total-amount" style={{ fontSize: '1.3rem', fontWeight: '900', color: 'black', textAlign: 'right', marginTop: '0.4rem', borderTop: order.discount > 0 ? '1px solid #eee' : 'none', paddingTop: order.discount > 0 ? '4px' : '0' }}>
              GRAND TOTAL: NPR {order.total}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
