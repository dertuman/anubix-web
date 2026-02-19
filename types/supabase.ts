export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bridge_configs: {
        Row: {
          id: string;
          user_id: string;
          bridge_url: string;
          api_key_encrypted: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bridge_url: string;
          api_key_encrypted: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bridge_url?: string;
          api_key_encrypted?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          bio: string;
          dob: string | null;
          profile_picture: string;
          font: string;
          theme: string;
          language: string;
          is_admin: boolean;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          bio?: string;
          dob?: string | null;
          profile_picture?: string;
          font?: string;
          theme?: string;
          language?: string;
          is_admin?: boolean;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bio?: string;
          dob?: string | null;
          profile_picture?: string;
          font?: string;
          theme?: string;
          language?: string;
          is_admin?: boolean;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          clerk_user_id: string;
          title: string;
          model: string;
          message_count: number;
          is_shared: boolean;
          share_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          title?: string;
          model: string;
          message_count?: number;
          is_shared?: boolean;
          share_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          title?: string;
          model?: string;
          message_count?: number;
          is_shared?: boolean;
          share_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          images: Json | null;
          files: Json | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content?: string;
          images?: Json | null;
          files?: Json | null;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          images?: Json | null;
          files?: Json | null;
          model?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_api_keys: {
        Row: {
          id: string;
          clerk_user_id: string;
          provider: string;
          encrypted_key: string;
          iv: string;
          auth_tag: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          provider: string;
          encrypted_key: string;
          iv: string;
          auth_tag: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          provider?: string;
          encrypted_key?: string;
          iv?: string;
          auth_tag?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cloud_machines: {
        Row: {
          id: string;
          user_id: string;
          fly_app_name: string;
          fly_machine_id: string | null;
          fly_volume_id: string | null;
          fly_region: string;
          bridge_url: string | null;
          bridge_api_key_encrypted: string | null;
          claude_mode: string;
          claude_auth_json_encrypted: string | null;
          anthropic_api_key_encrypted: string | null;
          status: string;
          error_message: string | null;
          template_name: string | null;
          git_repo_url: string | null;
          vm_size: string;
          memory_mb: number;
          volume_size_gb: number;
          last_health_check_at: string | null;
          stopped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fly_app_name: string;
          fly_machine_id?: string | null;
          fly_volume_id?: string | null;
          fly_region?: string;
          bridge_url?: string | null;
          bridge_api_key_encrypted?: string | null;
          claude_mode?: string;
          claude_auth_json_encrypted?: string | null;
          anthropic_api_key_encrypted?: string | null;
          status?: string;
          error_message?: string | null;
          template_name?: string | null;
          git_repo_url?: string | null;
          vm_size?: string;
          memory_mb?: number;
          volume_size_gb?: number;
          last_health_check_at?: string | null;
          stopped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fly_app_name?: string;
          fly_machine_id?: string | null;
          fly_volume_id?: string | null;
          fly_region?: string;
          bridge_url?: string | null;
          bridge_api_key_encrypted?: string | null;
          claude_mode?: string;
          claude_auth_json_encrypted?: string | null;
          anthropic_api_key_encrypted?: string | null;
          status?: string;
          error_message?: string | null;
          template_name?: string | null;
          git_repo_url?: string | null;
          vm_size?: string;
          memory_mb?: number;
          volume_size_gb?: number;
          last_health_check_at?: string | null;
          stopped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      machine_status: 'provisioning' | 'starting' | 'running' | 'stopping' | 'stopped' | 'destroying' | 'destroyed' | 'error';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type BridgeConfig = Database['public']['Tables']['bridge_configs']['Row'];
export type BridgeConfigInsert = Database['public']['Tables']['bridge_configs']['Insert'];
export type BridgeConfigUpdate = Database['public']['Tables']['bridge_configs']['Update'];

export type CloudMachine = Database['public']['Tables']['cloud_machines']['Row'];
export type CloudMachineInsert = Database['public']['Tables']['cloud_machines']['Insert'];
export type CloudMachineUpdate = Database['public']['Tables']['cloud_machines']['Update'];
export type MachineStatus = Database['public']['Enums']['machine_status'];
