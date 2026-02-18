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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
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
