import { supabase } from './supabase';
import type { Receipt } from '../types/receipt';
import { calculateStatus } from '../utils/receiptStatus';

export type { Receipt };
export { calculateStatus };

export const getReceipts = async (userId: string): Promise<Receipt[]> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.receipt_type as Receipt['type'],
    shop_name: r.shop_name ?? '',
    product_name: r.product_name ?? '',
    amount: Number(r.amount) || 0,
    purchase_date: r.purchase_date ?? new Date().toISOString(),
    warranty_until: r.warranty_until ?? undefined,
    return_until: r.return_until ?? undefined,
    expiry_date: r.expiry_date ?? undefined,
    warranty_expires: r.warranty_until ?? undefined,
    return_by: r.return_until ?? undefined,
    remaining_value: r.gift_card_balance ? Number(r.gift_card_balance) : undefined,
    image_url: r.image_url ?? '',
    status: (r.status as Receipt['status']) ?? 'active',
    processing_status: (r.processing_status as Receipt['processing_status']) ?? undefined,
    is_used: r.is_used ?? false,
    has_warranty: r.has_warranty ?? undefined,
    created_at: r.created_at ?? new Date().toISOString(),
  }));
};

export const saveReceipt = async (receipt: Receipt): Promise<void> => {
  const dbReceipt = {
    id: receipt.id,
    user_id: receipt.user_id,
    receipt_type: receipt.type,
    shop_name: receipt.shop_name,
    product_name: receipt.product_name,
    amount: receipt.amount,
    purchase_date: receipt.purchase_date.split('T')[0],
    warranty_until: receipt.warranty_until?.split('T')[0] ?? null,
    return_until: receipt.return_until?.split('T')[0] ?? null,
    expiry_date: receipt.expiry_date?.split('T')[0] ?? null,
    gift_card_value: receipt.type === 'gift_card' ? receipt.amount : null,
    gift_card_balance: receipt.remaining_value ?? null,
    image_url: receipt.image_url,
    status: receipt.status,
    processing_status: receipt.processing_status ?? null,
    has_warranty: receipt.has_warranty ?? null,
    is_used: receipt.is_used ?? false,
  };

  const { error } = await supabase.from('receipts').upsert(dbReceipt);
  if (error) throw error;
};

export const deleteReceipt = async (id: string): Promise<void> => {
  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) throw error;
};

export const archiveReceipt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('receipts')
    .update({ status: 'archived' })
    .eq('id', id);
  if (error) throw error;
};
