export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      guides: {
        Row: {
          affiliate_links: Json | null
          brand: string | null
          clicks: number | null
          content: string | null
          conversions: number | null
          created_at: string | null
          id: string
          product_category: string
          product_name: string | null
          views: number | null
        }
        Insert: {
          affiliate_links?: Json | null
          brand?: string | null
          clicks?: number | null
          content?: string | null
          conversions?: number | null
          created_at?: string | null
          id?: string
          product_category: string
          product_name?: string | null
          views?: number | null
        }
        Update: {
          affiliate_links?: Json | null
          brand?: string | null
          clicks?: number | null
          content?: string | null
          conversions?: number | null
          created_at?: string | null
          id?: string
          product_category?: string
          product_name?: string | null
          views?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          notification_type: string | null
          receipt_id: string | null
          sent_at: string | null
          status: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_type?: string | null
          receipt_id?: string | null
          sent_at?: string | null
          status?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string | null
          receipt_id?: string | null
          sent_at?: string | null
          status?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          fcm_token: string | null
          id: string
          onboarding_completed: boolean | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fcm_token?: string | null
          id: string
          onboarding_completed?: boolean | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fcm_token?: string | null
          id?: string
          onboarding_completed?: boolean | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount: number | null
          archived: boolean | null
          category: string | null
          created_at: string | null
          expiry_date: string | null
          gift_card_balance: number | null
          gift_card_code: string | null
          gift_card_value: number | null
          guide_generated: boolean | null
          guide_url: string | null
          has_warranty: boolean | null
          id: string
          image_url: string
          is_used: boolean | null
          maintenance_priority: string | null
          notes: string | null
          processing_status: string | null
          product_name: string | null
          purchase_date: string | null
          raw_ocr_data: Json | null
          receipt_type: string | null
          return_until: string | null
          shop_name: string | null
          status: string | null
          updated_at: string | null
          used_date: string | null
          user_id: string
          warranty_notified_30d: boolean | null
          warranty_notified_7d: boolean | null
          warranty_until: string | null
        }
        Insert: {
          amount?: number | null
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          gift_card_balance?: number | null
          gift_card_code?: string | null
          gift_card_value?: number | null
          guide_generated?: boolean | null
          guide_url?: string | null
          has_warranty?: boolean | null
          id?: string
          image_url: string
          is_used?: boolean | null
          maintenance_priority?: string | null
          notes?: string | null
          processing_status?: string | null
          product_name?: string | null
          purchase_date?: string | null
          raw_ocr_data?: Json | null
          receipt_type?: string | null
          return_until?: string | null
          shop_name?: string | null
          status?: string | null
          updated_at?: string | null
          used_date?: string | null
          user_id: string
          warranty_notified_30d?: boolean | null
          warranty_notified_7d?: boolean | null
          warranty_until?: string | null
        }
        Update: {
          amount?: number | null
          archived?: boolean | null
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          gift_card_balance?: number | null
          gift_card_code?: string | null
          gift_card_value?: number | null
          guide_generated?: boolean | null
          guide_url?: string | null
          has_warranty?: boolean | null
          id?: string
          image_url?: string
          is_used?: boolean | null
          maintenance_priority?: string | null
          notes?: string | null
          processing_status?: string | null
          product_name?: string | null
          purchase_date?: string | null
          raw_ocr_data?: Json | null
          receipt_type?: string | null
          return_until?: string | null
          shop_name?: string | null
          status?: string | null
          updated_at?: string | null
          used_date?: string | null
          user_id?: string
          warranty_notified_30d?: boolean | null
          warranty_notified_7d?: boolean | null
          warranty_until?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          notification_enabled: boolean | null
          notification_time: string | null
          push_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          notification_enabled?: boolean | null
          notification_time?: string | null
          push_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          notification_enabled?: boolean | null
          notification_time?: string | null
          push_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_account: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
