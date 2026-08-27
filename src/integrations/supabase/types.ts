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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          amount: number
          category: string
          couple_id: string
          created_at: string
          due_day: number
          id: string
          last_paid_on: string | null
          next_due_on: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          couple_id: string
          created_at?: string
          due_day?: number
          id?: string
          last_paid_on?: string | null
          next_due_on?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          couple_id?: string
          created_at?: string
          due_day?: number
          id?: string
          last_paid_on?: string | null
          next_due_on?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_list: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          done: boolean
          done_on: string | null
          id: string
          notes: string | null
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          done?: boolean
          done_on?: string | null
          id?: string
          notes?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          done?: boolean
          done_on?: string | null
          id?: string
          notes?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_goals: {
        Row: {
          category: string
          couple_id: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
        }
        Insert: {
          category: string
          couple_id: string
          created_at?: string
          id?: string
          monthly_limit: number
          updated_at?: string
        }
        Update: {
          category?: string
          couple_id?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_logs: {
        Row: {
          commitment_id: string
          couple_id: string
          created_at: string
          id: string
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commitment_id: string
          couple_id: string
          created_at?: string
          id?: string
          log_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commitment_id?: string
          couple_id?: string
          created_at?: string
          id?: string
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_logs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_logs_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          active: boolean
          couple_id: string
          created_at: string
          id: string
          reminder_time: string
          schedule_type: string
          shared: boolean
          title: string
          updated_at: string
          user_id: string
          weekday: number | null
          weekly_target: number | null
        }
        Insert: {
          active?: boolean
          couple_id: string
          created_at?: string
          id?: string
          reminder_time?: string
          schedule_type?: string
          shared?: boolean
          title: string
          updated_at?: string
          user_id: string
          weekday?: number | null
          weekly_target?: number | null
        }
        Update: {
          active?: boolean
          couple_id?: string
          created_at?: string
          id?: string
          reminder_time?: string
          schedule_type?: string
          shared?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          weekday?: number | null
          weekly_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      cooldowns: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          feeling: string
          id: string
          need: string
          responsibility: string
          shared: boolean
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          feeling?: string
          id?: string
          need?: string
          responsibility?: string
          shared?: boolean
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          feeling?: string
          id?: string
          need?: string
          responsibility?: string
          shared?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooldowns_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      cycle_logs: {
        Row: {
          couple_id: string | null
          created_at: string
          cycle_length: number
          id: string
          notes: string | null
          period_length: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          cycle_length?: number
          id?: string
          notes?: string | null
          period_length?: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          cycle_length?: number
          id?: string
          notes?: string | null
          period_length?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_logs_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ideas: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          done: boolean
          id: string
          is_private_note: boolean
          notes: string | null
          planned_for: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          done?: boolean
          id?: string
          is_private_note?: boolean
          notes?: string | null
          planned_for?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          done?: boolean
          id?: string
          is_private_note?: boolean
          notes?: string | null
          planned_for?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_ideas_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          body: string
          couple_id: string
          created_at: string
          created_by: string
          entry_date: string
          id: string
          mood: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          couple_id: string
          created_at?: string
          created_by: string
          entry_date?: string
          id?: string
          mood?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          entry_date?: string
          id?: string
          mood?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          event_date: string
          event_time: string | null
          id: string
          kind: string
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          event_date: string
          event_time?: string | null
          id?: string
          kind?: string
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          event_date?: string
          event_time?: string | null
          id?: string
          kind?: string
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          couple_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          paid_by: string
          spent_on: string
          split_ratio: number
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          couple_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          paid_by: string
          spent_on?: string
          split_ratio?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          paid_by?: string
          spent_on?: string
          split_ratio?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          finished_at: string | null
          id: string
          is_draw: boolean
          kind: string
          state: Json
          status: string
          task: string
          turn: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          finished_at?: string | null
          id?: string
          is_draw?: boolean
          kind: string
          state?: Json
          status?: string
          task?: string
          turn?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          finished_at?: string | null
          id?: string
          is_draw?: boolean
          kind?: string
          state?: Json
          status?: string
          task?: string
          turn?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          progress: number
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          progress?: number
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          progress?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          accuracy: number | null
          couple_id: string | null
          created_at: string
          lat: number
          lng: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          couple_id?: string | null
          created_at?: string
          lat: number
          lng: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          couple_id?: string | null
          created_at?: string
          lat?: number
          lng?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_path: string | null
          body: string
          couple_id: string
          created_at: string
          created_by: string
          duration_ms: number | null
          id: string
          read_at: string | null
          updated_at: string
        }
        Insert: {
          audio_path?: string | null
          body?: string
          couple_id: string
          created_at?: string
          created_by: string
          duration_ms?: number | null
          id?: string
          read_at?: string | null
          updated_at?: string
        }
        Update: {
          audio_path?: string | null
          body?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          duration_ms?: number | null
          id?: string
          read_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          body: string
          couple_id: string
          created_at: string
          created_by: string
          id: string
          photo_id: string
          updated_at: string
        }
        Insert: {
          body: string
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          photo_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          photo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reactions: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          kind: string
          photo_id: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          kind: string
          photo_id: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          kind?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reactions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_reactions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          album: string | null
          body: string | null
          caption: string | null
          couple_id: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          location: string | null
          storage_path: string | null
          taken_on: string
          updated_at: string
        }
        Insert: {
          album?: string | null
          body?: string | null
          caption?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          location?: string | null
          storage_path?: string | null
          taken_on?: string
          updated_at?: string
        }
        Update: {
          album?: string | null
          body?: string | null
          caption?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          location?: string | null
          storage_path?: string | null
          taken_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adult_confirmed: boolean
          anniversary_date: string | null
          avatar_url: string | null
          birthday: string | null
          couple_id: string | null
          created_at: string
          display_name: string
          id: string
          is_premium: boolean
          premium_until: string | null
          share_cycle: boolean
          share_location: boolean
          song_artist: string | null
          song_title: string | null
          spicy_enabled: boolean
          updated_at: string
        }
        Insert: {
          adult_confirmed?: boolean
          anniversary_date?: string | null
          avatar_url?: string | null
          birthday?: string | null
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id: string
          is_premium?: boolean
          premium_until?: string | null
          share_cycle?: boolean
          share_location?: boolean
          song_artist?: string | null
          song_title?: string | null
          spicy_enabled?: boolean
          updated_at?: string
        }
        Update: {
          adult_confirmed?: boolean
          anniversary_date?: string | null
          avatar_url?: string | null
          birthday?: string | null
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_premium?: boolean
          premium_until?: string | null
          share_cycle?: boolean
          share_location?: boolean
          song_artist?: string | null
          song_title?: string | null
          spicy_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      question_answers: {
        Row: {
          answer_date: string
          body: string
          couple_id: string
          created_at: string
          created_by: string
          id: string
          question_id: string
          seen_by_partner: boolean
          updated_at: string
        }
        Insert: {
          answer_date?: string
          body: string
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          question_id: string
          seen_by_partner?: boolean
          updated_at?: string
        }
        Update: {
          answer_date?: string
          body?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          question_id?: string
          seen_by_partner?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          day_index: number
          id: string
          occasion: string | null
          prompt: string
        }
        Insert: {
          day_index: number
          id?: string
          occasion?: string | null
          prompt: string
        }
        Update: {
          day_index?: number
          id?: string
          occasion?: string | null
          prompt?: string
        }
        Relationships: []
      }
      redeem_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      room_items: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          id: string
          item_key: string
          rotation: number
          scale: number
          updated_at: string
          x: number
          y: number
          z: number
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          item_key: string
          rotation?: number
          scale?: number
          updated_at?: string
          x?: number
          y?: number
          z?: number
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          item_key?: string
          rotation?: number
          scale?: number
          updated_at?: string
          x?: number
          y?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      room_unlocks: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          item_key: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          item_key: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          item_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_unlocks_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          background_key: string | null
          couple_id: string
          created_at: string
          love_points: number
          pet_positions: Json
          pet_scales: Json
          pet_z: Json
          plant_growth: number
          plant_watered_on: string | null
          seed_character: string | null
          seed_color: string | null
          updated_at: string
        }
        Insert: {
          background_key?: string | null
          couple_id: string
          created_at?: string
          love_points?: number
          pet_positions?: Json
          pet_scales?: Json
          pet_z?: Json
          plant_growth?: number
          plant_watered_on?: string | null
          seed_character?: string | null
          seed_color?: string | null
          updated_at?: string
        }
        Update: {
          background_key?: string | null
          couple_id?: string
          created_at?: string
          love_points?: number
          pet_positions?: Json
          pet_scales?: Json
          pet_z?: Json
          plant_growth?: number
          plant_watered_on?: string | null
          seed_character?: string | null
          seed_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: true
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_contributions: {
        Row: {
          amount: number
          couple_id: string
          created_at: string
          created_by: string
          goal_id: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          couple_id: string
          created_at?: string
          created_by: string
          goal_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          couple_id?: string
          created_at?: string
          created_by?: string
          goal_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_contributions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          target_amount: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          done: boolean
          due_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          done?: boolean
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_couple_id: { Args: never; Returns: string }
      generate_redeem_code: {
        Args: { _valid_hours?: number }
        Returns: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          used_at: string | null
          used_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "redeem_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_couple: { Args: { _code: string }; Returns: string }
      redeem_premium: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
