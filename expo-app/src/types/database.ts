export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          expo_push_token: string | null;
          fcm_token: string | null;
          id: string;
          onboarding_completed: boolean | null;
          scans_reset_date: string | null;
          scans_used_this_month: number | null;
          subscription_expires_at: string | null;
          subscription_started_at: string | null;
          subscription_status: string | null;
          subscription_tier: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          expo_push_token?: string | null;
          fcm_token?: string | null;
          id: string;
          onboarding_completed?: boolean | null;
          scans_reset_date?: string | null;
          scans_used_this_month?: number | null;
          subscription_expires_at?: string | null;
          subscription_started_at?: string | null;
          subscription_status?: string | null;
          subscription_tier?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expo_push_token?: string | null;
          fcm_token?: string | null;
          id?: string;
          onboarding_completed?: boolean | null;
          scans_reset_date?: string | null;
          scans_used_this_month?: number | null;
          subscription_expires_at?: string | null;
          subscription_started_at?: string | null;
          subscription_status?: string | null;
          subscription_tier?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          amount: number | null;
          archived: boolean | null;
          category: string | null;
          created_at: string | null;
          expiry_date: string | null;
          gift_card_balance: number | null;
          gift_card_code: string | null;
          gift_card_value: number | null;
          guide_generated: boolean | null;
          guide_url: string | null;
          has_warranty: boolean | null;
          id: string;
          image_url: string;
          is_used: boolean | null;
          maintenance_priority: string | null;
          notes: string | null;
          processing_status: string | null;
          product_name: string | null;
          purchase_date: string | null;
          raw_ocr_data: Json | null;
          receipt_type: string | null;
          return_until: string | null;
          return_notified_3d: boolean | null;
          return_notified_7d: boolean | null;
          shop_name: string | null;
          status: string | null;
          updated_at: string | null;
          used_date: string | null;
          user_id: string;
          warranty_notified_3d: boolean | null;
          warranty_notified_7d: boolean | null;
          warranty_notified_30d: boolean | null;
          warranty_until: string | null;
        };
        Insert: {
          amount?: number | null;
          archived?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          expiry_date?: string | null;
          gift_card_balance?: number | null;
          gift_card_code?: string | null;
          gift_card_value?: number | null;
          guide_generated?: boolean | null;
          guide_url?: string | null;
          has_warranty?: boolean | null;
          id?: string;
          image_url: string;
          is_used?: boolean | null;
          maintenance_priority?: string | null;
          notes?: string | null;
          processing_status?: string | null;
          product_name?: string | null;
          purchase_date?: string | null;
          raw_ocr_data?: Json | null;
          receipt_type?: string | null;
          return_until?: string | null;
          return_notified_3d?: boolean | null;
          return_notified_7d?: boolean | null;
          shop_name?: string | null;
          status?: string | null;
          updated_at?: string | null;
          used_date?: string | null;
          user_id: string;
          warranty_notified_3d?: boolean | null;
          warranty_notified_7d?: boolean | null;
          warranty_notified_30d?: boolean | null;
          warranty_until?: string | null;
        };
        Update: {
          amount?: number | null;
          archived?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          expiry_date?: string | null;
          gift_card_balance?: number | null;
          gift_card_code?: string | null;
          gift_card_value?: number | null;
          guide_generated?: boolean | null;
          guide_url?: string | null;
          has_warranty?: boolean | null;
          id?: string;
          image_url?: string;
          is_used?: boolean | null;
          maintenance_priority?: string | null;
          notes?: string | null;
          processing_status?: string | null;
          product_name?: string | null;
          purchase_date?: string | null;
          raw_ocr_data?: Json | null;
          receipt_type?: string | null;
          return_until?: string | null;
          return_notified_3d?: boolean | null;
          return_notified_7d?: boolean | null;
          shop_name?: string | null;
          status?: string | null;
          updated_at?: string | null;
          used_date?: string | null;
          user_id?: string;
          warranty_notified_3d?: boolean | null;
          warranty_notified_7d?: boolean | null;
          warranty_notified_30d?: boolean | null;
          warranty_until?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          notification_type: string | null;
          receipt_id: string | null;
          sent_at: string | null;
          status: string | null;
          type: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          notification_type?: string | null;
          receipt_id?: string | null;
          sent_at?: string | null;
          status?: string | null;
          type?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          notification_type?: string | null;
          receipt_id?: string | null;
          sent_at?: string | null;
          status?: string | null;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          created_at: string | null;
          notification_enabled: boolean | null;
          notification_time: string | null;
          push_token: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          notification_enabled?: boolean | null;
          notification_time?: string | null;
          push_token?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          notification_enabled?: boolean | null;
          notification_time?: string | null;
          push_token?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      delete_user_account: { Args: never; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
