import { getScopedI18n } from '@/locales/server';

import { Separator } from '@/components/ui/separator';

import { AccountForm } from './account-form';

export default async function SettingsAccountPage() {
  const t = await getScopedI18n('profile');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('account.title')}</h3>
        <p className="text-muted-foreground text-sm">{t('account.update')}</p>
      </div>
      <Separator />
      <AccountForm />
    </div>
  );
}
