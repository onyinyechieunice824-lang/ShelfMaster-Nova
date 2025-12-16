
import { Product, User, UserRole, ShopSettings } from './types';

export const INITIAL_SETTINGS: ShopSettings = {
  name: 'ShelfMaster Demo Store',
  address: '12 Victoria Island, Lagos',
  phone: '+234 800 123 4567',
  currency: '₦',
  taxRate: 7.5,
  receiptFooter: 'Thank you for your patronage!',
};

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    username: 'admin',
    role: UserRole.ADMIN,
    pin: '1234',
  },
  {
    id: '2',
    name: 'John Cashier',
    username: 'john',
    role: UserRole.CASHIER,
    pin: '0000',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '101',
    name: 'Coca Cola 50cl',
    barcode: '5449000000996',
    category: 'Beverages',
    costPrice: 150,
    sellingPrice: 250,
    quantity: 100,
    minStock: 20,
    lastUpdated: new Date().toISOString(),
    batches: [],
    units: [],
  },
  {
    id: '102',
    name: 'Gala Sausage Roll',
    barcode: '978020137962',
    category: 'Snacks',
    costPrice: 80,
    sellingPrice: 150,
    quantity: 50,
    minStock: 10,
    lastUpdated: new Date().toISOString(),
    batches: [],
    units: [],
  },
  {
    id: '103',
    name: 'Dangote Sugar 1kg',
    barcode: '615110000001',
    category: 'Groceries',
    costPrice: 900,
    sellingPrice: 1200,
    quantity: 30,
    minStock: 5,
    lastUpdated: new Date().toISOString(),
    batches: [],
    units: [],
  },
  {
    id: '104',
    name: 'Peak Milk Powder',
    barcode: '871200000000',
    category: 'Groceries',
    costPrice: 2200,
    sellingPrice: 2600,
    quantity: 15,
    minStock: 5,
    lastUpdated: new Date().toISOString(),
    batches: [],
    units: [],
  },
];