// LocalStorage utilities for Kvittr app

export interface Receipt {
  id: string;
  user_id: string;
  type: 'receipt' | 'warranty' | 'return_slip' | 'gift_card';
  shop_name: string;
  product_name: string;
  amount: number;
  purchase_date: string;
  expiry_date?: string;
  warranty_expires?: string;
  return_by?: string;
  remaining_value?: number;
  image_url: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'used';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

const STORAGE_KEYS = {
  USER: 'kvittr_user',
  RECEIPTS: 'kvittr_receipts',
};

// User authentication
export const saveUser = (user: User) => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getUser = (): User | null => {
  const user = localStorage.getItem(STORAGE_KEYS.USER);
  return user ? JSON.parse(user) : null;
};

export const clearUser = () => {
  localStorage.removeItem(STORAGE_KEYS.USER);
};

// Receipt management
export const getReceipts = (userId: string): Receipt[] => {
  const receipts = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
  const allReceipts: Receipt[] = receipts ? JSON.parse(receipts) : [];
  return allReceipts.filter(r => r.user_id === userId);
};

export const saveReceipt = (receipt: Receipt) => {
  const receipts = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
  const allReceipts: Receipt[] = receipts ? JSON.parse(receipts) : [];
  
  const existingIndex = allReceipts.findIndex(r => r.id === receipt.id);
  if (existingIndex >= 0) {
    allReceipts[existingIndex] = receipt;
  } else {
    allReceipts.push(receipt);
  }
  
  localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(allReceipts));
};

export const deleteReceipt = (id: string) => {
  const receipts = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
  const allReceipts: Receipt[] = receipts ? JSON.parse(receipts) : [];
  const filtered = allReceipts.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(filtered));
};

// Calculate status based on dates
export const calculateStatus = (receipt: Receipt): Receipt['status'] => {
  const expiryDate = receipt.expiry_date || receipt.warranty_expires || receipt.return_by;
  if (!expiryDate) return 'active';
  
  if (receipt.type === 'gift_card' && receipt.remaining_value === 0) {
    return 'used';
  }
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 7) return 'expiring_soon';
  return 'active';
};
