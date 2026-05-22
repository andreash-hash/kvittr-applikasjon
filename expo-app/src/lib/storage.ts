import { supabase } from './supabase';
import type { Receipt } from '../types/receipt';
import { calculateStatus } from '../utils/receiptStatus';

export type { Receipt };
export { calculateStatus };

function mapRow(r: Record<string, unknown>): Receipt {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    type: r.receipt_type as Receipt['type'],
    shop_name: (r.shop_name as string) ?? '',
    product_name: (r.product_name as string) ?? '',
    amount: Number(r.amount) || 0,
    purchase_date: (r.purchase_date as string) ?? new Date().toISOString(),
    warranty_until: (r.warranty_until as string) ?? undefined,
    return_until: (r.return_until as string) ?? undefined,
    expiry_date: (r.expiry_date as string) ?? undefined,
    warranty_expires: (r.warranty_until as string) ?? undefined,
    return_by: (r.return_until as string) ?? undefined,
    remaining_value: r.gift_card_balance ? Number(r.gift_card_balance) : undefined,
    image_url: (r.image_url as string) ?? '',
    status: (r.status as Receipt['status']) ?? 'active',
    archived: (r.archived as boolean) ?? false,
    processing_status: (r.processing_status as Receipt['processing_status']) ?? undefined,
    is_used: (r.is_used as boolean) ?? false,
    has_warranty: (r.has_warranty as boolean) ?? undefined,
    created_at: (r.created_at as string) ?? new Date().toISOString(),
  };
}

// Returns non-archived receipts. Uses the archived boolean column (NOT the status
// string) to avoid issues with status check constraints. .not('archived','is',true)
// correctly includes rows where archived IS NULL (most existing receipts).
export const getReceipts = async (userId: string): Promise<Receipt[]> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .not('archived', 'is', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
};

export const getArchivedReceipts = async (userId: string): Promise<Receipt[]> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
};

// Fetches a single receipt by ID regardless of archived status.
// Used by the detail screen so archived receipts can still be viewed.
export const getReceiptById = async (id: string): Promise<Receipt | null> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
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

// Uses the archived boolean column — avoids any status check constraint.
export const archiveReceipt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('receipts')
    .update({ archived: true })
    .eq('id', id);
  if (error) throw error;
};

export const unarchiveReceipt = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('receipts')
    .update({ archived: false })
    .eq('id', id);
  if (error) throw error;
};
