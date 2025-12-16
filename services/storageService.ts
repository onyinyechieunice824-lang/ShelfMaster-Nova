
import { Product, Transaction, User, ShopSettings, CartItem, ProductUnit, Shift, Customer, AuditLog, ParkedCart } from '../types';
import { INITIAL_PRODUCTS, INITIAL_USERS, INITIAL_SETTINGS } from '../constants';

// Set this in your Vercel Environment Variables
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

const getHeaders = () => {
    const token = localStorage.getItem('pos_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
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
        const res = await fetch(`${API_URL}/products`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch products');
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
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
    await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(product)
    });
    
    if (user && product.id) {
       // Ideally fetch old product to compare, simplified here
       // Audit log logic moved to server or kept here
    }
  },

  deleteProduct: async (id: string, user?: User) => {
    await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    try {
        const res = await fetch(`${API_URL}/transactions`, { headers: getHeaders() });
        return await res.json();
    } catch (e) { return []; }
  },

  saveTransaction: async (transaction: Transaction) => {
    await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(transaction)
    });

    // Handle shift update logic on client or server? 
    // Ideally Server, but keeping logic here requires fetching shift first.
    // We will let the server handle inventory, but Shift sales update we do here for now to match UI expectations
    const activeShift = await StorageService.getActiveShift(transaction.cashierId);
    if (activeShift) {
        const cashPayment = transaction.payments.find(p => p.method === 'CASH')?.amount || 0;
        await StorageService.updateShiftSales(activeShift.id, cashPayment);
    }
  },

  refundTransaction: async (tx: Transaction, user: User) => {
      // Backend should have a refund endpoint, reusing update for now implies logic complexity
      // For this migration, we won't fully implement refund logic on backend in this snippet
      console.warn("Refund backend logic requires endpoint implementation");
  },

  // --- Local Only (Cart & Parked) ---
  saveCartState: (cart: CartItem[]) => {
    localStorage.setItem('pos_cart_backup', JSON.stringify(cart));
  },
  getCartState: (): CartItem[] => {
    return JSON.parse(localStorage.getItem('pos_cart_backup') || '[]');
  },
  getParkedCarts: (): ParkedCart[] => {
      return JSON.parse(localStorage.getItem('pos_parked_carts') || '[]');
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
        const res = await fetch(`${API_URL}/settings`, { headers: getHeaders() });
        return await res.json();
    } catch(e) { return INITIAL_SETTINGS; }
  },

  updateSettings: async (settings: ShopSettings) => {
    await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(settings)
    });
  },

  // --- User Management ---
  getUsers: async (): Promise<User[]> => {
      try {
          const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
          return await res.json();
      } catch (e) { return []; }
  },

  saveUser: async (user: Partial<User>) => {
      const res = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(user)
      });
      if(!res.ok) throw new Error("Failed to save user");
      return await res.json();
  },

  deleteUser: async (id: string) => {
      await fetch(`${API_URL}/users/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
      });
  },

  toggleUserSuspension: async (id: string, isSuspended: boolean) => {
      await fetch(`${API_URL}/users/${id}/status`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ isSuspended })
      });
  },
  
  login: async (username: string, pin: string) => {
      const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, pin })
      });
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('pos_token', data.token);
      return data.user;
  },

  // --- Shifts ---
  getShifts: async (): Promise<Shift[]> => {
    try {
        const res = await fetch(`${API_URL}/shifts`, { headers: getHeaders() });
        return await res.json();
    } catch(e) { return []; }
  },

  getActiveShift: async (userId: string): Promise<Shift | undefined> => {
      const shifts = await StorageService.getShifts();
      return shifts.find(s => s.userId === userId && !s.endTime);
  },

  startShift: async (userId: string, userName: string, startCash: number) => {
      const newShift = {
          userId,
          userName,
          startTime: new Date().toISOString(),
          startCash,
          expectedCash: startCash
      };
      await fetch(`${API_URL}/shifts`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(newShift)
      });
  },

  updateShiftSales: async (shiftId: string, cashAmount: number) => {
      const shifts = await StorageService.getShifts();
      const shift = shifts.find(s => s.id === shiftId);
      if (shift) {
          const newExpected = (shift.expectedCash || 0) + cashAmount;
          await fetch(`${API_URL}/shifts/${shiftId}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify({ expectedCash: newExpected })
          });
      }
  },

  endShift: async (shiftId: string, endCash: number, notes: string) => {
      const shifts = await StorageService.getShifts();
      const shift = shifts.find(s => s.id === shiftId);
      if(shift) {
          const difference = endCash - (shift.expectedCash || 0);
          await fetch(`${API_URL}/shifts/${shiftId}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify({
                  endTime: new Date().toISOString(),
                  endCash,
                  notes,
                  difference
              })
          });
      }
  },

  // --- Customers ---
  getCustomers: async (): Promise<Customer[]> => {
      try {
        const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
        return await res.json();
      } catch(e) { return []; }
  },

  saveCustomer: async (customer: Customer) => {
      await fetch(`${API_URL}/customers`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(customer)
      });
  },

  // --- Audit ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
      try {
        const res = await fetch(`${API_URL}/logs`, { headers: getHeaders() });
        return await res.json();
      } catch (e) { return []; }
  },

  logAudit: async (log: AuditLog) => {
      await fetch(`${API_URL}/logs`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(log)
      });
  }
};