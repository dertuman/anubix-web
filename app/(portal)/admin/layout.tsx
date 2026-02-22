'use client';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Users } from 'lucide-react';

import { useUserData } from '@/context/UserDataContext';
import { Loader } from '@/components/ui/loader';
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
      <div className="flex items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Manage users and platform resources</p>
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
