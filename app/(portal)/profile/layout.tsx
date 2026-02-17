import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getScopedI18n } from '@/locales/server';

import { Separator } from '@/components/ui/separator';
import { SidebarNav } from '@/components/ui/sidebar-nav';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'All your settings in one spot.',
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }
  const t = await getScopedI18n('profile');
  const sidebarNavItems = [
    {
      title: t('profile'),
      href: '/profile',
    },
    {
      title: t('account.title'),
      href: '/profile/account',
    },
    {
      title: t('appearance.title'),
      href: '/profile/appearance',
    },
    {
      title: t('display.title'),
      href: '/profile/display',
    },
  ];

  return (
    <>
      <div className="w-full p-4 pb-16 md:p-14 lg:max-w-5xl lg:space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold tracking-tight md:text-2xl">
            {t('settings')}
          </h2>
          <p className="text-muted-foreground">{t('manage')}</p>
        </div>
        <Separator className="mt-6" />
        <div className="m-0 flex flex-col lg:flex-row lg:space-x-12">
          <aside className="-mx-4 p-4 lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </>
  );
}
