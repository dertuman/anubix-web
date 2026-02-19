'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUserData } from '@/context/UserDataContext';
import { useScopedI18n } from '@/locales/client';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { MainNav } from '@/components/main-nav';

import { ThemeToggle } from './theme-toggle';
import { buttonVariants } from './ui/button';

export function SiteHeader() {
  const t = useScopedI18n('siteHeader');
  const tCommon = useScopedI18n('common');
  const { profile } = useUserData();
  const siteConfig = {
    description: t('description'),
    mainNav: [
      {
        title: t('about'),
        href: '/about',
        isPublic: true,
        comingSoon: false,
      },
      {
        title: 'Chat',
        href: '/chat',
        isPublic: true,
        comingSoon: false,
      },
      {
        title: 'Code',
        href: '/code',
        isPublic: true,
        comingSoon: false,
      },
      ...(profile?.is_admin
        ? [
            {
              title: t('admin'),
              href: '/admin/users',
              requireAdmin: true,
            },
          ]
        : []),
    ],
  };

  const [isMobileMenuSheetOpen, setMobileMenuSheetOpen] = useState(false);

  const closeSheet = () => setMobileMenuSheetOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-none items-center px-4 sm:justify-between sm:space-x-0 sm:px-6 lg:px-8">
        <MainNav items={siteConfig.mainNav} />
        <div className="flex flex-1 items-center justify-end space-x-3">
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            <SignedOut>
              <Link href="/sign-in" className="hidden md:block">
                <div
                  className={
                    buttonVariants({
                      variant: 'ghost',
                    }) + ' px-6'
                  }
                >
                  <span>{t('login')}</span>
                </div>
              </Link>
            </SignedOut>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <Sheet
              open={isMobileMenuSheetOpen}
              onOpenChange={setMobileMenuSheetOpen}
            >
              <SheetTrigger asChild className="md:hidden">
                <div
                  className={buttonVariants({
                    size: 'icon',
                    variant: 'ghost',
                  })}
                >
                  <Icons.menu className="size-6 fill-current" />
                  <span className="sr-only">{tCommon('burgerButton')}</span>
                </div>
              </SheetTrigger>
              <SheetContent className="bg-background">
                <DialogTitle className="sr-only">
                  {tCommon('mobileMenu')}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {tCommon('mobileMenu')}
                </DialogDescription>
                {siteConfig.mainNav?.length ? (
                  <nav className="mt-6 flex flex-col gap-1 px-2">
                    <p className="mb-3 px-3 text-lg font-bold tracking-tight">
                      Anubix
                    </p>
                    {siteConfig.mainNav?.map(
                      (item, index) =>
                        item.href && (
                          <Link
                            prefetch
                            key={index}
                            href={item.comingSoon ? '#' : item.href}
                            onClick={closeSheet}
                            className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {item.title}
                          </Link>
                        )
                    )}
                    <SignedOut>
                      <Link
                        href="/sign-in"
                        onClick={closeSheet}
                        className="mt-3 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
                      >
                        {t('login')}
                      </Link>
                    </SignedOut>
                  </nav>
                ) : null}
              </SheetContent>
            </Sheet>
          </nav>
        </div>
      </div>
    </header>
  );
}
