import { getScopedI18n } from '@/locales/server';

import { Separator } from '@/components/ui/separator';

import { DisplayForm } from './display-form';

export default async function SettingsDisplayPage() {
  const t = await getScopedI18n('profile');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('display.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('display.customize')}
        </p>
      </div>
      <Separator />
      <DisplayForm />
    </div>
  );
}
