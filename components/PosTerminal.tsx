
import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, X, PackagePlus, ChevronDown, Camera, ArrowLeft, Split, AlertCircle, CheckCircle, WifiOff, Smartphone, Landmark, ScanBarcode, MessageSquare, Mail, Tag, Package, UserPlus, PauseCircle, PlayCircle, Zap, Activity, BookOpen, RotateCcw, AlertTriangle, Languages } from 'lucide-react';
import { Product, CartItem, User, ShopSettings, Transaction, Payment, ProductUnit, Shift, ParkedCart, Customer, UserRole } from '../types';
import { StorageService } from '../services/storageService';
import Receipt from './Receipt';
import BarcodeScanner from './BarcodeScanner';

interface PosTerminalProps {
  user: User;
  settings: ShopSettings;
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

const PosTerminal: React.FC<PosTerminalProps> = ({ user, settings, onBack, onNavigate }) => {
  // --- CORE STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  
  // --- UI MODES ---
  const [isExpressMode, setIsExpressMode] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [isPidgin, setIsPidgin] = useState(false);
  
  // --- SCANNING & INPUT ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // --- FEEDBACK ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [stats, setStats] = useState({ count: 0, total: 0, itemsScanned: 0 });

  // --- MODALS ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [showShiftBlocker, setShowShiftBlocker] = useState(false);

  // --- PAYMENT STATE ---
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferBank, setTransferBank] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  // --- TEMP STATE FOR MODALS ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState<string>('1');
  const qtyInputRef = useRef<HTMLInputElement>(null);
  
  // --- PARKED CARTS ---
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [parkNote, setParkNote] = useState('');

  // --- AUDIO ---
  const playSound = (type: 'success' | 'error') => {
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          if (type === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } else {
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }
      } catch (e) {
          console.error("Audio error", e);
      }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    refreshData();
    const savedCart = StorageService.getCartState();
    if (savedCart.length > 0) {
        setCart(savedCart);
        setScanFeedback({ type: 'success', message: 'Cart Restored' });
    }
    
    // Check Shift Status
    const checkShift = async () => {
        const activeShift = await StorageService.getActiveShift(user.id);
        if (!activeShift && user.role !== UserRole.ADMIN) {
            setShowShiftBlocker(true);
        }
    };
    checkShift();

