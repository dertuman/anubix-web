'use client';

import { redirect } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DatabaseZap, Loader2, ShieldCheck, Users } from 'lucide-react';

import { useUserData } from '@/context/UserDataContext';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { title: 'Users', href: '/admin/users', icon: Users },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, isLoading } = useUserData();
  const pathname = usePathname();
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/admin/backfill-profiles', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setBackfillResult(`Error: ${data.error}`);
      } else {
        setBackfillResult(`Done — ${data.updated} updated, ${data.skipped} skipped (${data.total} total)`);
      }
    } catch {
      setBackfillResult('Error: request failed');
    } finally {
      setBackfilling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!profile?.is_admin) {
    redirect('/');
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-16 md:p-8">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Manage users and platform resources</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={backfilling}
            className="h-8 gap-2 text-xs"
            title="Sync name + email from Clerk into profiles for all existing users"
          >
            {backfilling
              ? <Loader2 className="size-3.5 animate-spin" />
              : <DatabaseZap className="size-3.5" />}
            Backfill Profiles
          </Button>
          {backfillResult && (
            <p className={`text-[11px] ${backfillResult.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground'}`}>
              {backfillResult}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </div>

      <main>{children}</main>
    </div>
  );
}
