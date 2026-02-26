# Supabase Database Schema

This directory contains the definitive SQL schema for the Anubix application database.

## 📋 Table of Contents

- [Core Tables](#core-tables)
- [Authentication](#authentication)
- [Setup Instructions](#setup-instructions)
- [Important Notes](#important-notes)

## Core Tables

### User Tables

#### `profiles`
Created and managed by the main Anubix application. Contains user profile information.
- **Primary Key**: `id` (Clerk user ID)
- **Unique Keys**: `email`
- **Synced from**: Clerk webhooks

### Cloud Infrastructure Tables

#### `cloud_machines`
**File**: `create_cloud_machines_table.sql`

Stores Fly.io cloud workspace machine state and configuration.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `email`, `fly_app_name`
- **One per user**: Each email can have one cloud machine

#### `bridge_configs`
**File**: `create_bridge_configs_table.sql`

Stores bridge URL and encrypted API keys for workspace connections.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `email`
- **One per user**: Each email has one bridge config

### Connection Tables

#### `github_connections`
**File**: `create_github_connections_table.sql`

Stores GitHub OAuth tokens for private repository access.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `email`
- **One per user**: Each email can have one GitHub connection

#### `claude_connections`
**File**: `create_claude_connections_table.sql`

Stores encrypted Claude CLI credentials or API keys.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `email`
- **One per user**: Each email can have one Claude connection

#### `project_env_vars`
**File**: `create_project_env_vars_table.sql`

Stores encrypted environment variables per user per repository.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `(email, repo_path, key)`
- **Multiple per user**: Each email can have many env vars across different repos

### Subscription Tables

#### `subscriptions`
**File**: `create_subscriptions_table.sql`

Cached subscription state from RevenueCat webhooks.
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `email`
- **One per user**: Each email has one subscription record
- **Read-only for users**: Only webhooks and admins can modify

### Chat Tables

#### `conversations` & `messages`
Created and managed by anubix-native application.

#### `chat_api_keys`
**File**: `sql-scripts/chat-web-migration.sql`

Stores per-user encrypted API keys for chat providers (OpenAI, Google, Anthropic).
- **Primary Key**: `id` (UUID)
- **Unique Keys**: `(email, provider)`
- **Multiple per user**: Each email can have one key per provider

## Authentication

### Email-Based Authentication

All tables use **email addresses** as the primary user identifier:

```sql
-- All RLS policies follow this pattern:
CREATE POLICY "Policy name"
  ON table_name FOR ALL
  USING (email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));
```

### Clerk JWT Template Required

Your Clerk JWT template **must** include the email claim:

```json
{
  "email": "{{user.primary_email_address}}"
}
```

This is used by Row Level Security (RLS) policies to enforce data isolation.

## Setup Instructions

### 1. Run Table Creation Scripts

Run these scripts in your Supabase SQL Editor **in order**:

```bash
# Core infrastructure tables
supabase/create_bridge_configs_table.sql
supabase/create_cloud_machines_table.sql
supabase/create_github_connections_table.sql
supabase/create_claude_connections_table.sql
supabase/create_project_env_vars_table.sql
supabase/create_subscriptions_table.sql

# Chat extensions (if using chat features)
supabase/sql-scripts/chat-web-migration.sql
```

### 2. Verify Setup

After running the scripts, verify:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'bridge_configs',
    'cloud_machines',
    'github_connections',
    'claude_connections',
    'project_env_vars',
    'subscriptions',
    'chat_api_keys'
  )
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'bridge_configs',
    'cloud_machines',
    'github_connections',
    'claude_connections',
    'project_env_vars',
    'subscriptions',
    'chat_api_keys'
  );
```

### 3. Configure Clerk

Ensure your Clerk instance has:

1. **JWT Template** named "supabase" with email claim
2. **Webhook** configured for user events (user.created, user.updated, user.deleted)
3. **Environment variables** set in your application:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`

## Important Notes

### ✅ Email is the Source of Truth

- All user data is isolated by **email address**
- The `profiles.id` column stores the Clerk user ID (for webhook sync)
- All other tables use `email` as the user identifier
- This allows users to maintain their data across Clerk instances

### 🔒 Row Level Security (RLS)

All tables have RLS enabled with email-based policies:
- **Users can only access their own data**
- **Policies check**: `email = (SELECT auth.jwt() ->> 'email')`
- **Admin operations** use `createSupabaseAdmin()` to bypass RLS

### 🔐 Encryption

Sensitive data is encrypted using AES-256-GCM:
- API keys: `*_encrypted` columns
- Authentication tokens: `*_encrypted` columns
- Environment variables: `value_encrypted` column

Encryption/decryption is handled by `lib/encryption.ts`

### 🚫 No Migrations

This schema is **migration-free**:
- Each table has a single creation script
- No backwards compatibility or migration files
- These scripts are the source of truth
- To update: modify the creation script and recreate the table (or alter in production)

### 📝 Auto-Updated Timestamps

All tables include `updated_at` timestamps that are automatically updated:

```sql
CREATE TRIGGER on_table_updated
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
```

The `handle_updated_at()` function must exist before running these scripts.

## Schema Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Identity                         │
│                                                          │
│  profiles (id = Clerk ID, email = unique identifier)    │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ email
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────────┐
   │ bridge   │   │  cloud   │   │ github_conn  │
   │ configs  │   │ machines │   │              │
   └──────────┘   └──────────┘   └──────────────┘
         │               │               │
         │ (one per      │ (one per      │ (one per
         │  email)       │  email)       │  email)
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────────┐
   │ claude_  │   │ project_ │   │ subscription │
   │ conn     │   │ env_vars │   │              │
   └──────────┘   └──────────┘   └──────────────┘
                         │
                         │ (many per
                         │  email)
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌─────────────┐ ┌────────────┐
   │  chat_   │   │ conversa-   │ │  messages  │
   │ api_keys │   │ tions       │ │            │
   └──────────┘   └─────────────┘ └────────────┘
```

## Support

For issues or questions about the database schema:
1. Check the TypeScript types in `types/supabase.ts`
2. Review the SQL files in this directory
3. Verify RLS policies are correctly configured
4. Ensure Clerk JWT template includes email claim