    focusSearch();
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global Key Shortcuts
    const handleKeys = (e: KeyboardEvent) => {
        if (e.key === 'F2') { e.preventDefault(); focusSearch(); }
        if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0) openPayment(); }
        if (e.key === 'F8') { e.preventDefault(); if (cart.length > 0) setShowParkModal(true); }
        if (e.key === 'Escape') { 
            setShowDropdown(false); 
            setShowPaymentModal(false);
            setShowQtyModal(false);
            setShowParkModal(false);
            setShowScanner(false);
        }
    };
    window.addEventListener('keydown', handleKeys);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('keydown', handleKeys);
    };
  }, []);

  useEffect(() => {
    StorageService.saveCartState(cart);
  }, [cart]);

  // Keep focus on scan input unless modal is open
  useEffect(() => {
      if (!showQtyModal && !showPaymentModal && !showParkModal && !showScanner && !showReceiptModal && !showShiftBlocker) {
          const interval = setInterval(() => {
              if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                  focusSearch();
              }
          }, 2000); // Check every 2s
          return () => clearInterval(interval);
      }
  }, [showQtyModal, showPaymentModal, showParkModal, showScanner, showReceiptModal, showShiftBlocker]);

  // Auto-hide feedback
  useEffect(() => {
    if (scanFeedback) {
      const timer = setTimeout(() => setScanFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [scanFeedback]);

  const refreshData = async () => {
    setProducts(await StorageService.getProducts());
    setParkedCarts(StorageService.getParkedCarts());
    setCustomers(await StorageService.getCustomers());
    setStats(await StorageService.getCashierDailyStats(user.id));
  };

  const focusSearch = () => {
    if (searchInputRef.current) {
        searchInputRef.current.focus();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery)
  );

  // --- CART LOGIC ---
  const processAddToCart = (product: Product, qtyToAdd: number, unit?: ProductUnit): boolean => {
    const multiplier = unit ? unit.multiplier : 1;
    const totalDeduction = qtyToAdd * multiplier;
    
    // Inventory Check (Skip if training)
    if (!isTrainingMode) {
        if (product.quantity < totalDeduction) {
             if (!showScanner && searchQuery === '') alert(`Insufficient stock. Need ${totalDeduction}, have ${product.quantity}`);
             playSound('error');
             return false;
        }

        const existingItem = cart.find(item => item.id === product.id && item.selectedUnit?.name === unit?.name);
        const currentCartQty = existingItem ? existingItem.cartQuantity : 0;
        const currentCartDeduction = currentCartQty * multiplier;
        
        if (product.quantity < (currentCartDeduction + totalDeduction)) {
            if (!showScanner && searchQuery === '') alert(`Insufficient stock. Max available: ${product.quantity}`);
            playSound('error');
            return false;
        }
    }

    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id && item.selectedUnit?.name === unit?.name);
      if (existingItem) {
        return prev.map(item => 
          (item.id === product.id && item.selectedUnit?.name === unit?.name)
            ? { ...item, cartQuantity: item.cartQuantity + qtyToAdd }
            : item
        );
      }
      return [{ 
          ...product, 
          cartQuantity: qtyToAdd, 
          selectedUnit: unit,
          sellingPrice: unit ? (unit.price > 0 ? unit.price : product.sellingPrice * unit.multiplier) : product.sellingPrice 
      }, ...prev]; // Add to top
    });
    
    setSearchQuery(''); 
    setShowDropdown(false);
    playSound('success');
    return true;
  };

  const handleProductClick = (product: Product) => {
    if (product.quantity <= 0 && !isTrainingMode) {
        alert("Out of stock!");
        return;
    }
    // Direct add if standard item, modal if needs unit choice or manual qty
    if (product.units && product.units.length > 0) {
         setSelectedProduct(product);
         setQtyInput('1');
         setShowQtyModal(true);
    } else {
         processAddToCart(product, 1);
    }
    setSearchQuery('');
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        const query = searchQuery.trim();
        if(!query) return;

        // Try to find exact barcode match first
        const match = await StorageService.findProductByBarcode(query);
        
        if (match) {
            const added = processAddToCart(match.product, 1, match.unit);
            if (added) {
                setScanFeedback({ type: 'success', message: `Added: ${match.product.name}` });
            } else {
                setScanFeedback({ type: 'error', message: 'Stock Error' });
            }
        } else {
            // No direct barcode match, check name filter
             if (filteredProducts.length === 1) {
                handleProductClick(filteredProducts[0]);
             } else if (filteredProducts.length === 0) {
                 setScanFeedback({ type: 'error', message: 'Product Not Found' });
                 playSound('error');
             }
        }
    }
  };

  const handleCameraScan = async (code: string) => {
      const match = await StorageService.findProductByBarcode(code);
      if (match) {
          const added = processAddToCart(match.product, 1, match.unit);
          if (added) {
             setScanFeedback({ type: 'success', message: `Added: ${match.product.name}` });
          } else {
             setScanFeedback({ type: 'error', message: 'Out of stock' });
          }
      } else {
          setScanFeedback({ type: 'error', message: `Not Found: ${code}` });
          playSound('error');
      }
  };

  // --- MODAL & BUTTON HANDLERS ---
  const confirmAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseInt(qtyInput);
    if (qty > 0) {
        processAddToCart(selectedProduct, qty); // Default unit for now, add unit selector if needed in modal
        setShowQtyModal(false);
        setSelectedProduct(null);
    }
  };

  const updateQuantity = (productId: string, delta: number, unitName?: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId && item.selectedUnit?.name === unitName) {
        const newQty = item.cartQuantity + delta;
        if (newQty < 1) return item;
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string, unitName?: string) => {
    setCart(prev => prev.filter(item => !(item.id === productId && item.selectedUnit?.name === unitName)));
  };

  // --- PARK / RETRIEVE ---
  const handleParkCart = () => {
      if (cart.length === 0) return;
      const parked: ParkedCart = {
          id: StorageService.generateId(),
          items: cart,
          date: new Date().toISOString(),
          note: parkNote || `Cart #${parkedCarts.length + 1}`,
          userId: user.id,
          customer: selectedCustomer
      };
      StorageService.saveParkedCart(parked);
      setCart([]);
      setParkNote('');
      setSelectedCustomer(undefined);
      setShowParkModal(false);
      refreshData();
      setScanFeedback({ type: 'success', message: 'Cart Parked' });
  };

  const handleRetrieveCart = (parked: ParkedCart) => {
      if (cart.length > 0) {
          if(!window.confirm("Current cart will be overwritten. Continue?")) return;
      }
      setCart(parked.items);
      if (parked.customer) setSelectedCustomer(parked.customer);
      StorageService.removeParkedCart(parked.id);
      setShowParkModal(false);
      refreshData();
      setScanFeedback({ type: 'success', message: 'Cart Retrieved' });
  };

  // --- REFUND (Admin Auth Mock) ---
  const handleRefundLast = async () => {
      const txs = await StorageService.getTransactions();
      const last = txs[txs.length - 1];
      if (!last) { alert("No recent transactions"); return; }
      
      const pin = prompt(`Enter ADMIN PIN to refund Transaction #${last.id.slice(-6)}`);
      if (pin === '1234') { // Mock check
          await StorageService.refundTransaction(last, user);
          alert("Transaction Refunded & Inventory Restored");
          refreshData();
      } else {
          alert("Invalid PIN or Unauthorized");
      }
  };

  // --- PAYMENT CALCS ---
  const subtotal = cart.reduce((acc, item) => acc + (item.sellingPrice * item.cartQuantity), 0);
  const tax = subtotal * (settings.taxRate / 100);
  const total = subtotal + tax;
  
  const currentPaid = (parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(transferAmount) || 0);
  const remaining = Math.max(0, total - currentPaid);
  const change = Math.max(0, currentPaid - total);
  const isFullyPaid = currentPaid >= total - 0.01;

  const openPayment = () => {
      setCashAmount(total.toFixed(2));
      setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!isFullyPaid) {
        alert("Incomplete Payment");
        return;
    }
    
    // Create payments array
    const payments: Payment[] = [];
    if (parseFloat(cashAmount) > 0) payments.push({ method: 'CASH', amount: parseFloat(cashAmount) });
    if (parseFloat(cardAmount) > 0) payments.push({ method: 'CARD', amount: parseFloat(cardAmount) });
    if (parseFloat(transferAmount) > 0) payments.push({ method: 'TRANSFER', amount: parseFloat(transferAmount), bankName: transferBank, reference: transferRef });

    const transaction: Transaction = {
        id: StorageService.generateId(),
        date: new Date().toISOString(),
        cashierId: user.id,
        cashierName: user.name,
        items: cart.map(i => ({
            productId: i.id,
            name: i.name,
            quantity: i.cartQuantity * (i.selectedUnit?.multiplier || 1),
            unitName: i.selectedUnit?.name || 'Single',
            unitPrice: i.sellingPrice,
            total: i.sellingPrice * i.cartQuantity
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        payments,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerPhone: customerPhone || selectedCustomer?.phone,
        isTraining: isTrainingMode
    };

    await StorageService.saveTransaction(transaction);
    setLastTransaction(transaction);
    
    // Reset State
    setCart([]);
    setShowPaymentModal(false);
    setCashAmount(''); setCardAmount(''); setTransferAmount('');
    setTransferBank(''); setTransferRef(''); setCustomerPhone('');
    setSelectedCustomer(undefined);
    
    refreshData();
    setShowReceiptModal(true);
  };

  // --- RENDER HELPERS ---
  const t = (en: string, pidgin: string) => isPidgin ? pidgin : en;

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 relative">
      {/* SHIFT BLOCKER OVERLAY */}
      {showShiftBlocker && (
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RotateCcw className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Shift Not Started</h2>
                  <p className="text-gray-500 mb-6">You must start your shift to access the POS terminal.</p>
                  <div className="space-y-3">
                      <button onClick={() => onNavigate && onNavigate('SHIFTS')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Start Shift</button>
                      <button onClick={onBack} className="w-full py-3 text-gray-500 font-bold hover:text-gray-800">Logout</button>
                  </div>
              </div>
          </div>
      )}

      {/* OFFLINE BANNER */}
      {isOffline && (
          <div className="absolute top-0 left-0 right-0 bg-orange-600 text-white text-xs font-bold text-center py-1 z-50 flex items-center justify-center gap-2">
              <WifiOff className="w-3 h-3" /> OFFLINE MODE
          </div>
      )}

      {/* TRAINING BANNER */}
      {isTrainingMode && (
          <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs font-bold text-center py-1 z-50 flex items-center justify-center gap-2 tracking-widest uppercase">
              <BookOpen className="w-3 h-3" /> Training Mode Active - No Sales Recorded
          </div>
      )}

      {/* SCANNER MODAL */}
      {showScanner && (
          <BarcodeScanner 
            onScan={handleCameraScan} 
            onClose={() => setShowScanner(false)} 
            continuous={true}
          />
      )}
      
      {/* FEEDBACK TOAST */}
      {scanFeedback && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[70] animate-in fade-in zoom-in duration-300">
              <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border border-white/20 ${
                  scanFeedback.type === 'success' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}>
                  {scanFeedback.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="font-bold text-xl tracking-tight">{scanFeedback.message}</span>
              </div>
          </div>
      )}

      {/* LEFT COLUMN: PRODUCTS / GRID */}
      {/* Changed flex layout to be responsive (flex-1) but hidden on mobile ONLY if EXPRESS mode is explicitly active, 
          otherwise it stacks on top. Added min-h-0 to allow nested scrolling. */}
      <div className={`flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden border border-gray-100 min-h-0 ${isExpressMode ? 'hidden lg:flex lg:flex-1' : ''}`}>
        {/* HEADER */}
        <div className="p-4 border-b border-gray-100 z-20 flex gap-3 items-center bg-white/80 backdrop-blur-md sticky top-0">
          <button onClick={onBack} className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
             <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm bg-white text-gray-900 placeholder-gray-400 font-medium text-lg"
              placeholder={t("Scan Barcode or Search (F2)", "Scan Items or Search (F2)")}
              value={searchQuery}
              onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
              }}
              onKeyDown={handleSearchKeyDown}
            />
            {/* Quick Clear */}
            {searchQuery && (
                <button onClick={() => { setSearchQuery(''); focusSearch(); }} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            )}
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-slate-50 text-xs text-gray-500 font-medium">
             <div className="flex gap-4">
                 <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-600"/> {stats.count} Sales Today</span>
                 <span className="flex items-center gap-1"><Package className="w-3 h-3 text-blue-600"/> {stats.itemsScanned} Items Scanned</span>
             </div>
             <div className="flex gap-2">
                 <button onClick={() => setIsTrainingMode(!isTrainingMode)} className={`flex items-center gap-1 px-2 py-1 rounded ${isTrainingMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>
                    <BookOpen className="w-3 h-3"/> Training
                 </button>
                 <button onClick={() => setIsExpressMode(!isExpressMode)} className={`flex items-center gap-1 px-2 py-1 rounded ${isExpressMode ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-200'}`}>
                    <Zap className="w-3 h-3"/> Express
                 </button>
                 <button onClick={() => setIsPidgin(!isPidgin)} className={`flex items-center gap-1 px-2 py-1 rounded ${isPidgin ? 'bg-green-100 text-green-700' : 'hover:bg-gray-200'}`}>
                    <Languages className="w-3 h-3"/> Pidgin
                 </button>
             </div>
        </div>
        
        {/* PRODUCT GRID (Standard Mode) */}
        {!isExpressMode && (
            <div className="flex-1 overflow-y-auto p-5 z-10 bg-slate-50/30">
            {searchQuery && filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <Search className="w-10 h-10 mb-2 opacity-20" />
                    <p>No products found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                    {filteredProducts.slice(0, 20).map(product => (
                    <div 
                        key={product.id} 
                        onClick={() => handleProductClick(product)} 
                        className={`group bg-white p-4 rounded-xl border border-gray-100 cursor-pointer transition-all hover:shadow-md hover:border-blue-200 relative overflow-hidden ${product.quantity === 0 ? 'opacity-60' : ''}`}
                    >
                        <h3 className="font-bold text-gray-800 text-sm leading-tight h-10 overflow-hidden line-clamp-2">{product.name}</h3>
                        <div className="flex justify-between items-end mt-2">
                            <span className="text-blue-600 font-extrabold text-lg">{settings.currency}{product.sellingPrice}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${product.quantity < product.minStock ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {product.quantity}
                            </span>
                        </div>
                    </div>
                    ))}
                </div>
            )}
            </div>
        )}
        
        {/* EXPRESS MODE PLACEHOLDER */}
        {isExpressMode && (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
                <div className="bg-white p-8 rounded-full shadow-sm mb-6">
                    <ScanBarcode className="w-24 h-24 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">Express Queue Mode</h3>
                <p className="text-gray-500 max-w-xs">Product grid is hidden to improve focus. Use scanner or keyboard search (F2) to add items.</p>
            </div>
        )}
      </div>

      {/* RIGHT COLUMN: CART & ACTIONS */}
      {/* Responsive width/height. Full width on mobile, 450px on desktop. 
          Height: 40% on mobile to allow products to be visible on top. Full height on desktop. */}
      <div className={`w-full lg:w-[450px] bg-white rounded-2xl shadow-xl flex flex-col border border-gray-100 overflow-hidden ${isExpressMode ? 'flex-1 h-full' : 'h-[40%] lg:h-full'}`}>
        {/* CART HEADER */}
        <div className="p-4 border-b border-gray-100 bg-white z-20 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                {t("Current Cart", "Market Bag")}
            </h2>
            <div className="flex items-center gap-2">
                 <button onClick={() => setShowScanner(true)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Scan Camera">
                    <Camera className="w-4 h-4" />
                </button>
                <div className="h-6 w-px bg-gray-200"></div>
                <button onClick={() => setCart([])} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors uppercase tracking-wide">
                    {t("Clear", "Empty Am")}
                </button>
            </div>
          </div>
          
          {/* CUSTOMER SELECTOR */}
          <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)} className="w-full flex items-center justify-between border border-gray-200 rounded-lg p-2.5 text-sm hover:border-blue-300 transition-colors bg-gray-50">
                  <span className={`font-medium ${selectedCustomer ? 'text-blue-700' : 'text-gray-500'}`}>
                      {selectedCustomer ? selectedCustomer.name : t("Select Customer (Optional)", "Pick Customer (Optional)")}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30">
                      <div className="p-2 border-b border-gray-50 sticky top-0 bg-white">
                          <input autoFocus placeholder="Search..." className="w-full text-xs p-2 border rounded" onClick={e => e.stopPropagation()}/>
                      </div>
                      <div className="p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-500 italic" onClick={() => { setSelectedCustomer(undefined); setShowDropdown(false); }}>
                          Guest Customer
                      </div>
                      {customers.map(c => (
                          <div key={c.id} className="p-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 flex justify-between" onClick={() => { setSelectedCustomer(c); setShowDropdown(false); }}>
                              <span className="font-bold text-gray-800">{c.name}</span>
                              <span className={c.balance < 0 ? 'text-red-500' : 'text-green-500'}>{settings.currency}{c.balance}</span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-60">
                    <div className="bg-gray-100 p-6 rounded-full">
                        <ShoppingCart className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-medium">{t("Cart is empty", "Bag dey empty")}</p>
                    <p className="text-xs">Scan item or search (F2)</p>
                </div>
            )}
            {cart.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="group flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-left-2 duration-200">
                    <div className="flex-1 overflow-hidden pr-2">
                        <h4 className="font-bold text-gray-800 text-sm truncate">
                            {item.name} 
                        </h4>
                         <div className="flex items-center gap-2 mt-1">
                             {item.selectedUnit && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 rounded font-bold">{item.selectedUnit.name}</span>}
                            <span className="text-xs text-gray-500">{settings.currency}{item.sellingPrice.toLocaleString()}</span>
                         </div>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <button onClick={() => updateQuantity(item.id, -1, item.selectedUnit?.name)} className="p-1 hover:bg-white hover:shadow rounded transition-all"><Minus className="w-3 h-3 text-gray-600" /></button>
                        <span className="w-8 text-center text-sm font-bold">{item.cartQuantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1, item.selectedUnit?.name)} className="p-1 hover:bg-white hover:shadow rounded transition-all"><Plus className="w-3 h-3 text-gray-600" /></button>
                    </div>
                    <div className="text-right min-w-[60px]">
                        <div className="font-bold text-sm text-gray-900">{settings.currency}{(item.sellingPrice * item.cartQuantity).toLocaleString()}</div>
                    </div>
                    <button onClick={() => removeFromCart(item.id, item.selectedUnit?.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-1 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>

        {/* CART ACTIONS & TOTALS */}
        <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
            {/* Quick Actions Row */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => { if(cart.length>0) setShowParkModal(true); }} disabled={cart.length===0} className="flex-1 min-w-[80px] py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100 hover:bg-orange-100 whitespace-nowrap disabled:opacity-50">
                   {t("Park (F8)", "Suspend (F8)")}
                </button>
                <button onClick={() => { if(cart.length>0) setCart(prev => prev.slice(0, -1)); }} disabled={cart.length===0} className="flex-1 min-w-[80px] py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 whitespace-nowrap disabled:opacity-50">
                   {t("Void Last", "Remove Last")}
                </button>
                <button onClick={handleRefundLast} className="flex-1 min-w-[80px] py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100 hover:bg-gray-100 whitespace-nowrap">
                   {t("Refund", "Return")}
                </button>
            </div>

            <div className="space-y-1 mb-4">
                <div className="flex justify-between text-xl font-extrabold text-gray-900 pt-2 border-t border-dashed border-gray-200">
                    <span>{t("TOTAL", "MONEY")}</span>
                    <span>{settings.currency}{formatMoney(total)}</span>
                </div>
            </div>
            
            <button 
                onClick={openPayment}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-lg"
            >
                <CreditCard className="w-5 h-5" />
                {t(`PAY ${settings.currency}${formatMoney(total)} (F4)`, `OYA PAY ${settings.currency}${formatMoney(total)} (F4)`)}
            </button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* PARK / RETRIEVE MODAL */}
      {showParkModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">{t("Parked Carts", "Suspended Transactions")}</h3>
                      <button onClick={() => setShowParkModal(false)}><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {/* Park Current Section */}
                      {cart.length > 0 && (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                              <h4 className="font-bold text-blue-800 text-sm mb-2">{t("Park Current Cart", "Suspend Dis One")}</h4>
                              <input 
                                className="w-full border p-2 rounded-lg text-sm mb-2" 
                                placeholder="Note (e.g. Customer waiting for transfer)" 
                                value={parkNote} 
                                onChange={e => setParkNote(e.target.value)}
                              />
                              <button onClick={handleParkCart} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700">Save & Clear</button>
                          </div>
                      )}
                      
                      {/* List */}
                      {parkedCarts.length === 0 ? (
                          <div className="text-center text-gray-400 py-8 italic">{t("No parked carts", "Nothing dey here")}</div>
                      ) : (
                          parkedCarts.map(pc => (
                              <div key={pc.id} className="border border-gray-200 p-3 rounded-xl hover:border-blue-300 transition-colors bg-white">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <div className="font-bold text-gray-800">{pc.note}</div>
                                          <div className="text-xs text-gray-500">{new Date(pc.date).toLocaleTimeString()} • {pc.items.length} Items</div>
                                          {pc.customer && <div className="text-xs text-blue-600 font-bold mt-1">{pc.customer.name}</div>}
                                      </div>
                                      <div className="font-bold text-gray-900">
                                          {settings.currency}{pc.items.reduce((a,b) => a + (b.sellingPrice*b.cartQuantity), 0).toLocaleString()}
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => handleRetrieveCart(pc)} className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100">{t("Retrieve", "Bring Am Back")}</button>
                                      <button onClick={() => { StorageService.removeParkedCart(pc.id); refreshData(); }} className="px-3 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100"><Trash2 className="w-3 h-3"/></button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[95vh] overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setShowPaymentModal(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{t("Checkout", "Pay Time")}</h3>
                            <p className="text-sm text-gray-500">{t("Select payment method(s)", "How dem wan pay?")}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="mb-6 p-6 bg-slate-50 rounded-2xl text-center border border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t("Total Amount Due", "Total Money")}</p>
                          <div className="text-4xl font-extrabold text-slate-900 tracking-tight">{settings.currency}{formatMoney(total)}</div>
                      </div>

                      <div className="space-y-4 mb-6">
                          {/* Cash */}
                          <div className="group flex gap-4 items-center p-3 rounded-xl border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all bg-white">
                              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 shrink-0">
                                  <Banknote className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <label className="text-xs font-bold text-gray-400 block mb-1">CASH</label>
                                  <input type="number" value={cashAmount} onChange={e=>setCashAmount(e.target.value)} className="w-full outline-none font-bold text-lg text-gray-900 placeholder-gray-300 bg-transparent" placeholder="0.00" />
                              </div>
                          </div>

                          {/* Card */}
                          <div className="group flex gap-4 items-center p-3 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-white">
                              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                  <CreditCard className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                      <label className="text-xs font-bold text-gray-400 block mb-1">CARD / POS</label>
                                      <button onClick={() => setCardAmount(remaining.toFixed(2))} className="text-[10px] font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded">FILL</button>
                                  </div>
                                  <input type="number" value={cardAmount} onChange={e=>setCardAmount(e.target.value)} className="w-full outline-none font-bold text-lg text-gray-900 placeholder-gray-300 bg-transparent" placeholder="0.00" />
                              </div>
                          </div>

                          {/* Transfer */}
                          <div className="group p-3 rounded-xl border border-gray-200 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all bg-white">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                                    <Landmark className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 block mb-1">TRANSFER</label>
                                        <button onClick={() => setTransferAmount(remaining.toFixed(2))} className="text-[10px] font-bold text-purple-600 hover:underline bg-purple-50 px-2 py-0.5 rounded">FILL</button>
                                    </div>
                                    <input type="number" value={transferAmount} onChange={e=>setTransferAmount(e.target.value)} className="w-full outline-none font-bold text-lg text-gray-900 placeholder-gray-300 bg-transparent" placeholder="0.00" />
                                </div>
                            </div>
                             {parseFloat(transferAmount) > 0 && (
                                <div className="mt-3 pt-3 border-t border-dashed border-gray-200 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                    <input type="text" placeholder="Bank Name" className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-purple-300 text-gray-900" value={transferBank} onChange={e=>setTransferBank(e.target.value)} />
                                    <input type="text" placeholder="Ref Number" className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-purple-300 text-gray-900" value={transferRef} onChange={e=>setTransferRef(e.target.value)} />
                                </div>
                             )}
                          </div>
                      </div>
                      
                      {/* WhatsApp */}
                      <div className="mb-4">
                          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                              <Smartphone className="w-4 h-4" /> Customer WhatsApp (Optional)
                          </label>
                          <input 
                            type="tel" 
                            placeholder="e.g. 23480..." 
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-gray-900" 
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                      <div className="flex justify-between items-center text-sm mb-4">
                          <span className="font-bold text-gray-500">Total Paid</span>
                          <div className="text-right">
                              <span className={`block font-extrabold text-lg ${isFullyPaid ? 'text-green-600' : 'text-gray-900'}`}>
                                 {settings.currency}{formatMoney(currentPaid)}
                              </span>
                              {!isFullyPaid && <span className="text-xs text-red-500 font-bold">Remaining: {settings.currency}{formatMoney(remaining)}</span>}
                              {isFullyPaid && change > 0 && <span className="text-xs text-green-600 font-bold">Change: {settings.currency}{formatMoney(change)}</span>}
                          </div>
                      </div>

                      <div className="flex gap-3">
                        <button 
                            onClick={() => setShowPaymentModal(false)}
                            className="px-6 py-4 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handlePayment} 
                            disabled={!isFullyPaid}
                            className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-lg shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {t("Complete Sale", "Finish Am")}
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* RECEIPT SUCCESS MODAL */}
      {showReceiptModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[80]">
              <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>
                  
                  <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{t("Sale Successful!", "Transaction Don Set!")}</h3>
                  <p className="text-gray-500 mb-8 text-sm">Transaction has been recorded.</p>
                  
                  <div className="space-y-3">
                      <button onClick={() => window.print()} className="w-full py-3 border-2 border-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-colors">
                          {t("Print Receipt", "Print Receipt")}
                      </button>
                      
                      {customerPhone && (
                          <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => {
                                 const text = `*Receipt from ${settings.name}*\nRef: ${lastTransaction?.id.slice(-6)}\nTotal: ${settings.currency}${formatMoney(lastTransaction?.total || 0)}`;
                                 window.open(`https://wa.me/${customerPhone}?text=${encodeURIComponent(text)}`, '_blank');
                             }} className="py-3 bg-[#25D366] text-white rounded-xl font-bold hover:opacity-90 flex items-center justify-center gap-2 text-sm shadow-md shadow-green-500/20">
                                 <MessageSquare className="w-4 h-4" /> WhatsApp
                             </button>
                             <button className="py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 flex items-center justify-center gap-2 text-sm shadow-md shadow-blue-500/20">
                                 <Mail className="w-4 h-4" /> SMS
                             </button>
                          </div>
                      )}
                      
                      <button onClick={() => setShowReceiptModal(false)} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg">
                          {t("Start New Sale", "Start New One")}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Hidden Receipt for printing */}
      <Receipt transaction={lastTransaction} settings={settings} />

      {/* Qty Modal */}
      {showQtyModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl transform transition-all">
                <h3 className="text-lg font-bold mb-4 text-center">{selectedProduct.name}</h3>
                <form onSubmit={confirmAddToCart}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Enter Quantity</label>
                    <div className="flex justify-center mb-6">
                        <input autoFocus ref={qtyInputRef} type="number" min="1" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} className="w-24 text-center border-b-2 border-blue-500 text-4xl font-bold focus:outline-none p-2" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">Add to Cart</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default PosTerminal;
