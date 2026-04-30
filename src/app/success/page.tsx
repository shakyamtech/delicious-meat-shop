"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import NepaliDate from "nepali-date-converter";
import "../globals.css";

function ReceiptContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const total = searchParams.get("total");
  const notificationTs = searchParams.get("nt");
  const isPending = searchParams.get("status") === "pending";

  const [dateStr, setDateStr] = useState("");
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasPlayedRef = useRef(false);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playSweetDing = () => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    try {
      // Claim the sound globally so Navigation.tsx doesn't play it
      if (notificationTs) {
        localStorage.setItem(`lyka_sound_claim_${notificationTs}`, 'claimed');
        localStorage.setItem('lyka_last_sound_ts', notificationTs);
      }

      const ctx = initAudio();
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Lower gain to avoid distortion (0.3 instead of 1)
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
    const adDate = new Date();
    setDateStr(`${adDate.toLocaleString('en-US', { hour12: true, timeZone: 'Asia/Kathmandu' })} (${new NepaliDate(adDate).format('DD MMMM YYYY')} BS)`);
    if (orderId) {
      fetch(`/api/orders/check?id=${orderId}`)
        .then(res => res.json())
        .then(data => {
          setOrderData(data);
          playSweetDing();
        })
        .catch(() => playSweetDing());
    } else {
      playSweetDing();
    }
  }, [orderId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPending && liveStatus !== 'Verified' && liveStatus !== 'Rejected' && orderId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/check?id=${orderId}`);
          if (res.ok) {
            const data = await res.json();
            setOrderData(data);
            if (data.status === 'Verified' || data.status === 'Rejected') {
              setLiveStatus(data.status);
            }
          }
        } catch (e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPending, liveStatus, orderId]);

  let displayStatus = liveStatus;
  if (!displayStatus) {
    displayStatus = isPending ? "Pending Verification" : (orderData?.status || "Verified");
  }

  return (
    <div className="container receipt-container" style={{ textAlign: "center", padding: "5rem 2rem", minHeight: "80vh" }}>
      {displayStatus === 'Rejected' ? (
        <>
          <h1 className="no-print" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1rem" }}>
            Payment Rejected
          </h1>
          <p style={{ fontSize: "1.2rem", marginBottom: "2rem", color: "#ef4444" }}>
            Unfortunately, we could not verify your payment screenshot. Your order has not been completed. Please contact customer support.
          </p>
        </>
      ) : (
        <>
          <h1 className="no-print" style={{ fontSize: "2.5rem", color: "#16a34a", marginBottom: "1rem" }}>
            {displayStatus === 'Pending Verification' ? "Order Received!" : "Payment Successful!"}
          </h1>
          <p style={{ fontSize: "1.1rem", marginBottom: "2rem", color: "var(--text-muted)" }}>
            {displayStatus === 'Pending Verification' 
              ? "Your payment is currently being reviewed by our team. Please wait."
              : "Thank you for trusting us! We will call you quickly to confirm shipping details."}
          </p>
        </>
      )}

      <h1 className="only-print" style={{ display: "none", fontSize: "2rem", marginBottom: "1rem" }}>LYKA Nepal Receipt</h1>
      
      <div className="receipt-box" style={{ background: "#f9fafb", border: "1px solid #e2e8f0", padding: "2rem", borderRadius: "8px", display: "inline-block", textAlign: "left", marginBottom: "3rem", minWidth: "400px" }}>
        <h3 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem", marginBottom: "1rem" }}>Order summary</h3>
        <p><strong>Order ID:</strong> {orderId || "TEST-ORDER-123"}</p>
        <p><strong>Date:</strong> {dateStr}</p>
        <p><strong>Total:</strong> NPR {total || "0"}</p>
        <p><strong>Status:</strong> <span style={{ color: displayStatus === 'Rejected' ? '#ef4444' : displayStatus === 'Verified' ? '#16a34a' : '#b45309', fontWeight: 'bold' }}>{displayStatus === 'Verified' || displayStatus === 'Paid & Verified' ? "Paid & Verified" : displayStatus}</span></p>
        
        {orderData?.items && (
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "0.5rem" }}>Items Bought:</p>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {(orderData.items as any[]).map((item, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", fontSize: "0.9rem" }}>
                  <span>{item.name} {item.selectedSize ? `(${item.selectedSize})` : ""}</span>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: "0.75rem", color: "#666", fontStyle: "italic", marginTop: "1rem" }}>
              Something not right? Visit our <Link href={`/request-return?orderId=${orderId}`} style={{ color: "#2563eb", textDecoration: "underline" }}>Returns & Exchanges</Link> page.
            </p>
          </div>
        )}
        <br/>
        <p style={{ fontSize: "0.85rem", color: "#666", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>LYKA Nepal - Imadole, Lalitpur<br/>shop@lykanepal.com | +977 1234567890</p>
      </div>

      <br />
      <div className="no-print" style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button onClick={() => window.print()} style={{ padding: "1rem 2rem", background: "var(--foreground)", color: "white", borderRadius: "4px", fontWeight: "bold", border: "none", cursor: "pointer" }}>
          Download Receipt (PDF)
        </button>
        <Link href="/" style={{ padding: "1rem 2rem", background: "var(--primary)", color: "white", borderRadius: "4px", fontWeight: "bold" }}>
          Return to Shop
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "10rem" }}>Loading receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
