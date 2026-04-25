export type ReceiptType = 'receipt' | 'warranty' | 'return_slip' | 'gift_card';
export type ReceiptStatus = 'active' | 'expiring_soon' | 'expired' | 'used';
export type ProcessingStatus = 'pending' | 'completed' | 'failed';

export interface Receipt {
  id: string;
  user_id: string;
  type: ReceiptType;
  shop_name: string;
  product_name: string;
  amount: number;
  purchase_date: string;
  warranty_until?: string;
  return_until?: string;
  expiry_date?: string;
  warranty_expires?: string;
  return_by?: string;
  remaining_value?: number;
  image_url: string;
  status: ReceiptStatus;
  processing_status?: ProcessingStatus;
  is_used?: boolean;
  has_warranty?: boolean | null;
  created_at: string;
}

export interface GuestReceipt {
  id: string;
  type: ReceiptType;
  shop_name: string;
  product_name: string;
  amount: number;
  purchase_date: string;
  image_url: string;
  status: ReceiptStatus;
  processing_status: 'local';
  created_at: string;
}
