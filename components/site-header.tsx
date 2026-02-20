'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUserData } from '@/context/UserDataContext';
import { useScopedI18n } from '@/locales/client';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import {
  Info,
  LogIn,
  MessageSquare,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { MainNav } from '@/components/main-nav';

import { ThemeToggle } from './theme-toggle';
import { Button, buttonVariants } from './ui/button';

const NAV_ICONS: Record<string, React.ReactNode> = {
  '/about': <Info className="size-4" />,
  '/chat': <MessageSquare className="size-4" />,
  '/code': <Terminal className="size-4" />,
  '/admin/users': <ShieldCheck className="size-4" />,
};

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
                    <div className="mb-4 flex items-center gap-2 px-3">
                      <Image
                        src="/logo.webp"
                        alt="Anubix logo"
                        width={24}
                        height={24}
                      />
                      <span className="text-lg font-bold tracking-tight">
                        Anubix
                      </span>
                    </div>
                    {siteConfig.mainNav?.map(
                      (item, index) =>
                        item.href && (
                          <Button
                            key={index}
                            variant="ghost"
                            asChild
                            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                          >
                            <Link
                              prefetch
                              href={item.comingSoon ? '#' : item.href}
                              onClick={closeSheet}
                            >
                              {NAV_ICONS[item.href]}
                              {item.title}
                            </Link>
                          </Button>
                        )
                    )}
                    <SignedOut>
                      <Separator className="my-3" />
                      <Button asChild className="w-full gap-2">
                        <Link href="/sign-in" onClick={closeSheet}>
                          <LogIn className="size-4" />
                          {t('login')}
                        </Link>
                      </Button>
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
