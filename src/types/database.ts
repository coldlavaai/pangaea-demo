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
      advert_templates: {
        Row: {
          body_copy: string
          call_to_action: string | null
          created_at: string | null
          created_by: string | null
          headline: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          platform: Database["public"]["Enums"]["advert_platform"]
          salary_range_max: number | null
          salary_range_min: number | null
          target_locations: string[] | null
          trade_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          body_copy: string
          call_to_action?: string | null
          created_at?: string | null
          created_by?: string | null
          headline: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          platform: Database["public"]["Enums"]["advert_platform"]
          salary_range_max?: number | null
          salary_range_min?: number | null
          target_locations?: string[] | null
          trade_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          body_copy?: string
          call_to_action?: string | null
          created_at?: string | null
          created_by?: string | null
          headline?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          platform?: Database["public"]["Enums"]["advert_platform"]
          salary_range_max?: number | null
          salary_range_min?: number | null
          target_locations?: string[] | null
          trade_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advert_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advert_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advert_templates_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      adverts: {
        Row: {
          applications: number | null
          budget: number | null
          clicks: number | null
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          impressions: number | null
          labour_request_id: string | null
          organization_id: string
          platform: Database["public"]["Enums"]["advert_platform"]
          spend_to_date: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["advert_status"] | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          applications?: number | null
          budget?: number | null
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          impressions?: number | null
          labour_request_id?: string | null
          organization_id: string
          platform: Database["public"]["Enums"]["advert_platform"]
          spend_to_date?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["advert_status"] | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          applications?: number | null
          budget?: number | null
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          impressions?: number | null
          labour_request_id?: string | null
          organization_id?: string
          platform?: Database["public"]["Enums"]["advert_platform"]
          spend_to_date?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["advert_status"] | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adverts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverts_labour_request_id_fkey"
            columns: ["labour_request_id"]
            isOneToOne: false
            referencedRelation: "labour_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "advert_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          allocation_id: string | null
          body: string | null
          created_at: string | null
          document_id: string | null
          id: string
          is_read: boolean | null
          labour_request_id: string | null
          operative_id: string | null
          organization_id: string
          read_at: string | null
          read_by: string | null
          site_id: string | null
          title: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          allocation_id?: string | null
          body?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_read?: boolean | null
          labour_request_id?: string | null
          operative_id?: string | null
          organization_id: string
          read_at?: string | null
          read_by?: string | null
          site_id?: string | null
          title: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          allocation_id?: string | null
          body?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_read?: boolean | null
          labour_request_id?: string | null
          operative_id?: string | null
          organization_id?: string
          read_at?: string | null
          read_by?: string | null
          site_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_labour_request_id_fkey"
            columns: ["labour_request_id"]
            isOneToOne: false
            referencedRelation: "labour_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      allocations: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          agreed_day_rate: number | null
          allocated_by: string | null
          broadcast_rank: number | null
          charge_rate: number | null
          created_at: string | null
          end_date: string | null
          id: string
          induction_complete: boolean | null
          induction_completed: boolean | null
          induction_completed_at: string | null
          induction_data: Json | null
          induction_sent_at: string | null
          induction_token: string | null
          induction_url: string | null
          labour_request_id: string | null
          notes: string | null
          offer_expires_at: string | null
          offer_responded_at: string | null
          offer_sent_at: string | null
          operative_id: string
          organization_id: string
          site_id: string
          start_date: string
          status: Database["public"]["Enums"]["allocation_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          agreed_day_rate?: number | null
          allocated_by?: string | null
          broadcast_rank?: number | null
          charge_rate?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          induction_complete?: boolean | null
          induction_completed?: boolean | null
          induction_completed_at?: string | null
          induction_data?: Json | null
          induction_sent_at?: string | null
          induction_token?: string | null
          induction_url?: string | null
          labour_request_id?: string | null
          notes?: string | null
          offer_expires_at?: string | null
          offer_responded_at?: string | null
          offer_sent_at?: string | null
          operative_id: string
          organization_id: string
          site_id: string
          start_date: string
          status?: Database["public"]["Enums"]["allocation_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          agreed_day_rate?: number | null
          allocated_by?: string | null
          broadcast_rank?: number | null
          charge_rate?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          induction_complete?: boolean | null
          induction_completed?: boolean | null
          induction_completed_at?: string | null
          induction_data?: Json | null
          induction_sent_at?: string | null
          induction_token?: string | null
          induction_url?: string | null
          labour_request_id?: string | null
          notes?: string | null
          offer_expires_at?: string | null
          offer_responded_at?: string | null
          offer_sent_at?: string | null
          operative_id?: string
          organization_id?: string
          site_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["allocation_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_labour_request_id_fkey"
            columns: ["labour_request_id"]
            isOneToOne: false
            referencedRelation: "labour_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          rich_data: Json | null
          role: string
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          rich_data?: Json | null
          role: string
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          rich_data?: Json | null
          role?: string
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_settings: {
        Row: {
          category: string
          description: string
          enabled: boolean
          feature_key: string
          id: string
          organization_id: string
        }
        Insert: {
          category: string
          description: string
          enabled?: boolean
          feature_key: string
          id?: string
          organization_id: string
        }
        Update: {
          category?: string
          description?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_tasks: {
        Row: {
          assigned_to: string
          conversation_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          reminder_at: string | null
          reminder_sent: boolean
          status: string
          title: string
        }
        Insert: {
          assigned_to: string
          conversation_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          reminder_at?: string | null
          reminder_sent?: boolean
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          reminder_at?: string | null
          reminder_sent?: boolean
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          allocation_id: string | null
          arrived_at: string | null
          attendance_date: string
          confirmed_by: string | null
          confirmed_via: string | null
          created_at: string | null
          id: string
          notes: string | null
          operative_id: string
          organization_id: string
          shift_id: string | null
          site_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          allocation_id?: string | null
          arrived_at?: string | null
          attendance_date?: string
          confirmed_by?: string | null
          confirmed_via?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operative_id: string
          organization_id: string
          shift_id?: string | null
          site_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          allocation_id?: string | null
          arrived_at?: string | null
          attendance_date?: string
          confirmed_by?: string | null
          confirmed_via?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operative_id?: string
          organization_id?: string
          shift_id?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_by_role: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_by_role?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_by_role?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          completed_at: string | null
          context: Json | null
          expires_at: string | null
          id: string
          language: string | null
          operative_id: string | null
          organization_id: string
          outcome: Database["public"]["Enums"]["conversation_outcome"] | null
          phone_number: string
          started_at: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          expires_at?: string | null
          id?: string
          language?: string | null
          operative_id?: string | null
          organization_id: string
          outcome?: Database["public"]["Enums"]["conversation_outcome"] | null
          phone_number: string
          started_at?: string | null
          state?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          expires_at?: string | null
          id?: string
          language?: string | null
          operative_id?: string | null
          organization_id?: string
          outcome?: Database["public"]["Enums"]["conversation_outcome"] | null
          phone_number?: string
          started_at?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_runs: {
        Row: {
          id: string
          job_type: string
          ran_at: string | null
          result: Json | null
          run_date: string
        }
        Insert: {
          id?: string
          job_type: string
          ran_at?: string | null
          result?: Json | null
          run_date?: string
        }
        Update: {
          id?: string
          job_type?: string
          ran_at?: string | null
          result?: Json | null
          run_date?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string | null
          file_key: string | null
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          operative_id: string
          organization_id: string
          rejection_reason: string | null
          rtw_share_code: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_key?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          operative_id: string
          organization_id: string
          rejection_reason?: string | null
          rtw_share_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_key?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          operative_id?: string
          organization_id?: string
          rejection_reason?: string | null
          rtw_share_code?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_integrations: {
        Row: {
          access_token: string
          created_at: string | null
          display_name: string | null
          email_address: string
          id: string
          organization_id: string
          provider: string
          refresh_token: string
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          display_name?: string | null
          email_address: string
          id?: string
          organization_id: string
          provider?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          display_name?: string | null
          email_address?: string
          id?: string
          organization_id?: string
          provider?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          organization_id: string
          status: string
          subject: string
          template: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          organization_id: string
          status?: string
          subject: string
          template: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          organization_id?: string
          status?: string
          subject?: string
          template?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          id: string
          organization_id: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body_html: string
          id?: string
          organization_id: string
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          id?: string
          organization_id?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          created_count: number
          errors: Json | null
          failed_count: number
          filename: string
          id: string
          imported_by: string
          organization_id: string
          skipped_count: number
          skipped_rows: Json | null
          total_rows: number
          warned_rows: Json | null
        }
        Insert: {
          created_at?: string
          created_count?: number
          errors?: Json | null
          failed_count?: number
          filename: string
          id?: string
          imported_by: string
          organization_id: string
          skipped_count?: number
          skipped_rows?: Json | null
          total_rows: number
          warned_rows?: Json | null
        }
        Update: {
          created_at?: string
          created_count?: number
          errors?: Json | null
          failed_count?: number
          filename?: string
          id?: string
          imported_by?: string
          organization_id?: string
          skipped_count?: number
          skipped_rows?: Json | null
          total_rows?: number
          warned_rows?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_dedup: {
        Row: {
          external_id: string
          organization_id: string
          received_at: string | null
        }
        Insert: {
          external_id: string
          organization_id: string
          received_at?: string | null
        }
        Update: {
          external_id?: string
          organization_id?: string
          received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_dedup_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_requests: {
        Row: {
          cascade_lock: boolean | null
          created_at: string | null
          day_rate: number | null
          duration_weeks: number | null
          end_date: string | null
          finish_reminder_sent: boolean | null
          headcount_filled: number
          headcount_required: number
          id: string
          notes: string | null
          organization_id: string
          requested_by: string | null
          required_certs: string[] | null
          required_skills: string[] | null
          site_id: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"] | null
          trade_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          cascade_lock?: boolean | null
          created_at?: string | null
          day_rate?: number | null
          duration_weeks?: number | null
          end_date?: string | null
          finish_reminder_sent?: boolean | null
          headcount_filled?: number
          headcount_required?: number
          id?: string
          notes?: string | null
          organization_id: string
          requested_by?: string | null
          required_certs?: string[] | null
          required_skills?: string[] | null
          site_id: string
          start_date: string
          status?: Database["public"]["Enums"]["request_status"] | null
          trade_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cascade_lock?: boolean | null
          created_at?: string | null
          day_rate?: number | null
          duration_weeks?: number | null
          end_date?: string | null
          finish_reminder_sent?: boolean | null
          headcount_filled?: number
          headcount_required?: number
          id?: string
          notes?: string | null
          organization_id?: string
          requested_by?: string | null
          required_certs?: string[] | null
          required_skills?: string[] | null
          site_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          trade_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labour_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_requests_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          active_workflow_id: string | null
          created_at: string | null
          deferred_message: string | null
          id: string
          intake_data: Json | null
          intake_state: string | null
          language: string | null
          last_inbound_at: string | null
          last_message: string | null
          last_message_at: string | null
          operative_id: string | null
          organization_id: string
          phone_number: string
          staff_user_id: string | null
          unread_count: number | null
        }
        Insert: {
          active_workflow_id?: string | null
          created_at?: string | null
          deferred_message?: string | null
          id?: string
          intake_data?: Json | null
          intake_state?: string | null
          language?: string | null
          last_inbound_at?: string | null
          last_message?: string | null
          last_message_at?: string | null
          operative_id?: string | null
          organization_id: string
          phone_number: string
          staff_user_id?: string | null
          unread_count?: number | null
        }
        Update: {
          active_workflow_id?: string | null
          created_at?: string | null
          deferred_message?: string | null
          id?: string
          intake_data?: Json | null
          intake_state?: string | null
          language?: string | null
          last_inbound_at?: string | null
          last_message?: string | null
          last_message_at?: string | null
          operative_id?: string | null
          organization_id?: string
          phone_number?: string
          staff_user_id?: string | null
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_active_workflow_id_fkey"
            columns: ["active_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          body_en: string | null
          channel: Database["public"]["Enums"]["message_channel"] | null
          created_at: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_message: string | null
          external_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          operative_id: string | null
          organization_id: string
          status: string | null
          thread_id: string
        }
        Insert: {
          body?: string | null
          body_en?: string | null
          channel?: Database["public"]["Enums"]["message_channel"] | null
          created_at?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          external_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          operative_id?: string | null
          organization_id: string
          status?: string | null
          thread_id: string
        }
        Update: {
          body?: string | null
          body_en?: string | null
          channel?: Database["public"]["Enums"]["message_channel"] | null
          created_at?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          external_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          operative_id?: string | null
          organization_id?: string
          status?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_comments: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          ncr_id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          comment: string
          created_at?: string
          id?: string
          ncr_id: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          ncr_id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_comments_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "non_conformance_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformance_incidents: {
        Row: {
          allocation_id: string | null
          auto_blocked: boolean | null
          created_at: string | null
          description: string
          id: string
          incident_date: string
          incident_time: string | null
          incident_type: Database["public"]["Enums"]["ncr_type"]
          operative_id: string
          organization_id: string
          reference_number: string | null
          reported_by: string | null
          reported_via: string | null
          reporter_name: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["ncr_severity"]
          site_id: string | null
          witness_name: string | null
        }
        Insert: {
          allocation_id?: string | null
          auto_blocked?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          incident_date: string
          incident_time?: string | null
          incident_type: Database["public"]["Enums"]["ncr_type"]
          operative_id: string
          organization_id: string
          reference_number?: string | null
          reported_by?: string | null
          reported_via?: string | null
          reporter_name?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["ncr_severity"]
          site_id?: string | null
          witness_name?: string | null
        }
        Update: {
          allocation_id?: string | null
          auto_blocked?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          incident_date?: string
          incident_time?: string | null
          incident_type?: Database["public"]["Enums"]["ncr_type"]
          operative_id?: string
          organization_id?: string
          reference_number?: string | null
          reported_by?: string | null
          reported_via?: string | null
          reporter_name?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["ncr_severity"]
          site_id?: string | null
          witness_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformance_incidents_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_incidents_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformance_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          labour_request_id: string | null
          link_url: string | null
          ncr_id: string | null
          operative_id: string | null
          organization_id: string
          read: boolean | null
          read_at: string | null
          severity: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          labour_request_id?: string | null
          link_url?: string | null
          ncr_id?: string | null
          operative_id?: string | null
          organization_id: string
          read?: boolean | null
          read_at?: string | null
          severity?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          labour_request_id?: string | null
          link_url?: string | null
          ncr_id?: string | null
          operative_id?: string | null
          organization_id?: string
          read?: boolean | null
          read_at?: string | null
          severity?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_labour_request_id_fkey"
            columns: ["labour_request_id"]
            isOneToOne: false
            referencedRelation: "labour_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "non_conformance_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operative_cards: {
        Row: {
          card_number: string | null
          card_scheme: string
          card_type: string | null
          categories: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          operative_id: string
          organization_id: string
          scheme_name: string | null
        }
        Insert: {
          card_number?: string | null
          card_scheme: string
          card_type?: string | null
          categories?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          operative_id: string
          organization_id: string
          scheme_name?: string | null
        }
        Update: {
          card_number?: string | null
          card_scheme?: string
          card_type?: string | null
          categories?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          operative_id?: string
          organization_id?: string
          scheme_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operative_cards_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operative_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operative_cscs_cards: {
        Row: {
          card_description: string | null
          card_number: string | null
          card_title: string | null
          card_type: Database["public"]["Enums"]["cscs_card_type"]
          created_at: string
          expiry_date: string | null
          id: string
          is_primary: boolean
          operative_id: string
          organization_id: string
          scheme: string | null
        }
        Insert: {
          card_description?: string | null
          card_number?: string | null
          card_title?: string | null
          card_type: Database["public"]["Enums"]["cscs_card_type"]
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_primary?: boolean
          operative_id: string
          organization_id: string
          scheme?: string | null
        }
        Update: {
          card_description?: string | null
          card_number?: string | null
          card_title?: string | null
          card_type?: Database["public"]["Enums"]["cscs_card_type"]
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_primary?: boolean
          operative_id?: string
          organization_id?: string
          scheme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operative_cscs_cards_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operative_cscs_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operative_pay_rates: {
        Row: {
          changed_by: string | null
          contract_duration_weeks: number | null
          created_at: string | null
          day_rate: number
          effective_date: string
          grade: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          operative_id: string
          organization_id: string
          quartile: string | null
          rate_type: string
          rationale: string | null
        }
        Insert: {
          changed_by?: string | null
          contract_duration_weeks?: number | null
          created_at?: string | null
          day_rate: number
          effective_date?: string
          grade?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          operative_id: string
          organization_id: string
          quartile?: string | null
          rate_type: string
          rationale?: string | null
        }
        Update: {
          changed_by?: string | null
          contract_duration_weeks?: number | null
          created_at?: string | null
          day_rate?: number
          effective_date?: string
          grade?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          operative_id?: string
          organization_id?: string
          quartile?: string | null
          rate_type?: string
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operative_pay_rates_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operative_pay_rates_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operative_pay_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operative_trades: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          notes: string | null
          operative_id: string
          organization_id: string
          skill_level: Database["public"]["Enums"]["trade_skill_level"] | null
          trade_category_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          operative_id: string
          organization_id: string
          skill_level?: Database["public"]["Enums"]["trade_skill_level"] | null
          trade_category_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          operative_id?: string
          organization_id?: string
          skill_level?: Database["public"]["Enums"]["trade_skill_level"] | null
          trade_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operative_trades_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operative_trades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operative_trades_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      operatives: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agency_id: string | null
          agency_name: string | null
          avg_rap_score: number | null
          bank_account_number: string | null
          bank_sort_code: string | null
          blocked_at: string | null
          blocked_reason: string | null
          caution_reason: string | null
          charge_rate: number | null
          city: string | null
          compliance_alert: string | null
          county: string | null
          created_at: string | null
          created_by: string | null
          cscs_card_description: string | null
          cscs_card_number: string | null
          cscs_card_title: string | null
          cscs_card_type: Database["public"]["Enums"]["cscs_card_type"] | null
          cscs_expiry: string | null
          cv_summary: string | null
          data_completeness_score: number | null
          date_of_birth: string | null
          day_rate: number | null
          document_upload_token: string | null
          document_upload_token_expires_at: string | null
          email: string | null
          engagement_method:
            | Database["public"]["Enums"]["engagement_method"]
            | null
          entry_source: Database["public"]["Enums"]["operative_entry_source"]
          experience_years: number | null
          first_name: string
          gender: string | null
          gov_rtw_checked: boolean | null
          gov_rtw_checked_at: string | null
          grade: Database["public"]["Enums"]["operative_grade"] | null
          has_verified_photo_id: boolean
          has_verified_rtw: boolean
          hourly_rate: number | null
          id: string
          id_document_number: string | null
          id_expiry: string | null
          labour_type: Database["public"]["Enums"]["labour_type"] | null
          languages: string[] | null
          last_contacted_at: string | null
          last_name: string
          last_reply_at: string | null
          last_upload_at: string | null
          last_worked_date: string | null
          lat: number | null
          lng: number | null
          machine_operator: boolean | null
          medical_notes: string | null
          min_acceptable_rate: number | null
          nationality: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          ni_number: string | null
          notes: string | null
          onboarding_blue_sticker_issued: boolean | null
          onboarding_buddy_allocated: boolean | null
          onboarding_induction_complete: boolean | null
          onboarding_two_week_review: boolean | null
          organization_id: string
          other_certifications: string | null
          phone: string | null
          postcode: string | null
          preferred_language: string | null
          rap_traffic_light: Database["public"]["Enums"]["traffic_light"] | null
          rate_status: string | null
          reemploy_status: Database["public"]["Enums"]["reemploy_status"] | null
          reference_number: string | null
          rtw_expiry: string | null
          rtw_share_code: string | null
          rtw_type: string | null
          rtw_verified: boolean | null
          search_vector: unknown
          source: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["operative_status"] | null
          total_jobs: number | null
          total_reviews: number | null
          trade_category_id: string | null
          trading_name: string | null
          updated_at: string | null
          utr_number: string | null
          wtd_opt_out: boolean | null
          wtd_opt_out_document_id: string | null
          wtd_opt_out_signed_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id?: string | null
          agency_name?: string | null
          avg_rap_score?: number | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          caution_reason?: string | null
          charge_rate?: number | null
          city?: string | null
          compliance_alert?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          cscs_card_description?: string | null
          cscs_card_number?: string | null
          cscs_card_title?: string | null
          cscs_card_type?: Database["public"]["Enums"]["cscs_card_type"] | null
          cscs_expiry?: string | null
          cv_summary?: string | null
          data_completeness_score?: number | null
          date_of_birth?: string | null
          day_rate?: number | null
          document_upload_token?: string | null
          document_upload_token_expires_at?: string | null
          email?: string | null
          engagement_method?:
            | Database["public"]["Enums"]["engagement_method"]
            | null
          entry_source?: Database["public"]["Enums"]["operative_entry_source"]
          experience_years?: number | null
          first_name: string
          gender?: string | null
          gov_rtw_checked?: boolean | null
          gov_rtw_checked_at?: string | null
          grade?: Database["public"]["Enums"]["operative_grade"] | null
          has_verified_photo_id?: boolean
          has_verified_rtw?: boolean
          hourly_rate?: number | null
          id?: string
          id_document_number?: string | null
          id_expiry?: string | null
          labour_type?: Database["public"]["Enums"]["labour_type"] | null
          languages?: string[] | null
          last_contacted_at?: string | null
          last_name: string
          last_reply_at?: string | null
          last_upload_at?: string | null
          last_worked_date?: string | null
          lat?: number | null
          lng?: number | null
          machine_operator?: boolean | null
          medical_notes?: string | null
          min_acceptable_rate?: number | null
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          ni_number?: string | null
          notes?: string | null
          onboarding_blue_sticker_issued?: boolean | null
          onboarding_buddy_allocated?: boolean | null
          onboarding_induction_complete?: boolean | null
          onboarding_two_week_review?: boolean | null
          organization_id: string
          other_certifications?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_language?: string | null
          rap_traffic_light?:
            | Database["public"]["Enums"]["traffic_light"]
            | null
          rate_status?: string | null
          reemploy_status?:
            | Database["public"]["Enums"]["reemploy_status"]
            | null
          reference_number?: string | null
          rtw_expiry?: string | null
          rtw_share_code?: string | null
          rtw_type?: string | null
          rtw_verified?: boolean | null
          search_vector?: unknown
          source?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["operative_status"] | null
          total_jobs?: number | null
          total_reviews?: number | null
          trade_category_id?: string | null
          trading_name?: string | null
          updated_at?: string | null
          utr_number?: string | null
          wtd_opt_out?: boolean | null
          wtd_opt_out_document_id?: string | null
          wtd_opt_out_signed_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id?: string | null
          agency_name?: string | null
          avg_rap_score?: number | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          caution_reason?: string | null
          charge_rate?: number | null
          city?: string | null
          compliance_alert?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          cscs_card_description?: string | null
          cscs_card_number?: string | null
          cscs_card_title?: string | null
          cscs_card_type?: Database["public"]["Enums"]["cscs_card_type"] | null
          cscs_expiry?: string | null
          cv_summary?: string | null
          data_completeness_score?: number | null
          date_of_birth?: string | null
          day_rate?: number | null
          document_upload_token?: string | null
          document_upload_token_expires_at?: string | null
          email?: string | null
          engagement_method?:
            | Database["public"]["Enums"]["engagement_method"]
            | null
          entry_source?: Database["public"]["Enums"]["operative_entry_source"]
          experience_years?: number | null
          first_name?: string
          gender?: string | null
          gov_rtw_checked?: boolean | null
          gov_rtw_checked_at?: string | null
          grade?: Database["public"]["Enums"]["operative_grade"] | null
          has_verified_photo_id?: boolean
          has_verified_rtw?: boolean
          hourly_rate?: number | null
          id?: string
          id_document_number?: string | null
          id_expiry?: string | null
          labour_type?: Database["public"]["Enums"]["labour_type"] | null
          languages?: string[] | null
          last_contacted_at?: string | null
          last_name?: string
          last_reply_at?: string | null
          last_upload_at?: string | null
          last_worked_date?: string | null
          lat?: number | null
          lng?: number | null
          machine_operator?: boolean | null
          medical_notes?: string | null
          min_acceptable_rate?: number | null
          nationality?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          ni_number?: string | null
          notes?: string | null
          onboarding_blue_sticker_issued?: boolean | null
          onboarding_buddy_allocated?: boolean | null
          onboarding_induction_complete?: boolean | null
          onboarding_two_week_review?: boolean | null
          organization_id?: string
          other_certifications?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_language?: string | null
          rap_traffic_light?:
            | Database["public"]["Enums"]["traffic_light"]
            | null
          rate_status?: string | null
          reemploy_status?:
            | Database["public"]["Enums"]["reemploy_status"]
            | null
          reference_number?: string | null
          rtw_expiry?: string | null
          rtw_share_code?: string | null
          rtw_type?: string | null
          rtw_verified?: boolean | null
          search_vector?: unknown
          source?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["operative_status"] | null
          total_jobs?: number | null
          total_reviews?: number | null
          trade_category_id?: string | null
          trading_name?: string | null
          updated_at?: string | null
          utr_number?: string | null
          wtd_opt_out?: boolean | null
          wtd_opt_out_document_id?: string | null
          wtd_opt_out_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_operative_wtd_doc"
            columns: ["wtd_opt_out_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operatives_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operatives_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          allocation_id: string | null
          attitude_score: number
          comment: string | null
          created_at: string | null
          id: string
          operative_id: string
          organization_id: string
          performance_score: number
          rap_average: number | null
          reliability_score: number
          reviewer_id: string | null
          safety_score: number | null
          site_manager_name: string | null
          site_manager_phone: string | null
          submitted_via: string | null
          traffic_light: Database["public"]["Enums"]["traffic_light"] | null
        }
        Insert: {
          allocation_id?: string | null
          attitude_score: number
          comment?: string | null
          created_at?: string | null
          id?: string
          operative_id: string
          organization_id: string
          performance_score: number
          rap_average?: number | null
          reliability_score: number
          reviewer_id?: string | null
          safety_score?: number | null
          site_manager_name?: string | null
          site_manager_phone?: string | null
          submitted_via?: string | null
          traffic_light?: Database["public"]["Enums"]["traffic_light"] | null
        }
        Update: {
          allocation_id?: string | null
          attitude_score?: number
          comment?: string | null
          created_at?: string | null
          id?: string
          operative_id?: string
          organization_id?: string
          performance_score?: number
          rap_average?: number | null
          reliability_score?: number
          reviewer_id?: string | null
          safety_score?: number | null
          site_manager_name?: string | null
          site_manager_phone?: string | null
          submitted_via?: string | null
          traffic_light?: Database["public"]["Enums"]["traffic_light"] | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_break_minutes: number | null
          actual_end: string | null
          actual_start: string | null
          allocation_id: string | null
          break_compliance_flag: boolean | null
          break_minutes: number | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          created_at: string | null
          id: string
          notes: string | null
          operative_id: string
          organization_id: string
          scheduled_end: string
          scheduled_start: string
          site_id: string | null
          status: Database["public"]["Enums"]["shift_status"] | null
          updated_at: string | null
          wtd_hours_flag: boolean | null
          wtd_overnight_flag: boolean | null
        }
        Insert: {
          actual_break_minutes?: number | null
          actual_end?: string | null
          actual_start?: string | null
          allocation_id?: string | null
          break_compliance_flag?: boolean | null
          break_minutes?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operative_id: string
          organization_id: string
          scheduled_end: string
          scheduled_start: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["shift_status"] | null
          updated_at?: string | null
          wtd_hours_flag?: boolean | null
          wtd_overnight_flag?: boolean | null
        }
        Update: {
          actual_break_minutes?: number | null
          actual_end?: string | null
          actual_start?: string | null
          allocation_id?: string | null
          break_compliance_flag?: boolean | null
          break_minutes?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          operative_id?: string
          organization_id?: string
          scheduled_end?: string
          scheduled_start?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["shift_status"] | null
          updated_at?: string | null
          wtd_hours_flag?: boolean | null
          wtd_overnight_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          clicks: number | null
          code: string
          created_at: string | null
          id: string
          target_url: string
        }
        Insert: {
          clicks?: number | null
          code: string
          created_at?: string | null
          id?: string
          target_url: string
        }
        Update: {
          clicks?: number | null
          code?: string
          created_at?: string | null
          id?: string
          target_url?: string
        }
        Relationships: []
      }
      site_manager_sessions: {
        Row: {
          completed_at: string | null
          context: Json | null
          expires_at: string | null
          id: string
          organization_id: string
          phone_number: string
          site_id: string | null
          started_at: string | null
          state: Database["public"]["Enums"]["sm_session_state"]
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          expires_at?: string | null
          id?: string
          organization_id: string
          phone_number: string
          site_id?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["sm_session_state"]
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          phone_number?: string
          site_id?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["sm_session_state"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_manager_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_manager_sessions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_managers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          organization_id: string
          phone: string
          site_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          organization_id: string
          phone: string
          site_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          organization_id?: string
          phone?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_managers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_managers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          key_contacts: Json | null
          lat: number | null
          lng: number | null
          main_duties: string | null
          name: string
          notes: string | null
          organization_id: string
          postcode: string
          project_end_date: string | null
          project_start_date: string | null
          project_value: number | null
          site_manager_email: string | null
          site_manager_name: string | null
          site_manager_phone: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_contacts?: Json | null
          lat?: number | null
          lng?: number | null
          main_duties?: string | null
          name: string
          notes?: string | null
          organization_id: string
          postcode: string
          project_end_date?: string | null
          project_start_date?: string | null
          project_value?: number | null
          site_manager_email?: string | null
          site_manager_name?: string | null
          site_manager_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_contacts?: Json | null
          lat?: number | null
          lng?: number | null
          main_duties?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          postcode?: string
          project_end_date?: string | null
          project_start_date?: string | null
          project_value?: number | null
          site_manager_email?: string | null
          site_manager_name?: string | null
          site_manager_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          adjustment_reason: string | null
          day_rate: number | null
          entry_date: string
          hours_worked: number
          id: string
          is_manual: boolean | null
          notes: string | null
          overtime_hours: number | null
          shift_id: string | null
          timesheet_id: string
        }
        Insert: {
          adjustment_reason?: string | null
          day_rate?: number | null
          entry_date: string
          hours_worked: number
          id?: string
          is_manual?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          shift_id?: string | null
          timesheet_id: string
        }
        Update: {
          adjustment_reason?: string | null
          day_rate?: number | null
          entry_date?: string
          hours_worked?: number
          id?: string
          is_manual?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          shift_id?: string | null
          timesheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          day_rate_used: number | null
          gross_pay: number | null
          id: string
          locked_at: string | null
          locked_by: string | null
          operative_id: string
          organization_id: string
          overtime_hours: number | null
          rejected_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["timesheet_status"] | null
          submitted_at: string | null
          submitted_by: string | null
          total_days: number | null
          total_hours: number | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          day_rate_used?: number | null
          gross_pay?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          operative_id: string
          organization_id: string
          overtime_hours?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_days?: number | null
          total_hours?: number | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          day_rate_used?: number | null
          gross_pay?: number | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          operative_id?: string
          organization_id?: string
          overtime_hours?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_days?: number | null
          total_hours?: number | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_categories: {
        Row: {
          id: string
          is_active: boolean | null
          job_description: string | null
          labour_type: Database["public"]["Enums"]["labour_type"]
          name: string
          organization_id: string
          required_certifications: string[] | null
          sort_order: number | null
          typical_day_rate: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          job_description?: string | null
          labour_type: Database["public"]["Enums"]["labour_type"]
          name: string
          organization_id: string
          required_certifications?: string[] | null
          sort_order?: number | null
          typical_day_rate?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          job_description?: string | null
          labour_type?: Database["public"]["Enums"]["labour_type"]
          name?: string
          organization_id?: string
          required_certifications?: string[] | null
          sort_order?: number | null
          typical_day_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sites: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          can_export: boolean
          can_import: boolean
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          organization_id: string
          phone_number: string | null
          receive_notifications: boolean
          role: Database["public"]["Enums"]["user_role"]
          telegram_chat_id: number | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          can_export?: boolean
          can_import?: boolean
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          organization_id: string
          phone_number?: string | null
          receive_notifications?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: number | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          can_export?: boolean
          can_import?: boolean
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          organization_id?: string
          phone_number?: string | null
          receive_notifications?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          telegram_chat_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_history: {
        Row: {
          created_at: string | null
          description: string | null
          employer: string | null
          end_date: string | null
          id: string
          job_title: string
          operative_id: string
          organization_id: string
          source: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          employer?: string | null
          end_date?: string | null
          id?: string
          job_title: string
          operative_id: string
          organization_id: string
          source?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          employer?: string | null
          end_date?: string | null
          id?: string
          job_title?: string
          operative_id?: string
          organization_id?: string
          source?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_history_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string
          id: string
          target_id: string | null
          workflow_run_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          target_id?: string | null
          workflow_run_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          target_id?: string | null
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "workflow_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          channel: string
          completed_at: string | null
          config: Json
          conversation_id: string | null
          created_at: string
          follow_up_hours: number
          id: string
          max_follow_ups: number
          organization_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["workflow_run_status"]
          targets_completed: number
          targets_contacted: number
          targets_failed: number
          targets_responded: number
          total_targets: number
          triggered_by: string
          triggered_by_user: string | null
          updated_at: string
          workflow_type: string
        }
        Insert: {
          channel?: string
          completed_at?: string | null
          config?: Json
          conversation_id?: string | null
          created_at?: string
          follow_up_hours?: number
          id?: string
          max_follow_ups?: number
          organization_id: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          targets_completed?: number
          targets_contacted?: number
          targets_failed?: number
          targets_responded?: number
          total_targets?: number
          triggered_by?: string
          triggered_by_user?: string | null
          updated_at?: string
          workflow_type: string
        }
        Update: {
          channel?: string
          completed_at?: string | null
          config?: Json
          conversation_id?: string | null
          created_at?: string
          follow_up_hours?: number
          id?: string
          max_follow_ups?: number
          organization_id?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          targets_completed?: number
          targets_contacted?: number
          targets_failed?: number
          targets_responded?: number
          total_targets?: number
          triggered_by?: string
          triggered_by_user?: string | null
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_triggered_by_user_fkey"
            columns: ["triggered_by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_targets: {
        Row: {
          created_at: string
          data: Json
          engagement_state: string | null
          id: string
          last_contacted_at: string | null
          messages_sent: number
          next_follow_up_at: string | null
          operative_id: string
          outcome: string | null
          response_at: string | null
          response_text: string | null
          status: Database["public"]["Enums"]["workflow_target_status"]
          updated_at: string
          workflow_run_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          engagement_state?: string | null
          id?: string
          last_contacted_at?: string | null
          messages_sent?: number
          next_follow_up_at?: string | null
          operative_id: string
          outcome?: string | null
          response_at?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["workflow_target_status"]
          updated_at?: string
          workflow_run_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          engagement_state?: string | null
          id?: string
          last_contacted_at?: string | null
          messages_sent?: number
          next_follow_up_at?: string | null
          operative_id?: string
          outcome?: string | null
          response_at?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["workflow_target_status"]
          updated_at?: string
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_targets_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_targets_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      operative_last_worked: {
        Row: {
          completed_allocations: number | null
          last_worked_date: string | null
          operative_id: string | null
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operative_rap_summary: {
        Row: {
          avg_attitude: number | null
          avg_composite: number | null
          avg_performance: number | null
          avg_reliability: number | null
          latest_review_at: string | null
          operative_id: string | null
          organization_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_operative_id_fkey"
            columns: ["operative_id"]
            isOneToOne: false
            referencedRelation: "operatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_allocation_offer: {
        Args: { p_allocation_id: string; p_operative_phone: string }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_my_org_id: { Args: never; Returns: string }
      get_my_site_ids: { Args: never; Returns: string[] }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      increment_targets_completed: {
        Args: { run_id: string }
        Returns: undefined
      }
      increment_thread_unread: {
        Args: { thread_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      advert_platform: "facebook" | "linkedin" | "indeed" | "other"
      advert_status: "draft" | "active" | "paused" | "ended"
      alert_type:
        | "document_expiring"
        | "document_expired"
        | "operative_blocked_auto"
        | "offer_expired_no_response"
        | "broadcast_exhausted"
        | "new_applicant"
        | "no_show"
        | "ncr_logged"
        | "reallocation_needed"
        | "wtd_warning"
        | "compliance_block"
      allocation_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "no_show"
        | "terminated"
      attendance_status: "arrived" | "no_show" | "late" | "left_early"
      conversation_outcome:
        | "qualified"
        | "rejected_no_rtw"
        | "rejected_under_18"
        | "rejected_no_cscs"
        | "abandoned"
        | "duplicate"
      cscs_card_type: "green" | "blue" | "gold" | "black" | "red" | "white"
      document_status: "pending" | "verified" | "rejected" | "expired"
      document_type:
        | "right_to_work"
        | "photo_id"
        | "cscs_card"
        | "cpcs_ticket"
        | "npors_ticket"
        | "lantra_cert"
        | "first_aid"
        | "asbestos_awareness"
        | "chainsaw_cs30"
        | "chainsaw_cs31"
        | "cv"
        | "other"
      engagement_method:
        | "self_employed"
        | "cis_sole_trader"
        | "limited_company"
        | "agency"
        | "direct_paye"
      labour_type: "blue_collar" | "white_collar"
      message_channel: "whatsapp" | "sms" | "email" | "telegram"
      message_direction: "inbound" | "outbound"
      ncr_severity: "minor" | "major" | "critical"
      ncr_type:
        | "no_show"
        | "walk_off"
        | "late_arrival"
        | "safety_breach"
        | "drugs_alcohol"
        | "conduct_issue"
        | "poor_attitude"
        | "poor_workmanship"
        | "other"
      operative_entry_source:
        | "manual"
        | "import"
        | "sophie"
        | "referral"
        | "other"
      operative_grade:
        | "skilled"
        | "highly_skilled"
        | "exceptional_skill"
        | "specialist_skill"
        | "engineer"
        | "manager"
        | "senior_manager"
        | "contracts_manager"
        | "project_manager"
        | "skilled_landscaper"
        | "groundworker"
        | "site_supervisor"
        | "plant_operator"
        | "operative"
        | "site_manager"
        | "mobile_crew"
        | "agency_labour"
        | "document_controller"
        | "semi_skilled"
      operative_status:
        | "prospect"
        | "qualifying"
        | "pending_docs"
        | "verified"
        | "available"
        | "working"
        | "unavailable"
        | "blocked"
      reemploy_status: "active" | "caution" | "do_not_rehire"
      request_status:
        | "pending"
        | "searching"
        | "partial"
        | "fulfilled"
        | "cancelled"
      shift_status:
        | "scheduled"
        | "published"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      sm_session_state:
        | "idle"
        | "arrival_check_pending"
        | "arrival_late_menu"
        | "ncr_type_pending"
        | "ncr_severity_pending"
        | "ncr_critical_confirm"
        | "ncr_description_pending"
        | "rap_r_pending"
        | "rap_a_pending"
        | "rap_p_pending"
        | "rap_comment_pending"
        | "referral_broadcast_sent"
      timesheet_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "locked"
      trade_skill_level:
        | "trainee"
        | "competent"
        | "skilled"
        | "advanced"
        | "expert"
      traffic_light: "green" | "amber" | "red"
      user_role:
        | "director"
        | "labour_manager"
        | "super_admin"
        | "admin"
        | "staff"
        | "site_manager"
        | "auditor"
        | "project_manager"
      workflow_run_status:
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
        | "failed"
      workflow_target_status:
        | "pending"
        | "contacted"
        | "responded"
        | "completed"
        | "failed"
        | "timed_out"
        | "skipped"
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
      advert_platform: ["facebook", "linkedin", "indeed", "other"],
      advert_status: ["draft", "active", "paused", "ended"],
      alert_type: [
        "document_expiring",
        "document_expired",
        "operative_blocked_auto",
        "offer_expired_no_response",
        "broadcast_exhausted",
        "new_applicant",
        "no_show",
        "ncr_logged",
        "reallocation_needed",
        "wtd_warning",
        "compliance_block",
      ],
      allocation_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "no_show",
        "terminated",
      ],
      attendance_status: ["arrived", "no_show", "late", "left_early"],
      conversation_outcome: [
        "qualified",
        "rejected_no_rtw",
        "rejected_under_18",
        "rejected_no_cscs",
        "abandoned",
        "duplicate",
      ],
      cscs_card_type: ["green", "blue", "gold", "black", "red", "white"],
      document_status: ["pending", "verified", "rejected", "expired"],
      document_type: [
        "right_to_work",
        "photo_id",
        "cscs_card",
        "cpcs_ticket",
        "npors_ticket",
        "lantra_cert",
        "first_aid",
        "asbestos_awareness",
        "chainsaw_cs30",
        "chainsaw_cs31",
        "cv",
        "other",
      ],
      engagement_method: [
        "self_employed",
        "cis_sole_trader",
        "limited_company",
        "agency",
        "direct_paye",
      ],
      labour_type: ["blue_collar", "white_collar"],
      message_channel: ["whatsapp", "sms", "email", "telegram"],
      message_direction: ["inbound", "outbound"],
      ncr_severity: ["minor", "major", "critical"],
      ncr_type: [
        "no_show",
        "walk_off",
        "late_arrival",
        "safety_breach",
        "drugs_alcohol",
        "conduct_issue",
        "poor_attitude",
        "poor_workmanship",
        "other",
      ],
      operative_entry_source: [
        "manual",
        "import",
        "sophie",
        "referral",
        "other",
      ],
      operative_grade: [
        "skilled",
        "highly_skilled",
        "exceptional_skill",
        "specialist_skill",
        "engineer",
        "manager",
        "senior_manager",
        "contracts_manager",
        "project_manager",
        "skilled_landscaper",
        "groundworker",
        "site_supervisor",
        "plant_operator",
        "operative",
        "site_manager",
        "mobile_crew",
        "agency_labour",
        "document_controller",
        "semi_skilled",
      ],
      operative_status: [
        "prospect",
        "qualifying",
        "pending_docs",
        "verified",
        "available",
        "working",
        "unavailable",
        "blocked",
      ],
      reemploy_status: ["active", "caution", "do_not_rehire"],
      request_status: [
        "pending",
        "searching",
        "partial",
        "fulfilled",
        "cancelled",
      ],
      shift_status: [
        "scheduled",
        "published",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      sm_session_state: [
        "idle",
        "arrival_check_pending",
        "arrival_late_menu",
        "ncr_type_pending",
        "ncr_severity_pending",
        "ncr_critical_confirm",
        "ncr_description_pending",
        "rap_r_pending",
        "rap_a_pending",
        "rap_p_pending",
        "rap_comment_pending",
        "referral_broadcast_sent",
      ],
      timesheet_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "locked",
      ],
      trade_skill_level: [
        "trainee",
        "competent",
        "skilled",
        "advanced",
        "expert",
      ],
      traffic_light: ["green", "amber", "red"],
      user_role: [
        "director",
        "labour_manager",
        "super_admin",
        "admin",
        "staff",
        "site_manager",
        "auditor",
        "project_manager",
      ],
      workflow_run_status: [
        "active",
        "paused",
        "completed",
        "cancelled",
        "failed",
      ],
      workflow_target_status: [
        "pending",
        "contacted",
        "responded",
        "completed",
        "failed",
        "timed_out",
        "skipped",
      ],
    },
  },
} as const
