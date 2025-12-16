
import { Product, Transaction, User, ShopSettings, CartItem, ProductUnit, Shift, Customer, AuditLog, ParkedCart } from '../types';
import { INITIAL_PRODUCTS, INITIAL_USERS, INITIAL_SETTINGS } from '../constants';

// Safe Env Access
const getApiUrl = () => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
        return (import.meta as any).env.VITE_API_URL;
    }
    return 'http://localhost:3000/api';
};

const API_URL = getApiUrl();
let IS_DEMO_MODE = false; // Flag to track if we've fallen back to local demo mode

const getHeaders = () => {
    const token = localStorage.getItem('pos_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

// HELPER: Fallback to LocalStorage if API fails
const apiFetch = async (endpoint: string, options?: RequestInit) => {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { ...getHeaders(), ...options?.headers }
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        IS_DEMO_MODE = false;
        return await res.json();
    } catch (e) {
        // Automatically switch to demo mode on first failure
        if (!IS_DEMO_MODE) {
            console.warn(`API Connection failed (${endpoint}). Switching to Offline/Demo Mode.`);
            IS_DEMO_MODE = true;
        }
        throw e; // Re-throw to be handled by specific methods
    }
};

// --- Local Storage Helpers for Demo Mode ---
const getLocal = (key: string, defaultVal: any) => {
    const data = localStorage.getItem(`demo_${key}`);
    return data ? JSON.parse(data) : defaultVal;
};
const setLocal = (key: string, data: any) => {
    localStorage.setItem(`demo_${key}`, JSON.stringify(data));
};

export const StorageService = {
  generateId: (): string => {
      try {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              return crypto.randomUUID();
          }
      } catch (e) {}
      return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  },

  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    try {
        return await apiFetch('/products');
    } catch (e) {
        return getLocal('products', INITIAL_PRODUCTS);
    }
  },

  findProductByBarcode: async (barcode: string): Promise<{ product: Product, unit?: ProductUnit } | null> => {
    const products = await StorageService.getProducts();
    const baseMatch = products.find(p => p.barcode === barcode);
    if (baseMatch) return { product: baseMatch };

    for (const p of products) {
      if (p.units && Array.isArray(p.units)) {
        const unitMatch = p.units.find((u: ProductUnit) => u.barcode === barcode);
        if (unitMatch) return { product: p, unit: unitMatch };
      }
    }
    return null;
  },

  saveProduct: async (product: Product, user?: User) => {
    try {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(product) });
    } catch (e) {
        const products = getLocal('products', INITIAL_PRODUCTS);
        const index = products.findIndex((p: Product) => p.id === product.id);
        if (index >= 0) products[index] = product;
        else products.push(product);
        setLocal('products', products);
    }
  },

  deleteProduct: async (id: string, user?: User) => {
    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
    } catch (e) {
        const products = getLocal('products', INITIAL_PRODUCTS).filter((p: Product) => p.id !== id);
        setLocal('products', products);
    }
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    try {
        return await apiFetch('/transactions');
    } catch (e) {
        return getLocal('transactions', []);
    }
  },

  saveTransaction: async (transaction: Transaction) => {
    try {
        await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(transaction) });
    } catch (e) {
        const txs = getLocal('transactions', []);
        txs.unshift(transaction); // Add to top
        setLocal('transactions', txs);

        // Update Stock Locally
        const products = getLocal('products', INITIAL_PRODUCTS);
        transaction.items.forEach((item) => {
            const pIndex = products.findIndex((p: Product) => p.id === item.productId);
            if (pIndex >= 0) {
                products[pIndex].quantity -= item.quantity;
            }
        });
        setLocal('products', products);
    }

    // Update Shift Sales
    const activeShift = await StorageService.getActiveShift(transaction.cashierId);
    if (activeShift) {
        const cashPayment = transaction.payments.find(p => p.method === 'CASH')?.amount || 0;
        await StorageService.updateShiftSales(activeShift.id, cashPayment);
    }
  },

  refundTransaction: async (tx: Transaction, user: User) => {
      console.warn("Refund backend logic requires endpoint implementation");
  },

  // --- Local Only (Cart & Parked) ---
  saveCartState: (cart: CartItem[]) => {
    localStorage.setItem('pos_cart_backup', JSON.stringify(cart));
  },
  getCartState: (): CartItem[] => {
    try { return JSON.parse(localStorage.getItem('pos_cart_backup') || '[]'); } catch { return []; }
  },
  getParkedCarts: (): ParkedCart[] => {
      try { return JSON.parse(localStorage.getItem('pos_parked_carts') || '[]'); } catch { return []; }
  },
  saveParkedCart: (cart: ParkedCart) => {
      const carts = StorageService.getParkedCarts();
      carts.push(cart);
      localStorage.setItem('pos_parked_carts', JSON.stringify(carts));
  },
  removeParkedCart: (id: string) => {
      const carts = StorageService.getParkedCarts().filter(c => c.id !== id);
      localStorage.setItem('pos_parked_carts', JSON.stringify(carts));
  },

  // --- Stats ---
  getCashierDailyStats: async (userId: string) => {
      const txs = await StorageService.getTransactions();
      const today = new Date().toISOString().split('T')[0];
      const todayTxs = txs.filter(t => t.cashierId === userId && t.date.startsWith(today) && t.status !== 'REFUNDED');
      
      return {
          count: todayTxs.length,
          total: todayTxs.reduce((acc, t) => acc + t.total, 0),
          itemsScanned: todayTxs.reduce((acc, t) => acc + t.items.reduce((iAcc: any, item: any) => iAcc + item.quantity, 0), 0)
      };
  },

  // --- Settings ---
  getSettings: async (): Promise<ShopSettings> => {
    try {
        return await apiFetch('/settings');
    } catch(e) { 
        return getLocal('settings', INITIAL_SETTINGS); 
    }
  },

  updateSettings: async (settings: ShopSettings) => {
    try {
        await apiFetch('/settings', { method: 'POST', body: JSON.stringify(settings) });
    } catch (e) {
        setLocal('settings', settings);
    }
  },

  // --- User Management ---
  getUsers: async (): Promise<User[]> => {
      try {
          return await apiFetch('/users');
      } catch (e) { 
          return getLocal('users', INITIAL_USERS); 
      }
  },

  saveUser: async (user: Partial<User>) => {
      try {
          return await apiFetch('/users', { method: 'POST', body: JSON.stringify(user) });
      } catch (e) {
          const users = getLocal('users', INITIAL_USERS);
          if (user.id) {
               // Update
               const idx = users.findIndex((u: User) => u.id === user.id);
               if(idx >= 0) users[idx] = { ...users[idx], ...user };
          } else {
              // Create
              users.push({ ...user, id: StorageService.generateId(), isSuspended: false });
          }
          setLocal('users', users);
          return user as User;
      }
  },

  deleteUser: async (id: string) => {
      try {
          await apiFetch(`/users/${id}`, { method: 'DELETE' });
      } catch (e) {
          const users = getLocal('users', INITIAL_USERS).filter((u: User) => u.id !== id);
          setLocal('users', users);
      }
  },

  toggleUserSuspension: async (id: string, isSuspended: boolean) => {
      try {
          await apiFetch(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isSuspended }) });
      } catch (e) {
          const users = getLocal('users', INITIAL_USERS);
          const idx = users.findIndex((u: User) => u.id === id);
          if (idx >= 0) {
              users[idx].isSuspended = isSuspended;
              setLocal('users', users);
          }
      }
  },
  
  login: async (username: string, pin: string) => {
      try {
          const res = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ username, pin }) });
          localStorage.setItem('pos_token', res.token);
          return res.user;
      } catch (e) {
          // DEMO LOGIN FALLBACK
          console.warn("API Login failed, trying local demo users...");
          const users = getLocal('users', INITIAL_USERS);
          const user = users.find((u: User) => u.username === username);
          
          if (!user) throw new Error('Invalid credentials');
          if (user.pin !== pin) throw new Error('Invalid credentials');
          if (user.isSuspended) throw new Error('Account Suspended');
          
          return user;
      }
  },

  // --- Shifts ---
  getShifts: async (): Promise<Shift[]> => {
    try {
        return await apiFetch('/shifts');
    } catch(e) { return getLocal('shifts', []); }
  },

  getActiveShift: async (userId: string): Promise<Shift | undefined> => {
      const shifts = await StorageService.getShifts();
      return shifts.find(s => s.userId === userId && !s.endTime);
  },

  startShift: async (userId: string, userName: string, startCash: number) => {
      const newShift = {
          id: StorageService.generateId(),
          userId,
          userName,
          startTime: new Date().toISOString(),
          startCash,
          expectedCash: startCash
      };
      try {
        await apiFetch('/shifts', { method: 'POST', body: JSON.stringify(newShift) });
      } catch (e) {
          const shifts = getLocal('shifts', []);
          shifts.push(newShift);
          setLocal('shifts', shifts);
      }
  },

  updateShiftSales: async (shiftId: string, cashAmount: number) => {
      try {
          const shifts = await StorageService.getShifts();
          const shift = shifts.find(s => s.id === shiftId);
          if(shift) {
            const newExpected = (shift.expectedCash || 0) + cashAmount;
            await apiFetch(`/shifts/${shiftId}`, { method: 'PUT', body: JSON.stringify({ expectedCash: newExpected }) });
          }
      } catch (e) {
          const shifts = getLocal('shifts', []);
          const idx = shifts.findIndex((s: Shift) => s.id === shiftId);
          if (idx >= 0) {
              shifts[idx].expectedCash = (shifts[idx].expectedCash || 0) + cashAmount;
              setLocal('shifts', shifts);
          }
      }
  },

  endShift: async (shiftId: string, endCash: number, notes: string) => {
      const shifts = await StorageService.getShifts();
      const shift = shifts.find(s => s.id === shiftId);
      if(shift) {
          const difference = endCash - (shift.expectedCash || 0);
          const updateData = {
              endTime: new Date().toISOString(),
              endCash,
              notes,
              difference
          };
          try {
              await apiFetch(`/shifts/${shiftId}`, { method: 'PUT', body: JSON.stringify(updateData) });
          } catch(e) {
              const localShifts = getLocal('shifts', []);
              const idx = localShifts.findIndex((s: Shift) => s.id === shiftId);
              if (idx >= 0) {
                  localShifts[idx] = { ...localShifts[idx], ...updateData };
                  setLocal('shifts', localShifts);
              }
          }
      }
  },

  // --- Customers ---
  getCustomers: async (): Promise<Customer[]> => {
      try {
        return await apiFetch('/customers');
      } catch(e) { return getLocal('customers', []); }
  },

  saveCustomer: async (customer: Customer) => {
      try {
          await apiFetch('/customers', { method: 'POST', body: JSON.stringify(customer) });
      } catch (e) {
          const customers = getLocal('customers', []);
          const idx = customers.findIndex((c: Customer) => c.id === customer.id);
          if (idx >= 0) customers[idx] = customer;
          else customers.push(customer);
          setLocal('customers', customers);
      }
  },

  // --- Audit ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
      try {
        return await apiFetch('/logs');
      } catch (e) { return getLocal('logs', []); }
  },

  logAudit: async (log: AuditLog) => {
      try {
        await apiFetch('/logs', { method: 'POST', body: JSON.stringify(log) });
      } catch(e) {
          const logs = getLocal('logs', []);
          logs.unshift(log);
          setLocal('logs', logs);
      }
  }
};
