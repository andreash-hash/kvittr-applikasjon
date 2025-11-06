// Supabase database utilities for Kvittr app
import { supabase } from '@/integrations/supabase/client';

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
  processing_status?: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// Receipt management
export const getReceipts = async (userId: string): Promise<Receipt[]> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Map database fields to our interface
  return (data || []).map(r => ({
    id: r.id,
    user_id: r.user_id,
    type: r.item_type as Receipt['type'],
    shop_name: r.shop_name || '',
    product_name: r.product_name || '',
    amount: Number(r.amount) || 0,
    purchase_date: r.purchase_date || new Date().toISOString(),
    expiry_date: r.gift_card_value ? r.purchase_date : undefined,
    warranty_expires: r.warranty_until || undefined,
    return_by: r.return_until || undefined,
    remaining_value: r.gift_card_balance ? Number(r.gift_card_balance) : undefined,
    image_url: r.image_url || '',
    status: (r.status as Receipt['status']) || 'active',
    processing_status: (r.processing_status as Receipt['processing_status']) || undefined,
    created_at: r.created_at || new Date().toISOString(),
  }));
};

export const saveReceipt = async (receipt: Receipt): Promise<void> => {
  const dbReceipt = {
    id: receipt.id,
    user_id: receipt.user_id,
    item_type: receipt.type,
    shop_name: receipt.shop_name,
    product_name: receipt.product_name,
    amount: receipt.amount,
    purchase_date: receipt.purchase_date.split('T')[0],
    warranty_until: receipt.warranty_expires?.split('T')[0] || null,
    return_until: receipt.return_by?.split('T')[0] || null,
    gift_card_value: receipt.type === 'gift_card' ? receipt.amount : null,
    gift_card_balance: receipt.remaining_value || null,
    image_url: receipt.image_url,
    status: receipt.status,
    processing_status: receipt.processing_status || null,
  };

  const { error } = await supabase
    .from('receipts')
    .upsert(dbReceipt);
  
  if (error) throw error;
};

export const deleteReceipt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
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
