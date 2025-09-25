import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'manager' | 'user'
          department: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'user'
          department?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'user'
          department?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string | null
          target_completion_date: string | null
          status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
          department: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date?: string | null
          target_completion_date?: string | null
          status?: 'planning' | 'in_progress' | 'completed' | 'on_hold'
          department?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string | null
          target_completion_date?: string | null
          status?: 'planning' | 'in_progress' | 'completed' | 'on_hold'
          department?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_assignments: {
        Row: {
          id: string
          project_id: string
          user_id: string
          assigned_by: string
          assigned_at: string | null
          role: 'viewer' | 'worker' | 'manager'
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          assigned_by: string
          assigned_at?: string | null
          role?: 'viewer' | 'worker' | 'manager'
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          assigned_by?: string
          assigned_at?: string | null
          role?: 'viewer' | 'worker' | 'manager'
        }
      }
      assemblies: {
        Row: {
          id: string
          project_id: string
          poz_code: string
          description: string | null
          total_quantity: number
          weight_per_unit: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          poz_code: string
          description?: string | null
          total_quantity?: number
          weight_per_unit?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          poz_code?: string
          description?: string | null
          total_quantity?: number
          weight_per_unit?: number
          created_at?: string
        }
      }
      work_stages: {
        Row: {
          id: string
          name: string
          display_order: number
          color: string
        }
        Insert: {
          id?: string
          name: string
          display_order: number
          color?: string
        }
        Update: {
          id?: string
          name?: string
          display_order?: number
          color?: string
        }
      }
      progress_entries: {
        Row: {
          id: string
          assembly_id: string
          work_stage_id: string
          quantity_completed: number
          worker_name: string | null
          user_id: string | null
          completion_date: string
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          assembly_id: string
          work_stage_id: string
          quantity_completed?: number
          worker_name?: string | null
          user_id?: string | null
          completion_date?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          assembly_id?: string
          work_stage_id?: string
          quantity_completed?: number
          worker_name?: string | null
          user_id?: string | null
          completion_date?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      project_task_assignments: {
        Row: {
          id: string
          project_id: string
          user_id: string
          work_stage_id: string
          assigned_by: string
          assigned_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          work_stage_id: string
          assigned_by: string
          assigned_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          work_stage_id?: string
          assigned_by?: string
          assigned_at?: string | null
        }
      }
    }
  }
}