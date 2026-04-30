"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NepaliDate from "nepali-date-converter";
import "../admin.css";

export default function AccountDashboard() {
  const [activeTab, setActiveTab] = useState("DAYBOOK");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "auto">("auto");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");
  const [printingOrders, setPrintingOrders] = useState<any[]>([]);

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

  const handlePrintOffline = (e: any) => {
    // Parse ALL products from description: "Item A (x1), Item B (x2) Name | Phone [PID:41] [PID:42]"
    const pidMatches = Array.from(e.description.matchAll(/\[PID:(\d+)\]/g)) as any[];
    const qtyMatches = Array.from(e.description.matchAll(/\(x(\d*\.?\d+)\)/g)) as any[];
    const discMatch = e.description.match(/\[DISC:(\d+)\]/);
    const discount = discMatch ? Number(discMatch[1]) : 0;
    
    let items: any[] = [];
    
    if (pidMatches.length > 0) {
      pidMatches.forEach((match: any, index: number) => {
        const pid = match[1];
        const qty = qtyMatches[index] ? parseFloat(qtyMatches[index][1]) : 1;
        const product = products.find(p => p.id.toString() === pid);
        if (product) {
          items.push({
            name: product.name,
            quantity: qty,
            price: product.price
          });
        }
      });
    } else {
      // Fallback for single item legacy format
      const qtyMatch = e.description.match(/\(x(\d*\.?\d+)\)/);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
      const cleanDesc = e.description.replace(/^Offline Sale:\s*/i, '').split('[PID:')[0].trim();
      const legacyItemName = cleanDesc.split('|')[0].split('(x')[0].trim();
      
      items.push({
        name: legacyItemName || "Product",
        quantity: qty,
        price: (Number(e.amount) + discount) / qty
      });
    }
    
    // Improved Parsing: Extract customer name from multi-item description
    let customerName = "Walk-in Customer";
    const cleanDescForName = e.description.replace(/^Offline Sale:\s*/i, '').split('[PID:')[0].trim();
    const beforePipe = cleanDescForName.split('|')[0].trim();
    
    const lastBracketIdx = beforePipe.lastIndexOf(')');
    if (lastBracketIdx !== -1) {
        const potentialName = beforePipe.substring(lastBracketIdx + 1).trim();
        if (potentialName) customerName = potentialName;
    } else {
        // Fallback for legacy
        const firstPid = pidMatches[0] ? pidMatches[0][1] : null;
        const firstProd = firstPid ? products.find(p => p.id.toString() === firstPid) : null;
        let descPart = beforePipe.split('(x')[0].trim();
        if (firstProd && descPart.toLowerCase().startsWith(firstProd.name.toLowerCase())) {
            customerName = descPart.substring(firstProd.name.length).trim() || "Walk-in Customer";
        } else if (descPart) {
            customerName = descPart;
        }
    }
    
    const simulatedOrder = {
      id: `ACC-${e.id.toString().substring(0, 8)}`,
      name: customerName,
      address: "In-Store Purchase",
      phone: "9851180556", // Shop contact
      email: "lykanepal@gmail.com",
      date: e.date,
      status: "PAID (OFFLINE)",
      total: e.amount,
      discount: discount, // Added discount field
      rawItems: items
    };

    setPrintingOrders([simulatedOrder]);
    setTimeout(() => {
      window.print();
      setPrintingOrders([]);
    }, 500);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      // Allow Admin, Super Admin, and Staff to enter. 
      // User role is restricted if they are not staff/admin.
      if (u.role === 'admin' || u.role === 'superadmin' || u.role === 'staff' || u.role === 'user' || u.email === 'shakya.mahes@gmail.com') {
        setCurrentUser(u);
        setIsAuthChecking(false);
      } else {
        alert("Access Denied: You do not have permission to view the Accounting Suite.");
        router.push("/admin");
      }
    } else {
      router.push("/admin");
    }

    const savedMode = localStorage.getItem('adminThemeMode') as "light" | "dark" | "auto";
    if (savedMode) setThemeMode(savedMode);
  }, [router]);

  useEffect(() => {
    if (themeMode === "auto") {
      const hour = new Date().getHours();
      setEffectiveTheme(hour >= 18 || hour < 6 ? "dark" : "light");
    } else {
      setEffectiveTheme(themeMode);
    }
  }, [themeMode]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.email === 'shakya.mahes@gmail.com';

  const [expType, setExpType] = useState("INCOME");
  const [expCategory, setExpCategory] = useState("Offline Sale");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDiscount, setExpDiscount] = useState("");
  const [expDiscountType, setExpDiscountType] = useState<"NPR" | "%">("NPR");
  const [offlineProductId, setOfflineProductId] = useState("");
  const [offlineQty, setOfflineQty] = useState("1");
  const [offlineCustomerName, setOfflineCustomerName] = useState("");
  const [offlineCustomerPhone, setOfflineCustomerPhone] = useState("");
  const [offlineCart, setOfflineCart] = useState<any[]>([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesTypeFilter, setSalesTypeFilter] = useState("ALL");
  const [shouldUpdateStock, setShouldUpdateStock] = useState(true);

  // Edit Expense State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpType, setEditExpType] = useState("EXPENSE");
  const [editExpCategory, setEditExpCategory] = useState("");
  const [editExpDesc, setEditExpDesc] = useState("");
  const [editExpAmount, setEditExpAmount] = useState("");

  // Returns Form State
  const [retProductId, setRetProductId] = useState("");
  const [retQty, setRetQty] = useState("1");
  const [retAmount, setRetAmount] = useState("");
  const [retNote, setRetNote] = useState("");
  const [retLoading, setRetLoading] = useState(false);
  const [cleanupPhone, setCleanupPhone] = useState("");
  const [approvingReqId, setApprovingReqId] = useState<string | null>(null);
  const [tempRefundAmt, setTempRefundAmt] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync Final Amount based on Discount
  useEffect(() => {
    if (expCategory !== "Offline Sale") return;
    const cartTotal = offlineCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    if (cartTotal === 0) return;

    if (expDiscount) {
      const discStr = expDiscount.toString().trim();
      const isPercent = discStr.endsWith("%");
      const discVal = Number(discStr.replace("%", ""));

      if (isNaN(discVal)) return;

      if (isPercent) {
        const calculatedAmount = cartTotal * (1 - discVal / 100);
        setExpAmount(Math.round(calculatedAmount).toString());
      } else {
        const calculatedAmount = cartTotal - discVal;
        setExpAmount(calculatedAmount.toString());
      }
    } else if (!expAmount || expAmount === "0") {
      setExpAmount(cartTotal.toString());
    }
  }, [expDiscount, expDiscountType, offlineCart, expCategory]);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resO, resP, resE] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/products"),
        fetch("/api/expenses")
      ]);
      if (resO.ok) setOrders((await resO.json()).filter((o: any) => o.status === "Verified" || o.status === "Paid & Verified" || !o.status));
      if (resP.ok) setProducts(await resP.json());
      if (resE.ok) setExpenses(await resE.json());
      const resR = await fetch("/api/returns");
      if (resR.ok) setReturnRequests(await resR.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retProductId || !retAmount) return;
    setRetLoading(true);
    try {
      const product = products.find((p: any) => p.id.toString() === retProductId);
      if (!product) { alert("Product not found"); setRetLoading(false); return; }
      const qtyNum = Number(retQty);
      if (qtyNum > 50) return alert("❌ Error: Return quantity cannot exceed 50. For larger adjustments, please use the Stock Refill tool.");
      
      const performReturn = async () => {
        setRetLoading(true);
        try {
          const newStock = Number(product.stock) + qtyNum;
          // 1. Restock the product
          const stockRes = await fetch("/api/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: retProductId, stock: newStock })
          });
          if (!stockRes.ok) throw new Error("Failed to restock product");

          // 2. Log refund as expense in ledger
          const ledgerRes = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "EXPENSE",
              category: "Refund Paid",
              description: `Customer Return: ${product.name} x${retQty}${retNote ? ` — ${retNote}` : ""}${cleanupPhone ? ` (Order Cleaned: ${cleanupPhone})` : ""}`,
              amount: Number(retAmount)
            })
          });
          if (!ledgerRes.ok) throw new Error("Failed to log refund");

          // 3. OPTIONAL CLEANUP: Delete order for this phone
          if (cleanupPhone) {
            const matchingOrder = orders.find((o: any) =>
              o.phone === cleanupPhone ||
              o.customer_phone === cleanupPhone
            );
            if (matchingOrder) {
              await fetch(`/api/orders?id=${matchingOrder.id}`, { method: "DELETE" });
            }
          }

          alert(`✅ Done! ${product.name} restocked (+${retQty} units) and Rs. ${retAmount} logged as Refund Expense.${cleanupPhone ? " Customer history cleaned." : ""}`);
          setRetProductId(""); setRetQty("1"); setRetAmount(""); setRetNote(""); setCleanupPhone("");
          fetchData();
        } catch (err: any) {
          alert("Error: " + err.message);
        }
        setRetLoading(false);
      };

      if (qtyNum > 10) {
        setModalConfig({
          show: true,
          title: "Bulk Return Warning",
          message: `⚠️ You are returning ${qtyNum} units. Are you sure this is correct?`,
          confirmLabel: "Yes, Confirm Return",
          type: 'danger',
          action: () => {
            setModalConfig(prev => ({ ...prev, show: false }));
            performReturn();
          }
        });
        return;
      }
      
      performReturn();
      return;
    } catch (err: any) {
      alert("Error: " + err.message);
      setRetLoading(false);
    }
  };

  const handleApproveReturn = async (req: any) => {
    const refundAmt = Number(tempRefundAmt);
    if (!refundAmt || isNaN(refundAmt)) {
      alert("Please enter a valid refund amount.");
      return;
    }
    if (refundAmt > 100000) return alert("❌ Error: Refund amount seems too high (limit Rs. 100,000 for safety).");
    setRetLoading(true);
    try {
      // Find the product and restock
      const product = products.find((p: any) =>
        p.id.toString() === req.product_id ||
        p.name.toLowerCase().trim() === req.product_name.toLowerCase().trim()
      );
      if (product) {
        const newStock = Number(product.stock) + Number(req.quantity);
        await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: product.id, stock: newStock })
        });
      }
      // Log refund expense
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE", category: "Refund Paid",
          description: `Return approved: ${req.product_name} x${req.quantity} — ${req.customer_name} (${req.customer_phone})`,
          amount: refundAmt
        })
      });
      // Mark request as approved
      await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req.id, status: "APPROVED" })
      });

      // UPDATE ORDER HISTORY: Mark as returned instead of deleting
      if (req.customer_phone) {
        const matchingOrder = orders.find((o: any) =>
          o.phone === req.customer_phone ||
          (o.customer_phone === req.customer_phone)
        );
        if (matchingOrder) {
          console.log("Updating order to returned:", matchingOrder.id);
          await fetch(`/api/orders`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: matchingOrder.id, status: "Returned" })
          });
        }
      }

      alert(`✅ Approved! ${product ? `Stock updated.` : `(Product not matched — check manually.)`} Rs. ${refundAmt} logged as Refund Expense and order marked as Returned.`);
      setApprovingReqId(null);
      setTempRefundAmt("");
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setRetLoading(false);
  };

  const handleRejectReturn = async (id: string) => {
    setModalConfig({
      show: true,
      title: "Reject Return Request",
      message: "Are you sure you want to reject this return request?",
      confirmLabel: "Reject Request",
      type: 'danger',
      action: async () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        const res = await fetch("/api/returns", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "REJECTED" })
        });
        if (res.ok) {
          await fetch("/api/notifications", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp: Date.now(),
              type: 'REJECT',
              message: `Return request ${id} was rejected.`
            })
          });
        }
        fetchData();
      }
    });
  };

  // Update expAmount when cart changes
  useEffect(() => {
    if (offlineCart.length > 0) {
      const total = offlineCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      setExpAmount(total.toString());
    }
  }, [offlineCart]);

  // Auto-detect customer name from phone number
  useEffect(() => {
    if (offlineCustomerPhone.length >= 10 && !offlineCustomerName) {
      // 1. Search in Web Orders
      const existingOrder = orders.find(o => o.phone === offlineCustomerPhone || o.customer_phone === offlineCustomerPhone);
      if (existingOrder) {
        setOfflineCustomerName(existingOrder.name || existingOrder.customerName || "");
        return;
      }

      // 2. Search in Offline Sales (parsed from description)
      const existingExpense = expenses.find(e => 
        e.category === "Offline Sale" && 
        e.description.includes(`| ${offlineCustomerPhone}`)
      );
      if (existingExpense) {
        // Extract name: "Offline Sale: Product Name Name | Phone"
        const parts = existingExpense.description.split('|')[0].trim().split('(x')[0].trim();
        // This is still a bit fuzzy, but let's try to get the part after the product name
        // Better yet, just use the same parsing logic we use for the report
        const pidMatch = existingExpense.description.match(/\[PID:(.+?)\]/);
        let pName = "";
        if (pidMatch) {
          const prod = products.find(p => p.id.toString() === pidMatch[1]);
          if (prod) pName = prod.name;
        }
        
        const descPart = parts.replace(/^Offline Sale:\s*/i, '').trim();
        if (pName && descPart.startsWith(pName)) {
          const foundName = descPart.substring(pName.length).trim();
          if (foundName) setOfflineCustomerName(foundName);
        } else {
          setOfflineCustomerName(descPart);
        }
      }
    }
  }, [offlineCustomerPhone, orders, expenses, products, offlineCustomerName]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount) return;
    
    // If it's an offline sale with a cart, we use the cart. 
    // If it's a single product selected, we use that.
    let itemsToProcess = [...offlineCart];
    if (itemsToProcess.length === 0 && offlineProductId) {
      const p = products.find((p: any) => p.id.toString() === offlineProductId);
      if (p) {
        itemsToProcess.push({
          id: offlineProductId,
          name: p.name,
          quantity: Number(offlineQty),
          price: Number(p.price),
          cost: Number(p.cost || 0)
        });
      }
    }

    if ((expCategory === "Offline Sale" || expCategory === "Refund Paid" || expCategory === "Inventory Damage / Loss") && itemsToProcess.length === 0) {
       alert("Please add at least one product.");
       return;
    }

    // MANDATORY: Customer Name and Phone for Offline Sales
    if (expCategory === "Offline Sale") {
      if (!offlineCustomerName.trim() || !offlineCustomerPhone.trim()) {
        alert("⚠️ Please enter both Customer Name and Phone Number before saving.");
        return;
      }
      if (offlineCustomerPhone.trim().length < 10) {
        alert("⚠️ Please enter a valid 10-digit phone number.");
        return;
      }
    }

    try {
      // 1. Update Stock for ALL items
      for (const item of itemsToProcess) {
        const product = products.find((p: any) => p.id.toString() === item.id.toString());
        if (product) {
          let newStock = Number(product.stock);
          if (expCategory === "Offline Sale" || expCategory === "Inventory Damage / Loss") {
            if (product.stock < item.quantity) {
              alert(`⚠️ Out of Stock for ${product.name}! Only ${product.stock} units remaining.`);
              return;
            }
            newStock = parseFloat((newStock - item.quantity).toFixed(2));
          } else if (expCategory === "Refund Paid" && shouldUpdateStock) {
            newStock += item.quantity;
          }

          if (shouldUpdateStock || expCategory === "Offline Sale" || expCategory === "Inventory Damage / Loss") {
            const updateBody: any = { id: item.id, stock: newStock };
            if (expCategory === "Offline Sale") {
              updateBody.salesCount = parseFloat(((Number(product.salesCount) || 0) + item.quantity).toFixed(2));
            }

            const stockRes = await fetch("/api/products", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updateBody)
            });
            if (!stockRes.ok) throw new Error(`Failed to update stock for ${product.name}`);
          }
        }
      }

      // 2. Construct Description & Amount
      let finalDesc = expDesc;
      let totalAmount = Number(expAmount);

      if (itemsToProcess.length > 0) {
        // Multi-item description format: "Product A (x1), Product B (x2) Customer Name | Phone [PIDs:1,2]"
        const itemStrings = itemsToProcess.map(i => `${i.name} (x${i.quantity})`);
        const pidStrings = itemsToProcess.map(i => `[PID:${i.id}]`).join(' ');
        
        const customerPart = [offlineCustomerName, offlineCustomerPhone ? `| ${offlineCustomerPhone}` : ""].filter(Boolean).join(" ");
        finalDesc = `${itemStrings.join(", ")} ${customerPart} ${pidStrings}`.trim();
        
        const cartTotal = itemsToProcess.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        
        // Priority logic for totalAmount and discount
        let finalDiscount = 0;
        const discStr = expDiscount.toString().trim();
        const isPercent = discStr.endsWith("%");
        const discVal = Number(discStr.replace("%", ""));
        
        if (!isNaN(discVal)) {
          if (isPercent) finalDiscount = Math.round(cartTotal * (discVal / 100));
          else finalDiscount = discVal;
        }

        let finalTotalAmount = Number(expAmount);

        if (finalDiscount > 0 && !expAmount) {
            // Case: User entered discount but no final amount
            finalTotalAmount = cartTotal - finalDiscount;
        } else if (expAmount && Number(expAmount) < cartTotal && finalDiscount === 0) {
            // Case: User entered final amount (bargain) but no explicit discount
            finalDiscount = cartTotal - Number(expAmount);
        }

        totalAmount = finalTotalAmount || cartTotal;
        
        // Track Discount in description
        if (finalDiscount > 0) {
            finalDesc += ` [DISC:${finalDiscount}]`;
        }
        
        // Ensure "Offline Sale: " prefix for income categories
        if (expCategory === "Offline Sale") finalDesc = `Offline Sale: ${finalDesc}`;
      } else {
        // Fallback for non-product entries
        if (expCategory === "Offline Sale" && offlineCustomerName) {
          finalDesc = `${expDesc} ${offlineCustomerName}`.trim();
        }
        if (expCategory === "Offline Sale" && offlineCustomerPhone) {
          finalDesc = `${finalDesc} | ${offlineCustomerPhone}`;
        }
      }

      // 3. Log Entry
      const entryPayload: any = { 
        category: expCategory, 
        description: finalDesc,
        amount: totalAmount 
      };
      if (expType) entryPayload.type = expType;

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryPayload)
      });

      // 4. Cleanup Order History (Optional for Refunds)
      if (expCategory === "Refund Paid" && cleanupPhone) {
        try {
          const searchRes = await fetch(`/api/expenses?phone=${cleanupPhone}`);
          const matchingExpenses = await searchRes.json();
          const incomeToDel = matchingExpenses.find((ex: any) => 
            ex.type === 'INCOME' && 
            (ex.category === 'Offline Sale' || ex.category === 'Misc Income')
          );
          if (incomeToDel) {
            await fetch(`/api/expenses?id=${incomeToDel.id}`, { method: 'DELETE' });
          }
        } catch (err) {
          console.error("Cleanup failed:", err);
        }
      }

      if (res.ok) {
        setExpDesc(""); setExpAmount(""); setExpDiscount(""); setOfflineProductId(""); setOfflineQty("1"); 
        setOfflineCustomerName(""); setOfflineCustomerPhone(""); setOfflineCart([]); setShouldUpdateStock(true);
        setCleanupPhone("");
        fetchData();
        alert("Entry added & Stock updated!");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding entry");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    setModalConfig({
      show: true,
      title: "Delete Ledger Entry",
      message: `Are you sure you want to delete this ${(expense.type || "entry").toLowerCase()}? This will also automatically REVERSE any stock changes associated with this entry.`,
      confirmLabel: "Delete & Reverse Stock",
      type: 'danger',
      action: async () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        try {
          // 1. Check for products to reverse stock
          const pidMatches = Array.from((expense.description || "").matchAll(/\[PID:(.+?)\]/g)) as any[];
          const qtyMatches = Array.from((expense.description || "").matchAll(/\(x(\d*\.?\d+)\)/g)) as any[];

          if (pidMatches.length > 0) {
            for (let i = 0; i < pidMatches.length; i++) {
              const pid = pidMatches[i][1];
              const qty = qtyMatches[i] ? Number(qtyMatches[i][1]) : 1;
              const product = products.find(p => p.id.toString() === pid);
              
              if (product) {
                let newStock = Number(product.stock);
                // REVERSE the logic:
                // If it was a sale/damage (which deducted stock), we ADD it back.
                // If it was a refund (which added stock), we DEDUCT it.
                if (expense.category === "Offline Sale" || expense.category === "Inventory Damage / Loss") {
                  newStock += qty;
                } else if (expense.category === "Refund Paid") {
                  newStock -= qty;
                }

                await fetch("/api/products", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: pid, stock: newStock })
                });
              }
            }
          }

          // 2. Delete the expense entry
          const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            fetchData();
          } else {
            alert("Failed to delete expense");
          }
        } catch (err) {
          console.error(err);
          alert("Error reversing stock or deleting entry.");
        }
      }
    });
  };

  const handleUpdateExpense = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setIsUpdating(true);
    console.log("Attempting to update expense:", { id, type: editExpType, category: editExpCategory, description: editExpDesc, amount: editExpAmount });
    
    try {
      const payload = { 
        id: Number(id), 
        // Removing 'type' for now as it's causing a schema mismatch error
        category: editExpCategory, 
        description: editExpDesc, 
        amount: Number(editExpAmount) 
      };
      
      console.log("Sending Payload:", payload);

      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json();
      console.log("Server Response:", responseData);
      
      if (res.ok && responseData.success) {
        setEditingExpenseId(null);
        await fetchData();
        alert("✅ Ledger entry updated successfully!");
      } else {
        const errorMsg = responseData.error || responseData.message || "Unknown error";
        console.error("Update failed:", errorMsg);
        alert(`❌ Failed to update: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error("Network error during update:", err);
      alert(`❌ Network error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: "4rem", textAlign: "center" }}>Loading Accounting System...</div>;

  // --- CALCULATION ENGINE ---
  const calculateCOGS = (order: any) => {
    const items = order.rawItems || order.items || [];
    let cogs = 0;
    items.forEach((item: any) => {
      if (typeof item !== 'object') return;
      let cost = item.cost;
      if (cost === undefined || cost === null) {
        // Try finding by ID first, then fallback to name matching for older cart schemas
        const live = products.find(p =>
          p.id?.toString() === item.id?.toString() ||
          (p.name && item.name && p.name.toString().toLowerCase().trim() === item.name.toString().toLowerCase().trim())
        );
        cost = live?.cost || 0;
      }
      cogs += Number(cost);
    });
    return cogs;
  };

  // Daybook Math
  const today = new Date().toISOString().split("T")[0];
  const todaysOrders = orders.filter(o => o.date?.startsWith(today));
  const todaysSales = todaysOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const todaysIncomeEntries = expenses.filter(e => e.date?.startsWith(today) && e.type === "INCOME").reduce((sum, e) => sum + Number(e.amount), 0);
  const todaysExpensesAmount = expenses.filter(e => e.date?.startsWith(today) && e.type !== "INCOME").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalDailyInflow = todaysSales + todaysIncomeEntries;

  // P&L Math
  const totalSalesRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalCOGS = orders.reduce((sum, o) => sum + calculateCOGS(o), 0);
  
  // Reverse COGS for Returned Items
  const totalReturnedCOGS = returnRequests.filter(r => r.status === 'APPROVED').reduce((sum, r) => {
    const p = products.find(prod => prod.id?.toString() === r.product_id?.toString() || prod.name === r.product_name);
    return sum + ((Number(p?.cost) || 0) * (Number(r.quantity) || 1));
  }, 0);

  const grossProfit = totalSalesRevenue - totalCOGS + totalReturnedCOGS;

  const totalAssetPurchases = expenses.filter(e => e.category === "Inventory Purchase (Asset)").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalOtherIncome = expenses.filter(e => e.type === "INCOME").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalOfflineCOGS = expenses
    .filter(e => (e.type === "INCOME" && e.category === "Offline Sale") || (e.type === "EXPENSE" && e.category === "Refund Paid"))
    .reduce((sum, e) => {
      const pidMatches = Array.from((e.description || "").matchAll(/\[PID:(.+?)\]/g)) as any[];
      const qtyMatches = Array.from((e.description || "").matchAll(/\(x(\d+)\)/g)) as any[];
      
      let itemCogs = 0;
      if (pidMatches.length > 0) {
        pidMatches.forEach((match: any, index: number) => {
          const pid = match[1];
          const qty = qtyMatches[index] ? Number(qtyMatches[index][1]) : 1;
          const prod = products.find(prod => prod.id?.toString() === pid);
          if (prod) itemCogs += (Number(prod.cost) || 0) * qty;
        });
      } else {
        // Fallback for single-item legacy entries
        const productName = e.description.replace("Offline Sale: ", "").replace("Refund Paid: ", "").split(" (x")[0];
        const p = products.find(prod => prod.name === productName);
        const qtyMatch = e.description.match(/\(x(\d+)\)/);
        const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
        itemCogs = p ? (Number(p.cost) || 0) * qty : 0;
      }
      
      // If it's a refund, we subtract the COGS because the item is back in stock (asset recovered)
      return e.category === "Refund Paid" ? sum - itemCogs : sum + itemCogs;
    }, 0);

  const totalDamageLoss = expenses.filter(e => e.category === "Inventory Damage / Loss").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRefundsPaid = expenses.filter(e => e.category === "Refund Paid").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalOpEx = expenses.filter(e => e.type !== "INCOME" && e.category !== "Inventory Damage / Loss" && e.category !== "Refund Paid" && e.category !== "Inventory Purchase (Asset)").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalOfflineSales = expenses.filter(e => e.type === "INCOME" && e.category === "Offline Sale").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalDiscountsProvided = expenses
    .filter(e => e.type === "INCOME" && e.category === "Offline Sale")
    .reduce((sum, e) => {
      const discMatch = e.description.match(/\[DISC:(\d+)\]/);
      return sum + (discMatch ? Number(discMatch[1]) : 0);
    }, 0);
  const manualNonSaleIncome = expenses.filter(e => e.type === "INCOME" && e.category !== "Offline Sale").reduce((sum, e) => sum + Number(e.amount), 0);

  // Business Profit = (Web Gross Profit) + (Offline Sale Margin) - Operating Expenses - Damage Loss - Refunds
  const salesNetProfit = (grossProfit) + (totalOfflineSales - totalOfflineCOGS) - totalOpEx - totalDamageLoss - totalRefundsPaid;
  // Overall Cash = Sales Profit + Manual Injections - Asset Investments
  const overallCashPosition = salesNetProfit + manualNonSaleIncome - totalAssetPurchases;

  const netProfit = salesNetProfit; // For the variable used in UI

  // Stock Summary Math
  const inventoryCostValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.cost || 0)), 0);
  const inventoryRetailValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.price || 0)), 0);
  const inventoryUnits = products.reduce((sum, p) => sum + Number(p.stock), 0);
  const totalPendingRefunds = returnRequests.filter(r => r.status === 'PENDING').reduce((sum, r) => {
    if (r.amount) return sum + Number(r.amount);
    const p = products.find(prod => prod.id?.toString() === r.product_id?.toString() || prod.name === r.product_name);
    return sum + ((Number(p?.price) || 0) * (Number(r.quantity) || 1));
  }, 0);
  const totalLiabilities = totalPendingRefunds;

  if (isAuthChecking) return <div style={{ padding: "4rem", textAlign: "center" }}>Verifying Admin Access...</div>;
  if (!currentUser) return null; // Router will redirect

  if (!isMounted) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Accounting Suite...</div>;

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
    <div className={`${effectiveTheme}-theme`} style={{ background: "var(--admin-bg)", color: "var(--admin-text)", minHeight: "100vh" }}>
      <div className="admin-container" style={{ padding: "2rem", width: "100%", margin: 0 }}>
        <header className="accounting-header">
          <h1 style={{ color: 'var(--admin-text)', margin: 0 }}>Meat Shop Accounting Suite</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={toggleTheme}
              style={{ padding: "0.5rem 1rem", borderRadius: "50px", background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "var(--admin-text)", cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem" }}
            >
              {themeLabel}
            </button>
            <button 
              onClick={() => router.push("/admin")}
              className="action-btn back-btn" 
              style={{ 
                background: "var(--admin-sidebar)", 
                color: "white", 
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                position: "relative",
                zIndex: 10001
              }}
            >
              &larr; Back
            </button>
          </div>
        </header>

      <div className="accounting-tabs">
        {["DAYBOOK", "P&L", "BALANCE_SHEET", "STOCK", "RETURNS"].filter(tab => isAdmin || tab === "DAYBOOK" || tab === "STOCK" || tab === "RETURNS").map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.8rem 1.2rem",
              background: activeTab === tab ? (tab === "RETURNS" ? "#dc2626" : "var(--admin-text)") : "transparent",
              color: activeTab === tab ? (effectiveTheme === 'dark' ? "var(--admin-bg)" : "white") : (tab === "RETURNS" ? "#dc2626" : "var(--admin-text)"),
              border: `1px solid ${tab === "RETURNS" ? "#dc2626" : "var(--admin-border)"}`,
              fontWeight: "bold",
              cursor: "pointer",
              borderRadius: "4px",
              fontSize: "0.75rem",
              flexShrink: 0
            }}
          >
            {tab === "RETURNS" ? "↩ RETURNS" : tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {activeTab === "DAYBOOK" && (
        <div className="accounting-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "3rem" }}>
          <div>
            <h3>Add Ledger Entry</h3>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="button" onClick={() => { setExpType("INCOME"); setExpCategory("Offline Sale"); }} style={{ flex: 1, padding: "0.8rem", background: expType === "INCOME" ? "green" : "#eee", color: expType === "INCOME" ? "white" : "black", border: "1px solid #ccc", cursor: "pointer", fontWeight: "bold" }}>+ Income</button>
              <button type="button" onClick={() => { setExpType("EXPENSE"); setExpCategory("Marketing"); }} style={{ flex: 1, padding: "0.8rem", background: expType === "EXPENSE" ? "red" : "#eee", color: expType === "EXPENSE" ? "white" : "black", border: "1px solid #ccc", cursor: "pointer", fontWeight: "bold" }}>- Expense</button>
            </div>
              <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem", background: "var(--admin-card)", padding: "1.5rem", border: "1px solid var(--admin-border)", color: "var(--admin-text)" }}>
                <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} required style={{ padding: "0.8rem", background: "var(--admin-card)", color: "var(--admin-text)", border: "1px solid var(--admin-border)" }}>
                {expType === "EXPENSE" ? (
                  <>
                    <option value="Marketing">Marketing / Ads</option>
                    <option value="Delivery">Delivery / Riders</option>
                    <option value="Salary">Staff Salary</option>
                    <option value="Rent">Rent & Utilities</option>
                    <option value="Inventory Purchase (Asset)">Inventory Purchase (Asset)</option>
                    <option value="Misc">Miscellaneous Expense</option>
                    <option value="Refund Paid">Refund Paid (to Customer)</option>
                    <option value="Inventory Damage / Loss">Inventory Damage / Loss</option>
                  </>
                ) : (
                  <>
                    <option value="Offline Sale">Offline / Physical Sale</option>
                    <option value="Loan / Capital">Outside Loan / Capital</option>
                    <option value="Refund Received">Refund Received</option>
                    <option value="Misc Income">Miscellaneous Income</option>
                  </>
                )}
              </select>

              {(expCategory === "Offline Sale" || expCategory === "Refund Paid" || expCategory === "Inventory Damage / Loss") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem", 
                  background: expCategory === "Offline Sale" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)", 
                  border: `1px solid ${expCategory === "Offline Sale" ? "#10b981" : "#ef4444"}`, borderRadius: "8px" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: "bold", color: expCategory === "Offline Sale" ? "#065f46" : "#991b1b", margin: 0 }}>
                    {expCategory === "Offline Sale" ? "📦 LINK TO PRODUCT STOCK (AUTO-DEDUCT)" : 
                     expCategory === "Refund Paid" ? "🔄 RE-ADD TO PRODUCT STOCK (RETURN)" :
                     "⚠️ RECORD DAMAGE (DEDUCT FROM STOCK)"}
                  </p>
                  <select 
                    value={offlineProductId} 
                    onChange={(e) => {
                      setOfflineProductId(e.target.value);
                      const p = products.find(prod => prod.id.toString() === e.target.value);
                      if (p) {
                        if (expCategory === "Inventory Damage / Loss") {
                          setExpAmount(p.cost.toString());
                          setExpDesc(`Damage/Loss: ${p.name}`);
                        } else {
                          setExpAmount(p.price.toString());
                          setExpDesc(expCategory === "Offline Sale" ? `Offline Sale: ${p.name}` : `Refund/Return: ${p.name}`);
                        }
                      }
                    }} 
                    style={{ padding: "0.8rem", background: "var(--admin-card)", color: "var(--admin-text)", border: "1px solid var(--admin-border)" }}
                  >
                    <option value="">— Select Product —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id.toString()}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <label style={{ fontSize: "0.9rem" }}>Quantity:</label>
                      <input 
                        type="number" 
                        min="0.1" 
                        step="any"
                        value={offlineQty} 
                        onChange={(e) => {
                          setOfflineQty(e.target.value);
                          const p = products.find(prod => prod.id.toString() === offlineProductId);
                          if (p) setExpAmount((Number(p.price) * Number(e.target.value)).toString());
                        }} 
                        style={{ padding: "0.5rem", width: "80px", borderRadius: "4px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", color: "var(--admin-text)" }} 
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const p = products.find(prod => prod.id.toString() === offlineProductId);
                          if (!p) return alert("Select a product first");
                          const newItem = {
                            id: p.id,
                            name: p.name,
                            quantity: Number(offlineQty),
                            price: Number(p.price),
                            cost: Number(p.cost || 0)
                          };
                          setOfflineCart([...offlineCart, newItem]);
                          setOfflineProductId("");
                          setOfflineQty("1");
                        }}
                        style={{ padding: "0.5rem 1rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
                      >
                        + Add Item
                      </button>
                    </div>

                    {offlineCart.length > 0 && (
                      <div style={{ padding: "0.8rem", background: "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px dashed #666" }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: "bold", marginBottom: "0.5rem", opacity: 0.8 }}>🛒 CURRENT CART:</p>
                        {offlineCart.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "2px" }}>
                            <span>{item.name} (x{item.quantity})</span>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                              <span>Rs. {item.price * item.quantity}</span>
                              <button onClick={() => setOfflineCart(offlineCart.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "1rem", padding: 0 }}>×</button>
                            </div>
                          </div>
                        ))}
                        <div style={{ textAlign: "right", fontWeight: "bold", marginTop: "5px", color: "#10b981", fontSize: "0.85rem" }}>
                          Total: Rs. {offlineCart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
                        </div>
                      </div>
                    )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Customer Name *:</label>
                      <input 
                        type="text" 
                        placeholder="Full Name" 
                        value={offlineCustomerName} 
                        onChange={(e) => setOfflineCustomerName(e.target.value)} 
                        required={expCategory === "Offline Sale"}
                        style={{ padding: "0.5rem", width: "100%", borderRadius: "4px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", color: "var(--admin-text)" }} 
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Customer Phone *:</label>
                      <input 
                        type="text" 
                        placeholder="98..." 
                        value={offlineCustomerPhone} 
                        onChange={(e) => setOfflineCustomerPhone(e.target.value)} 
                        required={expCategory === "Offline Sale"}
                        style={{ padding: "0.5rem", width: "100%", borderRadius: "4px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", color: "var(--admin-text)" }} 
                      />
                    </div>
                  </div>

                  {expCategory === "Refund Paid" && (
                    <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }}>
                        <input 
                          type="checkbox" 
                          id="update-stock-check"
                          checked={shouldUpdateStock} 
                          onChange={(e) => setShouldUpdateStock(e.target.checked)} 
                        />
                        <label htmlFor="update-stock-check" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                          {shouldUpdateStock ? "✅ Add back to sellable stock" : "❌ Damaged item (Do not add back to stock)"}
                        </label>
                      </div>
                    </div>
                  )}
                  {expCategory === "Inventory Damage / Loss" && (
                    <div style={{ fontSize: "0.8rem", color: "#991b1b", marginTop: "0.5rem", fontStyle: "italic", fontWeight: "bold" }}>
                      ⚠️ This will permanently remove units from stock and record a capital loss.
                    </div>
                  )}
                </div>
              )}
              <input 
                type="text" 
                placeholder={expType === "INCOME" ? "Description (e.g., Cash from walk-in customer)" : "Description (e.g., Staff salary, Rent, Ad spend)"} 
                value={expDesc} 
                onChange={e => setExpDesc(e.target.value)} 
                required 
                style={{ padding: "0.8rem", background: "var(--admin-card)", color: "var(--admin-text)", border: "1px solid var(--admin-border)" }} 
              />
                 <div style={{ display: "flex", gap: "1rem" }}>
                   <div style={{ flex: 1, position: "relative" }}>
                     <label style={{ fontSize: "0.7rem", display: "block", marginBottom: "4px", opacity: 0.7 }}>Actual Cash Amount (Final Price):</label>
                     <input 
                       type="number" 
                       placeholder="Final Amount (NPR)" 
                       value={expAmount} 
                       onChange={e => {
                         setExpAmount(e.target.value);
                         if (expDiscount && e.target.value !== expAmount) setExpDiscount(""); 
                       }} 
                       required 
                       style={{ padding: "0.8rem", width: "100%", background: "var(--admin-card)", color: "#10b981", border: "1px solid var(--admin-border)", fontWeight: "bold", fontSize: "1.1rem" }} 
                     />
                   </div>
                   {expCategory === "Offline Sale" && (
                     <div style={{ width: "180px", position: "relative" }}>
                       <label style={{ fontSize: "0.7rem", display: "block", marginBottom: "4px", opacity: 0.7 }}>Discount (Amount or %):</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 500 or 10%" 
                          value={expDiscount} 
                          onChange={e => setExpDiscount(e.target.value)} 
                          style={{ padding: "0.8rem", width: "100%", background: "var(--admin-card)", color: "#ef4444", border: "1px solid #ef4444", fontWeight: "bold", outline: "none" }} 
                        />
                     </div>
                   )}
                 </div>
                 {offlineProductId && (() => {
                    const p = products.find(prod => prod.id.toString() === offlineProductId);
                    if (!p) return null;
                    return (
                      <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px", fontStyle: "italic", display: "flex", justifyContent: "space-between" }}>
                        <span>Retail Price: Rs. {p.price.toLocaleString()} / unit</span>
                        <span style={{ color: "#991b1b" }}>Unit Cost: Rs. {p.cost?.toLocaleString() || 0}</span>
                      </div>
                    );
                  })()}
               <button type="submit" style={{ background: "black", color: "white", padding: "1rem", fontWeight: "bold", cursor: "pointer", border: "none" }}>SAVE ENTRY</button>
            </form>

            <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px solid var(--admin-border)", background: "var(--admin-card)", color: "var(--admin-text)", borderRadius: "8px" }}>
              <h4>Today's Summary</h4>
              <p>Cash Inflow: <strong style={{ color: "#10b981" }}>Rs.{totalDailyInflow.toLocaleString()}</strong></p>
              <p>Cash Outflow: <strong style={{ color: "#ef4444" }}>Rs.{todaysExpensesAmount.toLocaleString()}</strong></p>
              <hr style={{ margin: "1rem 0", borderColor: "var(--admin-border)" }} />
              <p>Net Daily Position: <strong>Rs.{(totalDailyInflow - todaysExpensesAmount).toLocaleString()}</strong></p>
            </div>
          </div>
          <div>
            <h3>Full Cash Ledger</h3>
            <div style={{ marginTop: "1rem" }}>
              {expenses.length === 0 ? <p>No expenses recorded yet.</p> : expenses.map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid #eee", background: editingExpenseId === e.id ? "#f9fafb" : "transparent" }}>
                  {editingExpenseId === e.id ? (
                    <form onSubmit={(ev) => handleUpdateExpense(ev, e.id)} style={{ display: "flex", gap: "0.5rem", width: "100%", alignItems: "center", flexWrap: "wrap" }}>
                      <select value={editExpType} onChange={ev => { setEditExpType(ev.target.value); setEditExpCategory(ev.target.value === "INCOME" ? "Offline Sale" : "Marketing"); }} required style={{ padding: "0.5rem" }}>
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                      <select value={editExpCategory} onChange={ev => setEditExpCategory(ev.target.value)} required style={{ padding: "0.5rem" }}>
                        {editExpType === "EXPENSE" ? (
                          <>
                            <option value="Marketing">Marketing / Ads</option>
                            <option value="Delivery">Delivery / Riders</option>
                            <option value="Salary">Staff Salary</option>
                            <option value="Rent">Rent & Utilities</option>
                            <option value="Inventory Purchase (Asset)">Inventory Purchase (Asset)</option>
                            <option value="Misc">Miscellaneous Expense</option>
                            <option value="Refund Paid">Refund Paid (to Customer)</option>
                          </>
                        ) : (
                          <>
                            <option value="Offline Sale">Offline / Physical Sale</option>
                            <option value="Loan / Capital">Outside Loan / Capital</option>
                            <option value="Refund Received">Refund Received</option>
                            <option value="Misc Income">Miscellaneous Income</option>
                          </>
                        )}
                      </select>
                      <input type="text" value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} required style={{ padding: "0.5rem", flex: 1, minWidth: "150px" }} />
                      <input type="number" value={editExpAmount} onChange={ev => setEditExpAmount(ev.target.value)} required style={{ padding: "0.5rem", width: "100px" }} />
                       <button 
                         type="submit" 
                         disabled={isUpdating}
                         style={{ background: isUpdating ? "#666" : "green", color: "white", padding: "0.5rem 1rem", border: "none", cursor: isUpdating ? "not-allowed" : "pointer", fontWeight: "bold" }}
                       >
                         {isUpdating ? "Saving..." : "Save"}
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setEditingExpenseId(null)} 
                         disabled={isUpdating}
                         style={{ background: "#ccc", color: "black", padding: "0.5rem 1rem", border: "none", cursor: "pointer", fontWeight: "bold" }}
                       >
                         Cancel
                       </button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{e.type === "INCOME" ? "➕ " : ""}{e.category}</strong>
                        <div style={{ fontSize: "0.8rem", color: "gray" }}>{e.description} • {new Date(e.date).toLocaleString('en-US', { hour12: true, timeZone: 'Asia/Kathmandu' })} ({new NepaliDate(new Date(e.date)).format('DD MMMM YYYY')} BS)</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ color: e.type === "INCOME" ? "green" : "red", fontWeight: "bold", marginRight: "1rem" }}>
                          {e.type === "INCOME" ? "+" : "-"} Rs.{Number(e.amount).toLocaleString()}
                        </div>
                        {e.category === "Offline Sale" && (
                          <button 
                            onClick={() => handlePrintOffline(e)} 
                            style={{ background: "#4f46e5", color: "white", border: "none", padding: "0.3rem 0.7rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
                          >
                            🖨️ Print Bill
                          </button>
                        )}
                         {isAdmin && (
                           <>
                             <button onClick={() => { setEditingExpenseId(e.id); setEditExpType(e.type || "EXPENSE"); setEditExpCategory(e.category); setEditExpDesc(e.description); setEditExpAmount(e.amount); }} style={{ background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>Edit</button>
                             <button onClick={() => handleDeleteExpense(e.id)} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>Delete</button>
                           </>
                         )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "P&L" && (
        <div className="pl-dashboard-container" style={{ display: "flex", gap: "2.5rem", alignItems: "flex-start", marginTop: "1rem" }}>
          {/* LEFT COLUMN: P&L Statement */}
          <div style={{ background: "var(--admin-card)", color: "var(--admin-text)", padding: "2.5rem", border: "1px solid var(--admin-border)", width: "480px", flexShrink: 0, borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginBottom: "1.5rem" }}>Profit & Loss Statement (All Time)</h2>
            <hr style={{ margin: "1.5rem 0", opacity: 0.1 }} />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            <span>Gross Web Sales Revenue:</span>
            <span>Rs. {totalSalesRevenue.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: effectiveTheme === 'dark' ? "#94a3b8" : "#666", paddingBottom: "1rem" }}>
            <span>(-) Cost of Goods Sold (COGS):</span>
            <span>- Rs. {totalCOGS.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: "#10b981", borderBottom: `1px solid ${effectiveTheme === 'dark' ? "#334155" : "#000"}`, paddingBottom: "1rem", marginBottom: "1rem" }}>
            <span>(+) Cost of Returned Items Reversed:</span>
            <span>+ Rs. {totalReturnedCOGS.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold", marginBottom: "1rem" }}>
            <span>Merchandise Gross Profit:</span>
            <span>Rs. {grossProfit.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: "green", marginBottom: "0.2rem" }}>
            <span>(+) Total Offline Sales (Shop):</span>
            <span>+ Rs. {totalOfflineSales.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.0rem", color: "#666", marginBottom: "0.2rem", fontStyle: "italic" }}>
            <span>(-) Offline Item Cost (COGS):</span>
            <span>- Rs. {totalOfflineCOGS.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.0rem", color: "#ef4444", marginBottom: "0.5rem", fontStyle: "italic" }}>
            <span>(ℹ️) Total Discounts Provided:</span>
            <span>Rs. {totalDiscountsProvided.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: "green", marginBottom: "0.5rem" }}>
            <span>(+) Total Other Income (Manual):</span>
            <span>+ Rs. {expenses.filter(e => e.type === "INCOME" && e.category !== "Offline Sale").reduce((sum,e)=>sum+Number(e.amount),0).toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: effectiveTheme === 'dark' ? "#94a3b8" : "#666", marginBottom: "0.5rem" }}>
            <span>(-) Total Manual Expenses (Operating):</span>
            <span>- Rs. {totalOpEx.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: effectiveTheme === 'dark' ? "#94a3b8" : "#666", marginBottom: "0.5rem" }}>
            <span>(-) Refunds Paid to Customers:</span>
            <span>- Rs. {totalRefundsPaid.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: effectiveTheme === 'dark' ? "#94a3b8" : "#666", borderBottom: `1px solid ${effectiveTheme === 'dark' ? "#334155" : "#000"}`, paddingBottom: "1rem", marginBottom: "1rem" }}>
            <span>(-) Loss on Damaged Products:</span>
            <span>- Rs. {totalDamageLoss.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "#10b981", marginTop: "1rem", padding: "1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "8px", border: "1px dashed #10b981" }}>
            <span style={{ fontWeight: "600" }}>(+) Inventory Asset (Meat in Fridge):</span>
            <span style={{ fontWeight: "800" }}>Rs. {inventoryCostValue.toLocaleString()}</span>
          </div>

          <div className="profit-total-box" style={{ 
            marginTop: "1.5rem",
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            background: effectiveTheme === 'dark' ? "#1e293b" : "#f8fafc", 
            color: effectiveTheme === 'dark' ? "#fff" : "#000", 
            padding: "1.5rem", 
            borderRadius: "12px", 
            border: `1px solid ${effectiveTheme === 'dark' ? "#334155" : "#e2e8f0"}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: "600", color: effectiveTheme === 'dark' ? "#94a3b8" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Net Business Profit
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>TOTAL PROFIT:</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1rem", fontWeight: "700", color: netProfit >= 0 ? "#10b981" : "#ef4444", marginBottom: "2px" }}>Rs.</div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: netProfit >= 0 ? "#10b981" : "#ef4444", lineHeight: 1 }}>
                {netProfit.toLocaleString()}
              </div>
            </div>
          </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", padding: "1rem", borderRadius: "8px", border: "1px dashed #3b82f6" }}>
              <span>OVERALL CASH POSITION:</span>
              <span>Rs. {overallCashPosition.toLocaleString()}</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Unified Sales Breakdown */}
          <div style={{ flex: 1 }}>

          {/* Unified Sales Breakdown Calculation */}
          {(() => {
            const unifiedSales = [
              ...orders.map(o => ({
                type: 'WEB',
                customer: o.name || o.customerName || o.customer_name || "Web Customer",
                contact: o.phone || o.customer_phone || "",
                date: o.date,
                revenue: Number(o.total || 0),
                cogs: calculateCOGS(o),
                desc: o.items ? (Array.isArray(o.items) ? o.items.join(', ') : "Online Order") : "Online Order"
              })),
              ...expenses.filter(e => e.type === "INCOME" && e.category === "Offline Sale").map(e => {
                // Multi-item COGS Calculation
                const pidMatches = Array.from((e.description || "").matchAll(/\[PID:(.+?)\]/g)) as any[];
                const qtyMatches = Array.from((e.description || "").matchAll(/\(x(\d+)\)/g)) as any[];
                
                let totalCogs = 0;
                if (pidMatches.length > 0) {
                  pidMatches.forEach((match: any, index: number) => {
                    const pid = match[1];
                    const qty = qtyMatches[index] ? parseFloat(qtyMatches[index][1]) : 1;
                    const prod = products.find(prod => prod.id?.toString() === pid);
                    if (prod) totalCogs += (Number(prod.cost) || 0) * qty;
                  });
                } else {
                  // Fallback for single-item legacy entries
                  const productName = e.description.replace("Offline Sale: ", "").split(" (x")[0];
                  const p = products.find(prod => prod.name === productName);
                  const qtyMatch = e.description.match(/\(x(\d*\.?\d+)\)/);
                  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
                  totalCogs = p ? (Number(p.cost) || 0) * qty : 0;
                }

                // Extract customer name exactly like in the print logic
                let customerName = "Walk-in Customer";
                const cleanDescForName = e.description.replace(/^Offline Sale:\s*/i, '').split('[PID:')[0].trim();
                const beforePipeForName = cleanDescForName.split('|')[0].trim();
                
                const lastBracketIdx = beforePipeForName.lastIndexOf(')');
                if (lastBracketIdx !== -1) {
                  const potentialName = beforePipeForName.substring(lastBracketIdx + 1).trim();
                  if (potentialName) customerName = potentialName;
                } else {
                  // Fallback for single item legacy format
                  let descPart = beforePipeForName.split('(x')[0].trim();
                  const firstPidMatch = e.description.match(/\[PID:(.+?)\]/);
                  const firstP = firstPidMatch ? products.find(prod => prod.id?.toString() === firstPidMatch[1]) : null;

                  if (firstP && descPart.toLowerCase().startsWith(firstP.name.toLowerCase())) {
                    customerName = descPart.substring(firstP.name.length).trim() || "Walk-in Customer";
                  } else if (descPart && !firstP) {
                    customerName = descPart;
                  }
                }

                return {
                  type: 'OFFLINE',
                  customer: customerName,
                  contact: "(Physical Sale)",
                  date: e.date,
                  revenue: Number(e.amount),
                  cogs: totalCogs,
                  desc: e.description.replace(/\[PID:.+?\]/g, "") // Hide all ID tags from the user UI
                };
              })
            ]
            .filter(s => {
              const matchesSearch = 
                s.customer.toLowerCase().includes(salesSearch.toLowerCase()) ||
                s.contact.toLowerCase().includes(salesSearch.toLowerCase()) ||
                s.desc.toLowerCase().includes(salesSearch.toLowerCase());
              const matchesType = salesTypeFilter === "ALL" || s.type === salesTypeFilter;
              return matchesSearch && matchesType;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return (
              <div style={{ marginTop: "0" }}>
                <h3 style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>📋 Unified Sales & Margin Breakdown</h3>
                
                {/* Search & Filter Controls */}
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <input 
                    type="text" 
                    placeholder="Search by name, phone or product..." 
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    style={{ flex: 1, padding: "0.8rem", background: "var(--admin-card)", color: "var(--admin-text)", border: "1px solid var(--admin-border)", borderRadius: "6px", minWidth: "250px" }}
                  />
                  <div style={{ display: "flex", background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: "6px", overflow: "hidden" }}>
                    {["ALL", "WEB", "OFFLINE"].map(type => (
                      <button 
                        key={type}
                        onClick={() => setSalesTypeFilter(type)}
                        style={{ 
                          padding: "0.8rem 1.2rem", 
                          border: "none", 
                          background: salesTypeFilter === type ? (type === 'WEB' ? '#3b82f6' : type === 'OFFLINE' ? '#10b981' : '#6366f1') : "transparent",
                          color: salesTypeFilter === type ? "white" : "var(--admin-text-muted)",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.8rem",
                          transition: "0.2s"
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="unified-sales-container" style={{ 
                  maxHeight: "450px", 
                  overflowY: "auto", 
                  border: "1px solid var(--admin-border)",
                  borderRadius: "8px",
                  position: "relative"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                      <tr style={{ background: "#111", color: "white", textAlign: "left" }}>
                        <th style={{ padding: "0.7rem 1rem" }}>Customer / Type</th>
                        <th style={{ padding: "0.7rem 1rem" }}>Date & Details</th>
                        <th style={{ padding: "0.7rem 1rem", textAlign: "right" }}>Sale Price</th>
                        <th style={{ padding: "0.7rem 1rem", textAlign: "right" }}>Cost (COGS)</th>
                        <th style={{ padding: "0.7rem 1rem", textAlign: "right" }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unifiedSales.map((s, i) => {
                        const margin = s.revenue - s.cogs;
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid var(--admin-border)", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                            <td style={{ padding: "0.7rem 1rem" }}>
                              <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.6rem", padding: "2px 5px", borderRadius: "3px", background: s.type === 'WEB' ? "#3b82f6" : "#10b981", color: "white" }}>
                                  {s.type}
                                </span>
                                {s.customer}
                              </div>
                              <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{s.contact}</div>
                            </td>
                            <td style={{ padding: "0.7rem 1rem", color: effectiveTheme === 'dark' ? "#94a3b8" : "#666" }}>
                              <div style={{ fontSize: "0.85rem" }}>{s.date ? `${new Date(s.date).toLocaleString('en-US', { hour12: true, timeZone: 'Asia/Kathmandu' })} (${new NepaliDate(new Date(s.date)).format('DD MMMM YYYY')} BS)` : "—"}</div>
                              <div style={{ fontSize: "0.7rem", fontStyle: "italic" }}>{s.desc}</div>
                            </td>
                            <td style={{ padding: "0.7rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>Rs. {s.revenue.toLocaleString()}</td>
                            <td style={{ padding: "0.7rem 1rem", textAlign: "right", color: "#f87171", whiteSpace: "nowrap" }}>Rs. {s.cogs.toLocaleString()}</td>
                            <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontWeight: "bold", color: margin >= 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                              {margin >= 0 ? "+" : ""}Rs. {margin.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {unifiedSales.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--admin-text-muted)" }}>No records found matching your search/filter.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot style={{ position: "sticky", bottom: 0, zIndex: 2 }}>
                      <tr style={{ background: "#111", color: "white", fontWeight: "bold" }}>
                        <td colSpan={2} style={{ padding: "0.7rem 1rem" }}>TOTAL (FILTERED)</td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>Rs. {unifiedSales.reduce((sum,s)=>sum+s.revenue, 0).toLocaleString()}</td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>Rs. {unifiedSales.reduce((sum,s)=>sum+s.cogs, 0).toLocaleString()}</td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right", color: "#4ade80", whiteSpace: "nowrap" }}>
                          Rs. {(unifiedSales.reduce((sum,s)=>sum+(s.revenue - s.cogs), 0)).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
          </div>
        </div>
      )}

      {activeTab === "BALANCE_SHEET" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
          <div style={{ border: "2px solid var(--admin-border)", padding: "2rem", background: "var(--admin-card)" }}>
            <h2 style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "1rem", color: "var(--admin-text)" }}>Assets</h2>
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
              <span>Total Cash & Revenue Generated</span>
              <strong style={{ whiteSpace: "nowrap" }}>Rs. {(totalSalesRevenue + totalOtherIncome).toLocaleString()}</strong>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
              <span>Current Inventory Cost Value</span>
              <strong style={{ whiteSpace: "nowrap" }}>Rs. {inventoryCostValue.toLocaleString()}</strong>
            </div>
            <hr style={{ margin: "2rem 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold" }}>
              <span>Total Assets</span>
              <span style={{ whiteSpace: "nowrap" }}>Rs. {(totalSalesRevenue + totalOtherIncome + inventoryCostValue).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ border: "2px solid var(--admin-border)", padding: "2rem", background: "var(--admin-card)" }}>
            <h2 style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: "1rem", color: "var(--admin-text)" }}>Liabilities & Equity</h2>
            
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
              <span>Pending Customer Refunds</span>
              <strong style={{ color: "#ef4444" }}>Rs. {totalPendingRefunds.toLocaleString()}</strong>
            </div>
            {totalLiabilities === 0 && (
              <p style={{ marginTop: "0.5rem", color: "gray", fontSize: "0.8rem" }}>No external liabilities recorded.</p>
            )}

            <hr style={{ margin: "2rem 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: "bold" }}>
              <span>Owner's Equity (Net Worth)</span>
              <span style={{ whiteSpace: "nowrap", color: "#10b981" }}>Rs. {(totalSalesRevenue + totalOtherIncome + inventoryCostValue - totalLiabilities).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "gray", marginTop: "0.5rem" }}>Equity = Total Assets (Rs. {(totalSalesRevenue + totalOtherIncome + inventoryCostValue).toLocaleString()}) - Liabilities (Rs. {totalLiabilities.toLocaleString()})</p>
          </div>
        </div>
      )}

      {activeTab === "STOCK" && (
        <div>
          {isAdmin && (
            <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem" }}>
              <div style={{ padding: "1.5rem", background: "#111", color: "white", flex: 1 }}>
                <p>Total Items in Warehouse</p>
                <h2>{inventoryUnits} Units</h2>
              </div>
              <div style={{ padding: "1.5rem", background: "var(--admin-card)", border: "1px solid var(--admin-border)", flex: 1, borderRadius: "8px" }}>
                <p style={{ color: "var(--admin-text-muted)" }}>Capital Locked (Cost Value)</p>
                <h2 style={{ color: "#ef4444", whiteSpace: "nowrap" }}>Rs. {inventoryCostValue.toLocaleString()}</h2>
              </div>
              <div style={{ padding: "1.5rem", background: "var(--admin-card)", border: "1px solid var(--admin-border)", flex: 1, borderRadius: "8px" }}>
                <p style={{ color: "var(--admin-text-muted)" }}>Potential Revenue (Retail Value)</p>
                <h2 style={{ color: "#10b981", whiteSpace: "nowrap" }}>Rs. {inventoryRetailValue.toLocaleString()}</h2>
              </div>
            </div>
          )}

          {!isAdmin && (
            <div style={{ padding: "1.5rem", background: "#111", color: "white", marginBottom: "2rem", borderRadius: "8px" }}>
              <p>Total Inventory Available</p>
              <h2>{inventoryUnits} Units Across All Products</h2>
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "var(--admin-text)" }}>
            <thead style={{ background: "var(--admin-bg)" }}>
              <tr>
                <th style={{ padding: "1rem", borderBottom: "2px solid var(--admin-border)", textAlign: "left" }}>Product</th>
                <th style={{ padding: "1rem", borderBottom: "2px solid var(--admin-border)" }}>Stock Units</th>
                {isAdmin && (
                  <>
                    <th style={{ padding: "1rem", borderBottom: "2px solid var(--admin-border)" }}>Unit Cost</th>
                    <th style={{ padding: "1rem", borderBottom: "2px solid var(--admin-border)" }}>Retail Price</th>
                    <th style={{ padding: "1rem", borderBottom: "2px solid var(--admin-border)", background: effectiveTheme === 'dark' ? '#450a0a' : '#fee2e2', color: effectiveTheme === 'dark' ? '#fecaca' : '#b91c1c' }}>Total Cost Vol.</th>
                    <th style={{ padding: "1rem", borderBottom: "2px solid var(--admin-border)", background: effectiveTheme === 'dark' ? '#064e3b' : '#dcfce7', color: effectiveTheme === 'dark' ? '#a7f3d0' : '#15803d' }}>Retail Potential</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  <td style={{ padding: "1rem" }}>{p.name}</td>
                  <td style={{ padding: "1rem", textAlign: "center", fontWeight: "bold" }}>{p.stock}</td>
                  {isAdmin && (
                    <>
                      <td style={{ padding: "1rem", textAlign: "center", color: "red" }}>Rs.{p.cost}</td>
                      <td style={{ padding: "1rem", textAlign: "center", color: "green" }}>Rs.{p.price}</td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>Rs.{(p.stock * (p.cost || 0)).toLocaleString()}</td>
                      <td style={{ padding: "1rem", textAlign: "center", fontWeight: "bold" }}>Rs.{(p.stock * p.price).toLocaleString()}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "3rem" }}>
            <h3 style={{ color: "#ef4444", borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.5rem" }}>⚠️ Inventory Damage / Loss History</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--admin-card)", border: "1px solid var(--admin-border)", marginTop: "1rem" }}>
              <thead style={{ background: "rgba(239, 68, 68, 0.1)" }}>
                <tr>
                  <th style={{ padding: "0.7rem", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "0.7rem", textAlign: "left" }}>Product & Quantity</th>
                  <th style={{ padding: "0.7rem", textAlign: "right" }}>Capital Loss (Cost Value)</th>
                </tr>
              </thead>
              <tbody>
                {expenses
                  .filter(e => e.category === "Inventory Damage / Loss" || e.description.includes("[DAMAGED"))
                  .map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                      <td style={{ padding: "0.7rem", fontSize: "0.85rem" }}>{new Date(e.date).toLocaleDateString()}</td>
                      <td style={{ padding: "0.7rem" }}>{e.description}</td>
                      <td style={{ padding: "0.7rem", textAlign: "right", color: "#ef4444", fontWeight: "bold" }}>Rs. {e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                {expenses.filter(e => e.category === "Inventory Damage / Loss" || e.description.includes("[DAMAGED")).length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "#999", fontStyle: "italic" }}>No damage records found. Stock is healthy!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "RETURNS" && (
        <div style={{ maxWidth: "900px" }}>
          {/* Pending Requests Section */}
          <div style={{ marginBottom: "3rem" }}>
            <h2 style={{ borderBottom: "2px solid var(--admin-text)", paddingBottom: "0.5rem", marginBottom: "1.5rem", color: "var(--admin-text)" }}>📋 Pending Customer Return Requests</h2>

            {returnRequests.filter(r => r.status === 'PENDING').length === 0 ? (
              <p style={{ color: "var(--admin-text-muted)", fontStyle: "italic", padding: "2rem", background: "var(--admin-bg)", textAlign: "center", border: "1px dashed var(--admin-border)", borderRadius: "8px" }}>
                No pending return requests from customers.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {returnRequests.filter(r => r.status === 'PENDING').map((req) => (
                  <div key={req.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "var(--admin-text)", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "baseline", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>{req.customer_name}</span>
                        <span style={{ color: "var(--admin-text-muted)", fontSize: "0.85rem" }}>{req.customer_phone}</span>
                        <span style={{ color: "var(--admin-text-muted)", fontSize: "0.8rem", opacity: 0.7 }}>{new Date(req.created_at).toLocaleString('en-US', { hour12: true, timeZone: 'Asia/Kathmandu' })} ({new NepaliDate(new Date(req.created_at)).format('DD MMMM YYYY')} BS)</span>
                      </div>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong style={{ color: "#ef4444" }}>Product: </strong>
                        <span>{req.product_name} (x{req.quantity})</span>
                        {(() => {
                          const prod = products.find(p => p.id?.toString() === req.product_id?.toString() || p.id === req.product_id);
                          if (prod) {
                            return (
                              <span style={{ marginLeft: "0.5rem", color: "#10b981", fontWeight: "bold", fontSize: "0.85rem" }}>
                                [Sold for: NPR {(prod.price * (req.quantity || 1)).toLocaleString()}]
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div>
                        <strong>Reason: </strong>
                        <span style={{ color: "var(--admin-text-muted)", fontSize: "0.9rem" }}>{req.reason || "No reason provided"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.8rem", position: "relative", zIndex: 10, alignItems: "center" }}>
                      {approvingReqId === req.id ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: effectiveTheme === 'dark' ? '#064e3b' : '#f0fdf4', padding: "0.5rem", borderRadius: "4px", border: "1px solid #10b981" }}>
                            <input
                              type="number"
                              placeholder="Refund Amt"
                              value={tempRefundAmt}
                              onChange={(e) => setTempRefundAmt(e.target.value)}
                              style={{ width: "120px", padding: "0.4rem", border: "1px solid #10b981", borderRadius: "4px", background: 'var(--admin-card)', color: 'var(--admin-text)' }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleApproveReturn(req)}
                              disabled={retLoading}
                              style={{ background: "#10b981", color: "white", border: "none", padding: "0.4rem 0.8rem", fontWeight: "bold", cursor: "pointer", borderRadius: "4px", fontSize: "0.8rem" }}
                            >
                              {retLoading ? "..." : "CONFIRM"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setApprovingReqId(null); setTempRefundAmt(""); }}
                              style={{ background: "transparent", color: "var(--admin-text-muted)", border: "none", padding: "0.4rem", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
                              title="Cancel"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setApprovingReqId(req.id); }}
                            disabled={retLoading}
                            style={{ background: "#10b981", color: "white", border: "none", padding: "0.6rem 1.2rem", fontWeight: "bold", cursor: "pointer", borderRadius: "8px" }}
                          >
                            APPROVE
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRejectReturn(req.id); }}
                            disabled={retLoading}
                            style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", padding: "0.6rem 1.2rem", fontWeight: "bold", cursor: "pointer", borderRadius: "8px" }}
                          >
                            REJECT
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recently Processed Requests */}
            {returnRequests.filter(r => r.status !== 'PENDING').length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ color: "var(--admin-text-muted)", margin: 0 }}>History (Approved/Rejected)</h4>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setModalConfig({
                          show: true,
                          title: "Clear Return History",
                          message: "⚠️ ARE YOU SURE? This will permanently delete ALL Approved and Rejected return records from your history. This action cannot be undone.",
                          confirmLabel: "Yes, Clear All History",
                          type: 'danger',
                          action: async () => {
                            setModalConfig(prev => ({ ...prev, show: false }));
                            const res = await fetch('/api/returns?clearHistory=true', { method: 'DELETE' });
                            if (res.ok) fetchData();
                            else alert("Failed to clear history.");
                          }
                        });
                      }}
                      style={{ 
                        background: 'none', 
                        border: '1px solid #ef4444', 
                        color: '#ef4444', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      🗑️ Clear All History
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {returnRequests.filter(r => r.status !== 'PENDING').slice(0, 5).map((req) => (
                    <div key={req.id} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between", background: "var(--admin-card)", padding: "0.6rem 1rem", border: "1px solid var(--admin-border)", borderRadius: "4px", opacity: 0.8 }}>
                      <span style={{ color: "var(--admin-text)" }}>{req.customer_name} — {req.product_name}</span>
                      <strong style={{ color: req.status === 'APPROVED' ? '#10b981' : '#ef4444' }}>{req.status}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        <footer style={{ marginTop: '4rem', padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', fontSize: '0.8rem', opacity: 0.6 }}>
          <p>&copy; {new Date().getFullYear()} Delicious Meat Shop • Accounting & Finance Edition</p>
          <p style={{ marginTop: '0.5rem' }}>Secure Financial Environment</p>
        </footer>
      </div>

      <PrintableBill printingOrders={printingOrders} />
      
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
