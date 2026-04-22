'use client';

import { useState } from 'react';
import { BookOpen, FilePlus, Library, Newspaper } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { ArticleForm } from './components/article-form';
import { ArticleLibrary } from './components/article-library';
import { AiNewsTab } from './components/ai-news-tab';

type Tab = 'editor' | 'library' | 'news';

export default function AdminBlogPage() {
  const [tab, setTab] = useState<Tab>('editor');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setTab('editor');
  };

  const handleNew = () => {
    setEditingId(null);
    setTab('editor');
  };

  const handleSaved = () => {
    setEditingId(null);
    setTab('library');
    setRefreshKey((k) => k + 1);
  };

  const handleGenerated = (blogId: string) => {
    setEditingId(blogId);
    setTab('editor');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Blog</h2>
            <p className="text-xs text-muted-foreground">Generate and manage posts at anubix.app/blog</p>
          </div>
        </div>
        {tab === 'library' && (
          <Button size="sm" onClick={handleNew} className="gap-2">
            <FilePlus className="size-4" /> New article
          </Button>
        )}
      </div>

      <div className="flex gap-1 rounded-md border border-input p-1 w-fit">
        <button
          onClick={() => setTab('editor')}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
            tab === 'editor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <FilePlus className="size-3.5" />
          {editingId ? 'Edit' : 'Create'}
        </button>
        <button
          onClick={() => setTab('news')}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
            tab === 'news' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <Newspaper className="size-3.5" />
          AI News
        </button>
        <button
          onClick={() => setTab('library')}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
            tab === 'library' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <Library className="size-3.5" />
          Library
        </button>
      </div>

      {tab === 'editor' && (
        <ArticleForm
          blogId={editingId}
          onSaved={handleSaved}
          onCancel={() => {
            setEditingId(null);
            setTab('library');
          }}
        />
      )}

      {tab === 'news' && <AiNewsTab onGenerated={handleGenerated} />}

      {tab === 'library' && <ArticleLibrary onEdit={handleEdit} refreshKey={refreshKey} />}
    </div>
  );
}
