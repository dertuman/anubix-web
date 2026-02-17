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

import LocaleSwitcher from './localeSwitcher';
import { ThemeToggle } from './theme-toggle';
import { buttonVariants } from './ui/button';

export function SiteHeader() {
  const t = useScopedI18n('siteHeader');
  const { profile } = useUserData();
  const siteConfig = {
    description:
      'PROJECT empowers your business with cutting-edge technology solutions.',
    mainNav: [
      {
        title: t('about'),
        href: '/about',
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
    <header className="bg-card sticky top-0 z-40 w-full border-b shadow-lg">
      <div className="container flex h-16 items-center pe-2 ps-4 sm:justify-between sm:space-x-0 md:pe-4">
        <MainNav items={siteConfig.mainNav} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            <SignedOut>
              <Link href="/sign-in" className="hidden md:block">
                <div
                  className={
                    buttonVariants({
                      variant: 'ghost',
                    }) + ' px-9'
                  }
                >
                  <span>{t('login')}</span>
                </div>
              </Link>
            </SignedOut>

            <div className="hidden md:block">
              <LocaleSwitcher />
            </div>

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
                  <Icons.menu className="size-7 fill-current" />
                  <span className="sr-only">Burger button</span>
                </div>
              </SheetTrigger>
              <SheetContent className="bg-card">
                <DialogTitle className="sr-only">Mobile menu</DialogTitle>
                <DialogDescription className="sr-only">
                  Mobile menu
                </DialogDescription>
                {siteConfig.mainNav?.length ? (
                  <nav className="mt-2 flex flex-col items-center gap-2">
                    <div className="mt-2 flex justify-between">
                      <h2 className="font-montserrat p-3 pl-2 text-lg font-black tracking-wide">
                        PROJECT
                      </h2>
                      <LocaleSwitcher />
                    </div>
                    {siteConfig.mainNav?.map(
                      (item, index) =>
                        item.href && (
                          <Link
                            prefetch
                            key={index}
                            href={item.comingSoon ? '#' : item.href}
                            onClick={closeSheet}
                            className="border-primary active:bg-muted w-full rounded-md border p-3 text-center"
                          >
                            {item.title}
                          </Link>
                        )
                    )}
                    <SignedOut>
                      <Link
                        href="/sign-in"
                        onClick={closeSheet}
                        className="border-primary active:bg-muted w-full rounded-md border p-3 text-center focus:border focus:outline-none"
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
