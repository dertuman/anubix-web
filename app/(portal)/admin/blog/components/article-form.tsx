'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, Save, Wand2, ImageIcon, Search, Eye, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/ai/types';
import { slugify } from '@/lib/slugify';
import type { Blog } from '@/types/supabase';

import { RichEditor } from './rich-editor';
import { useAiGeneration } from '../hooks/use-ai-generation';

interface ArticleFormProps {
  blogId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string;
  featured_image_url: string;
  featured_image_alt: string;
  featured_image_caption: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  og_image_alt: string;
  author_role: string;
  author_bio: string;
  featured: boolean;
  is_draft: boolean;
  // Seed fields
  topic: string;
  additional_context: string;
  custom_image_prompt: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: 'AI Development',
  tags: '',
  featured_image_url: '',
  featured_image_alt: '',
  featured_image_caption: '',
  meta_title: '',
  meta_description: '',
  keywords: '',
  og_image_alt: '',
  author_role: '',
  author_bio: '',
  featured: false,
  is_draft: true,
  topic: '',
  additional_context: '',
  custom_image_prompt: '',
};

export function ArticleForm({ blogId, onSaved, onCancel }: ArticleFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const ai = useAiGeneration();

  // Load existing blog when editing
  useEffect(() => {
    if (!blogId) {
      setForm(EMPTY_FORM);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        // Use admin list+filter or the public get with includeDrafts=1.
        const res = await axios.get<{ blogs: Blog[] }>('/api/admin/blog/list');
        const found = res.data.blogs.find((b) => b.id === blogId);
        if (!found) {
          toast({ title: 'Not found', variant: 'destructive' });
          return;
        }
        // Fetch full record via /api/blog/get with includeDrafts
        const fullRes = await axios.get<{ blog: Blog }>(`/api/blog/get?slug=${found.slug}&includeDrafts=1`);
        const b = fullRes.data.blog;
        setForm({
          title: b.title,
          slug: b.slug,
          excerpt: b.excerpt ?? '',
          content: b.content,
          category: (b.category as BlogCategory) || 'AI Development',
          tags: b.tags.join(', '),
          featured_image_url: b.featured_image_url ?? '',
          featured_image_alt: b.featured_image_alt ?? '',
          featured_image_caption: b.featured_image_caption ?? '',
          meta_title: b.meta_title ?? '',
          meta_description: b.meta_description ?? '',
          keywords: b.keywords.join(', '),
          og_image_alt: b.og_image_alt ?? '',
          author_role: b.author_role ?? '',
          author_bio: b.author_bio ?? '',
          featured: b.featured,
          is_draft: b.is_draft,
          topic: '',
          additional_context: '',
          custom_image_prompt: '',
        });
      } catch (err) {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed to load';
        toast({ title: 'Load failed', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [blogId]);

  // Auto-generate slug from title when creating a new article
  useEffect(() => {
    if (blogId) return;
    if (!form.title) return;
    setForm((f) => ({ ...f, slug: slugify(f.title) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  // ===== One-click generate =====
  async function handleGenerateAll() {
    if (!form.title) {
      toast({ title: 'Title required', description: 'Enter a title first.', variant: 'destructive' });
      return;
    }

    // 1. Article
    const articleRes = await ai.generateArticle({
      title: form.title,
      topic: form.topic || undefined,
      category: form.category,
      additionalContext: form.additional_context || undefined,
      includeAnubixMention: true,
    });
    if (!articleRes) return;
    setForm((f) => ({ ...f, content: articleRes.content }));

    // 2. Excerpt
    const excerpt = await ai.generateExcerpt(form.title, articleRes.content);
    if (excerpt) setForm((f) => ({ ...f, excerpt }));

    // 3. SEO
    const seoRes = await ai.generateSeo({
      title: form.title,
      excerpt: excerpt ?? articleRes.content.slice(0, 200),
      content: articleRes.content,
    });
    if (seoRes) {
      setForm((f) => ({
        ...f,
        meta_title: seoRes.metaTitle,
        meta_description: seoRes.metaDescription,
        keywords: seoRes.keywords.join(', '),
        og_image_alt: seoRes.ogImageAlt,
      }));
    }

    // 4. Image
    const imgRes = await ai.generateImage({
      title: form.title,
      topic: form.topic || undefined,
      category: form.category,
      customPrompt: form.custom_image_prompt || undefined,
    });
    if (imgRes) {
      setForm((f) => ({
        ...f,
        featured_image_url: imgRes.url,
        featured_image_alt: seoRes?.ogImageAlt || imgRes.alt,
      }));
    }

    toast({
      title: 'Generated',
      description: `Article + excerpt + SEO + image ready. Humanize passes: ${articleRes.humanizePasses}.`,
    });
  }

  async function handleHumanizeAgain() {
    if (!form.content) return;
    const result = await ai.humanize(form.content);
    if (result) {
      setForm((f) => ({ ...f, content: result }));
      toast({ title: 'Humanized', description: 'Another pass complete.' });
    }
  }

  async function handleGenerateImage() {
    if (!form.title) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    const imgRes = await ai.generateImage({
      title: form.title,
      topic: form.topic || undefined,
      category: form.category,
      customPrompt: form.custom_image_prompt || undefined,
    });
    if (imgRes) {
      setForm((f) => ({
        ...f,
        featured_image_url: imgRes.url,
        featured_image_alt: f.featured_image_alt || imgRes.alt,
      }));
    }
  }

  async function handleUploadImage(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'blog');
    try {
      const res = await axios.post<{ url: string }>('/api/admin/blog/upload-image', fd);
      setForm((f) => ({ ...f, featured_image_url: res.data.url }));
      toast({ title: 'Uploaded' });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    }
  }

  async function handleSave() {
    if (!form.title || !form.content) {
      toast({ title: 'Title and content required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        content: form.content,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        featured_image_url: form.featured_image_url || null,
        featured_image_alt: form.featured_image_alt || null,
        featured_image_caption: form.featured_image_caption || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        og_image_alt: form.og_image_alt || null,
        author_role: form.author_role || null,
        author_bio: form.author_bio || null,
        featured: form.featured,
        is_draft: form.is_draft,
      };

      if (blogId) {
        await axios.patch('/api/admin/blog/update', { id: blogId, ...payload });
        toast({ title: 'Updated' });
      } else {
        await axios.post('/api/admin/blog/create', payload);
        toast({ title: 'Created' });
      }
      onSaved();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const anyGenerating =
    ai.states.article.running ||
    ai.states.excerpt.running ||
    ai.states.seo.running ||
    ai.states.image.running ||
    ai.states.humanize.running;

  return (
    <div className="space-y-6">
      {/* ===== Seed section ===== */}
      <section className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">AI Seed</h2>
          <Badge variant="outline" className="text-[10px]">multi-model · humanized</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Title (the article&apos;s headline)</Label>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder='e.g. "Why Claude Code changes everything for mobile coding"'
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Topic / seed (optional)</Label>
            <Input
              value={form.topic}
              onChange={(e) => update('topic', e.target.value)}
              placeholder="e.g. fly.io, supabase, gemini 3, agent frameworks"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value as BlogCategory)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Custom image prompt (optional)</Label>
            <Input
              value={form.custom_image_prompt}
              onChange={(e) => update('custom_image_prompt', e.target.value)}
              placeholder="Override the default image prompt if you want"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs">Extra context / editor notes (optional)</Label>
            <Textarea
              value={form.additional_context}
              onChange={(e) => update('additional_context', e.target.value)}
              placeholder="Anything specific: angle, sources to reference, target audience, real data points to include…"
              rows={3}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerateAll} disabled={anyGenerating || !form.title} className="gap-2">
            <Sparkles className="size-4" /> Generate everything (one click)
          </Button>
          <Button onClick={handleHumanizeAgain} disabled={anyGenerating || !form.content} variant="outline" className="gap-2">
            <Wand2 className="size-4" /> Humanize again
          </Button>
          <Button onClick={handleGenerateImage} disabled={anyGenerating || !form.title} variant="outline" className="gap-2">
            <ImageIcon className="size-4" /> Regenerate image
          </Button>
        </div>
        <GenerationProgress ai={ai} />
      </section>

      {/* ===== Content ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Content</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Slug (URL path)</Label>
            <Input value={form.slug} onChange={(e) => update('slug', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => update('tags', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Excerpt</Label>
          <Textarea value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} rows={2} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Article body (rich editor)</Label>
          <RichEditor value={form.content} onChange={(html) => update('content', html)} placeholder="Article body…" />
        </div>
      </section>

      {/* ===== Featured image ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4" />
          <h2 className="text-sm font-semibold">Featured image</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Image URL</Label>
            <Input value={form.featured_image_url} onChange={(e) => update('featured_image_url', e.target.value)} />
            <div className="flex items-center gap-2 pt-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadImage(file);
                }}
                className="text-xs"
              />
              {form.featured_image_url && (
                <Button size="sm" variant="ghost" onClick={() => update('featured_image_url', '')} className="h-7 gap-1 text-xs">
                  <Trash2 className="size-3" /> Clear
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alt text</Label>
            <Input value={form.featured_image_alt} onChange={(e) => update('featured_image_alt', e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Caption (optional)</Label>
            <Input value={form.featured_image_caption} onChange={(e) => update('featured_image_caption', e.target.value)} />
          </div>
        </div>
        {form.featured_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.featured_image_url} alt={form.featured_image_alt} className="max-h-48 rounded border border-border" />
        )}
      </section>

      {/* ===== SEO ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="size-4" />
          <h2 className="text-sm font-semibold">SEO</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Meta title ({form.meta_title.length}/60)</Label>
            <Input value={form.meta_title} onChange={(e) => update('meta_title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">OG image alt</Label>
            <Input value={form.og_image_alt} onChange={(e) => update('og_image_alt', e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Meta description ({form.meta_description.length}/160)</Label>
            <Textarea value={form.meta_description} onChange={(e) => update('meta_description', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Keywords (comma-separated)</Label>
            <Input value={form.keywords} onChange={(e) => update('keywords', e.target.value)} />
          </div>
        </div>
      </section>

      {/* ===== Author ===== */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Author byline (optional)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <Input value={form.author_role} onChange={(e) => update('author_role', e.target.value)} placeholder="e.g. Founder" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bio</Label>
            <Input value={form.author_bio} onChange={(e) => update('author_bio', e.target.value)} placeholder="One-line bio" />
          </div>
        </div>
      </section>

      {/* ===== Publish ===== */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.featured} onCheckedChange={(v) => update('featured', v)} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={!form.is_draft} onCheckedChange={(v) => update('is_draft', !v)} />
            Published
          </label>
          {form.slug && !form.is_draft && (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Eye className="size-3" /> /blog/{form.slug}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="size-4" /> {saving ? 'Saving…' : blogId ? 'Save changes' : 'Create as draft'}
          </Button>
        </div>
      </section>
    </div>
  );
}

function GenerationProgress({ ai }: { ai: ReturnType<typeof useAiGeneration> }) {
  const rows: Array<[string, typeof ai.states.article]> = [
    ['Article (Gemini draft → GPT-4o humanize)', ai.states.article],
    ['Excerpt', ai.states.excerpt],
    ['SEO metadata', ai.states.seo],
    ['Image (Nano Banana Pro)', ai.states.image],
    ['Re-humanize', ai.states.humanize],
  ];
  const anyActive = rows.some(([, s]) => s.running || s.error || s.progress === 100);
  if (!anyActive) return null;
  return (
    <div className="space-y-1.5 rounded border border-border/60 bg-background/60 p-3">
      {rows.filter(([, s]) => s.running || s.error || s.progress === 100).map(([label, s]) => (
        <div key={label}>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{label}</span>
            <span className={s.error ? 'text-destructive' : 'text-muted-foreground'}>
              {s.error ? `Error: ${s.error}` : s.progress === 100 ? 'Done' : `${s.progress}%`}
            </span>
          </div>
          <Progress value={s.progress} className="h-1" />
        </div>
      ))}
    </div>
  );
}
