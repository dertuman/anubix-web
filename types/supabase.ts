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
          email: string;
          bridge_url: string;
          api_key_encrypted: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          bridge_url: string;
          api_key_encrypted: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
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
          name: string;
          email: string;
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
          name?: string;
          email?: string;
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
          name?: string;
          email?: string;
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
          email: string;
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
          email?: string;
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
          email?: string;
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
          email: string;
          provider: string;
          encrypted_key: string;
          iv: string;
          auth_tag: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          provider: string;
          encrypted_key: string;
          iv: string;
          auth_tag: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          provider?: string;
          encrypted_key?: string;
          iv?: string;
          auth_tag?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_env_vars: {
        Row: {
          id: string;
          email: string;
          key: string;
          value_encrypted: string;
          repo_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          key: string;
          value_encrypted: string;
          repo_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          key?: string;
          value_encrypted?: string;
          repo_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      github_connections: {
        Row: {
          id: string;
          email: string;
          github_user_id: number;
          github_username: string;
          access_token_encrypted: string;
          scopes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          github_user_id: number;
          github_username: string;
          access_token_encrypted: string;
          scopes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          github_user_id?: number;
          github_username?: string;
          access_token_encrypted?: string;
          scopes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      claude_connections: {
        Row: {
          id: string;
          email: string;
          claude_mode: string;
          auth_json_encrypted: string | null;
          api_key_encrypted: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          claude_mode?: string;
          auth_json_encrypted?: string | null;
          api_key_encrypted?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          claude_mode?: string;
          auth_json_encrypted?: string | null;
          api_key_encrypted?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          email: string;
          revenuecat_customer_id: string | null;
          entitlement_id: string;
          product_id: string | null;
          store: string | null;
          is_active: boolean;
          billing_interval: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          auto_renew: boolean;
          cancellation_date: string | null;
          unsubscribe_detected_at: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          last_webhook_at: string | null;
          last_api_check_at: string | null;
          raw_webhook_event: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          revenuecat_customer_id?: string | null;
          entitlement_id?: string;
          product_id?: string | null;
          store?: string | null;
          is_active?: boolean;
          billing_interval?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          auto_renew?: boolean;
          cancellation_date?: string | null;
          unsubscribe_detected_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          last_webhook_at?: string | null;
          last_api_check_at?: string | null;
          raw_webhook_event?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          revenuecat_customer_id?: string | null;
          entitlement_id?: string;
          product_id?: string | null;
          store?: string | null;
          is_active?: boolean;
          billing_interval?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          auto_renew?: boolean;
          cancellation_date?: string | null;
          unsubscribe_detected_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          last_webhook_at?: string | null;
          last_api_check_at?: string | null;
          raw_webhook_event?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cloud_machines: {
        Row: {
          id: string;
          email: string;
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
          email?: string;
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
          email?: string;
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
      blogs: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: string;
          category: string;
          tags: string[];
          featured_image_url: string | null;
          featured_image_alt: string | null;
          featured_image_caption: string | null;
          meta_title: string | null;
          meta_description: string | null;
          keywords: string[];
          og_image_alt: string | null;
          author_name: string;
          author_email: string;
          author_avatar: string | null;
          author_role: string | null;
          author_bio: string | null;
          reading_time: number;
          featured: boolean;
          is_draft: boolean;
          published_at: string | null;
          views: number;
          likes: number;
          shares: number;
          generation_metadata: Json | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          content: string;
          category: string;
          tags?: string[];
          featured_image_url?: string | null;
          featured_image_alt?: string | null;
          featured_image_caption?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          keywords?: string[];
          og_image_alt?: string | null;
          author_name: string;
          author_email: string;
          author_avatar?: string | null;
          author_role?: string | null;
          author_bio?: string | null;
          reading_time?: number;
          featured?: boolean;
          is_draft?: boolean;
          published_at?: string | null;
          views?: number;
          likes?: number;
          shares?: number;
          generation_metadata?: Json | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          content?: string;
          category?: string;
          tags?: string[];
          featured_image_url?: string | null;
          featured_image_alt?: string | null;
          featured_image_caption?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          keywords?: string[];
          og_image_alt?: string | null;
          author_name?: string;
          author_email?: string;
          author_avatar?: string | null;
          author_role?: string | null;
          author_bio?: string | null;
          reading_time?: number;
          featured?: boolean;
          is_draft?: boolean;
          published_at?: string | null;
          views?: number;
          likes?: number;
          shares?: number;
          generation_metadata?: Json | null;
          source_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      blog_likes: {
        Row: {
          id: string;
          blog_id: string;
          user_email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blog_id: string;
          user_email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blog_id?: string;
          user_email?: string;
          created_at?: string;
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

export type ProjectEnvVar = Database['public']['Tables']['project_env_vars']['Row'];
export type ProjectEnvVarInsert = Database['public']['Tables']['project_env_vars']['Insert'];
export type ProjectEnvVarUpdate = Database['public']['Tables']['project_env_vars']['Update'];

export type GitHubConnection = Database['public']['Tables']['github_connections']['Row'];
export type GitHubConnectionInsert = Database['public']['Tables']['github_connections']['Insert'];
export type GitHubConnectionUpdate = Database['public']['Tables']['github_connections']['Update'];

export type ClaudeConnection = Database['public']['Tables']['claude_connections']['Row'];
export type ClaudeConnectionInsert = Database['public']['Tables']['claude_connections']['Insert'];
export type ClaudeConnectionUpdate = Database['public']['Tables']['claude_connections']['Update'];

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type Blog = Database['public']['Tables']['blogs']['Row'];
export type BlogInsert = Database['public']['Tables']['blogs']['Insert'];
export type BlogUpdate = Database['public']['Tables']['blogs']['Update'];

export type BlogLike = Database['public']['Tables']['blog_likes']['Row'];
export type BlogLikeInsert = Database['public']['Tables']['blog_likes']['Insert'];
