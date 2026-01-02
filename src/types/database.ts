export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          username: string | null
          gold: number
          last_daily_claim: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          gold?: number
          last_daily_claim?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          gold?: number
          last_daily_claim?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_weapons: {
        Row: {
          id: string
          user_id: string
          weapon_type_id: string
          weapon_name: string
          base_attack: number
          star_level: number
          total_attack: number
          consecutive_fails: number
          is_destroyed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weapon_type_id: string
          weapon_name: string
          base_attack: number
          star_level?: number
          total_attack: number
          consecutive_fails?: number
          is_destroyed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weapon_type_id?: string
          weapon_name?: string
          base_attack?: number
          star_level?: number
          total_attack?: number
          consecutive_fails?: number
          is_destroyed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      enhancement_history: {
        Row: {
          id: string
          user_id: string
          weapon_id: string | null
          weapon_name: string
          from_level: number
          to_level: number
          result: 'success' | 'maintain' | 'destroy'
          was_chance_time: boolean
          gold_spent: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weapon_id?: string | null
          weapon_name: string
          from_level: number
          to_level: number
          result: 'success' | 'maintain' | 'destroy'
          was_chance_time?: boolean
          gold_spent?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weapon_id?: string | null
          weapon_name?: string
          from_level?: number
          to_level?: number
          result?: 'success' | 'maintain' | 'destroy'
          was_chance_time?: boolean
          gold_spent?: number
          created_at?: string
        }
      }
      daily_battles: {
        Row: {
          id: string
          user_id: string
          battle_date: string
          battle_count: number
          wins: number
          losses: number
          gold_earned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          battle_date?: string
          battle_count?: number
          wins?: number
          losses?: number
          gold_earned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          battle_date?: string
          battle_count?: number
          wins?: number
          losses?: number
          gold_earned?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      recent_enhancements: {
        Row: {
          id: string
          username: string
          weapon_name: string
          from_level: number
          to_level: number
          result: string
          was_chance_time: boolean
          created_at: string
        }
      }
    }
  }
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserWeaponDB = Database['public']['Tables']['user_weapons']['Row']
export type EnhancementHistory = Database['public']['Tables']['enhancement_history']['Row']
export type DailyBattle = Database['public']['Tables']['daily_battles']['Row']
export type RecentEnhancement = Database['public']['Views']['recent_enhancements']['Row']
