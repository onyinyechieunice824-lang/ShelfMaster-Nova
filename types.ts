
export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  pin: string;
  isSuspended?: boolean;
}

export interface Batch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface ProductUnit {
  name: string; // e.g., "Carton", "Pack"
  multiplier: number; // e.g., 12 (12 singles in a carton)
  barcode: string;
  price: number; // Override price for this unit
}

export interface PriceHistory {
  date: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStock: number;
  lastUpdated: string;
  batches: Batch[];
  units: ProductUnit[];
  priceHistory?: PriceHistory[];
}

export interface CartItem extends Product {
  cartQuantity: number;
  selectedUnit?: ProductUnit; // If they picked a specific unit like Carton
}

export interface Payment {
  method: 'CASH' | 'CARD' | 'TRANSFER';
  amount: number;
  // Transfer details
  bankName?: string;
  reference?: string;
}

export interface Transaction {
  id: string;
  date: string;
  cashierId: string;
  cashierName: string;
  items: {
    productId: string;
    name: string;
    quantity: number; // Total base units (e.g. 12 if carton sold)
    unitName: string; // "Single", "Carton"
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payments: Payment[];
  customerPhone?: string; // For WhatsApp
  customerId?: string;
  customerName?: string;
  status?: 'COMPLETED' | 'REFUNDED';
  isTraining?: boolean;
}

export interface ParkedCart {
  id: string;
  note: string;
  items: CartItem[];
  date: string;
  userId: string;
  customer?: Customer;
}

export interface ShopSettings {
  name: string;
  address: string;
  phone: string;
  currency: string;
  taxRate: number;
  receiptFooter: string;
  wifiSsid?: string; // Optional offline helper
  branches?: Branch[];
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  startCash: number;
  endCash?: number;
  expectedCash?: number; // Calculated from sales
  difference?: number; // Surplus or Shortage
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number; // Positive = Credit, Negative = Debt
  lastVisit: string;
}

export interface AuditLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: 'LOGIN' | 'SALE' | 'INVENTORY_UPDATE' | 'PRICE_CHANGE' | 'DELETE_PRODUCT' | 'SHIFT_OPEN' | 'SHIFT_CLOSE' | 'REFUND' | 'USER_MGMT';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  manager: string;
}