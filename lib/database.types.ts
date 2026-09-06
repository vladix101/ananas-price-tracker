/**
 * Hand-written to mirror supabase/migrations. Once the project is live you can
 * replace this file wholesale with:
 *
 *   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          is_admin: boolean
          is_paid: boolean
          notify_email: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          is_admin?: boolean
          is_paid?: boolean
          notify_email?: boolean
          created_at?: string
        }
        Update: {
          notify_email?: boolean
        }
        Relationships: []
      }
      tracked_products: {
        Row: {
          id: number
          user_id: string
          product_name: string
          ananas_url: string
          current_price: number | null
          target_price: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          product_name: string
          ananas_url: string
          current_price?: number | null
          target_price?: number | null
          is_active?: boolean
        }
        Update: {
          product_name?: string
          current_price?: number | null
          target_price?: number | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'tracked_products_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      price_history: {
        Row: {
          id: number
          tracked_product_id: number
          price: number
          scraped_at: string
        }
        Insert: {
          tracked_product_id: number
          price: number
          scraped_at?: string
        }
        Update: never
        // Needed for select('*, price_history(...)') to typecheck: supabase-js
        // resolves embedded resources through this list, not through the SQL.
        Relationships: [
          {
            foreignKeyName: 'price_history_tracked_product_id_fkey'
            columns: ['tracked_product_id']
            isOneToOne: false
            referencedRelation: 'tracked_products'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      free_plan_limit: { Args: Record<string, never>; Returns: number }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export type AppUser = Database['public']['Tables']['users']['Row']
export type TrackedProduct = Database['public']['Tables']['tracked_products']['Row']
export type PriceHistoryRow = Database['public']['Tables']['price_history']['Row']
