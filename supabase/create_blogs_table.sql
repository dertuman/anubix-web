-- ============================================================
-- blogs — AI-assisted blog posts with SEO & engagement stats
-- ============================================================
-- Created and edited through the /admin/blog UI. Public pages
-- render published rows; admins see drafts too. RLS allows
-- public read of published posts and admin writes via secret key.
-- ============================================================

create table public.blogs (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique,

  -- Content
  title                   text not null,
  excerpt                 text,
  content                 text not null,                  -- HTML from Tiptap

  -- Classification
  category                text not null,                  -- see BLOG_CATEGORIES constant
  tags                    text[] not null default '{}',

  -- Featured image
  featured_image_url      text,
  featured_image_alt      text,
  featured_image_caption  text,

  -- SEO
  meta_title              text,
  meta_description        text,
  keywords                text[] not null default '{}',
  og_image_alt            text,

  -- Author
  author_name             text not null,
  author_email            text not null,                  -- links to profiles.email
  author_avatar           text,
  author_role             text,
  author_bio              text,

  -- State
  reading_time            integer not null default 5,     -- minutes
  featured                boolean not null default false,
  is_draft                boolean not null default true,
  published_at            timestamp with time zone,

  -- Engagement
  views                   integer not null default 0,
  likes                   integer not null default 0,
  shares                  integer not null default 0,

  -- Generation metadata (for debugging / audit)
  generation_metadata     jsonb,                          -- { seedTopic, models[], humanizePasses, tokensUsed }

  -- Source of seed content for RSS-auto-generated posts (null for manual posts).
  -- Unique when set, used by the admin UI to hide already-processed RSS items.
  source_url              text,

  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_blogs_slug on blogs(slug);
create index if not exists idx_blogs_category on blogs(category);
create index if not exists idx_blogs_published_at on blogs(published_at desc);
create index if not exists idx_blogs_featured on blogs(featured) where featured = true;
create index if not exists idx_blogs_is_draft on blogs(is_draft);
create index if not exists idx_blogs_tags on blogs using gin(tags);
create unique index if not exists idx_blogs_source_url on blogs(source_url) where source_url is not null;

-- Full-text search on title + excerpt + content
create index if not exists idx_blogs_fts on blogs using gin(
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(content,''))
);

-- Row Level Security
alter table blogs enable row level security;

-- Anyone can read published posts (for public blog pages)
create policy "Anyone can read published blogs"
  on blogs for select
  using (is_draft = false and published_at is not null);

-- Admin writes and draft reads bypass RLS via createSupabaseAdmin() in API routes.

-- Auto-update updated_at
create trigger on_blogs_updated
  before update on blogs
  for each row
  execute function handle_updated_at();

-- ============================================================
-- blog_likes — per-user likes to prevent double-counting
-- ============================================================

create table public.blog_likes (
  id          uuid primary key default gen_random_uuid(),
  blog_id     uuid not null references blogs(id) on delete cascade,
  user_email  text not null,
  created_at  timestamp with time zone not null default now(),
  unique (blog_id, user_email)
);

create index if not exists idx_blog_likes_blog on blog_likes(blog_id);
create index if not exists idx_blog_likes_user on blog_likes(user_email);

alter table blog_likes enable row level security;

-- Users can read their own likes (for showing liked state in UI)
create policy "Users read own likes"
  on blog_likes for select
  using (user_email = (select auth.jwt() ->> 'email'));

-- All like writes go through server routes using createSupabaseAdmin.
