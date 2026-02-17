'use client';

import {
  useChangeLocale,
  useCurrentLocale,
  useScopedI18n,
} from '@/locales/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

import 'flag-icons/css/flag-icons.min.css';

import { useCallback } from 'react';
import { Locale, locales } from '@/lib/locales';

import { useClerkSupabaseClient } from '@/lib/supabase/client';
import { getRandomAnimalEmoji } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

import LocaleSwitcherSelect from './localeSwitcherSelect';

const LOCALE_TO_FLAG: Record<Locale, string> = {
  en: 'gb', // Special case for English
  es: 'mx',
};

export default function LocaleSwitcher() {
  const { user } = useUser();
  const t = useScopedI18n('localeSwitcher');
  const changeLocale = useChangeLocale();
  const queryClient = useQueryClient();
  const currentLocale = useCurrentLocale();
  const supabase = useClerkSupabaseClient();
  const getCountryCode = useCallback(
    (locale: string) => LOCALE_TO_FLAG[locale as Locale] ?? locale,
    []
  );

  const updateLocaleMutation = useMutation({
    mutationFn: async (locale: string) => {
      if (user && supabase) {
        await supabase
          .from('profiles')
          .update({ language: locale })
          .eq('id', user.id);
      }
      return locale;
    },
    onMutate: async (newLocale) => {
      // Immediately change the locale for better UX
      changeLocale(newLocale as 'en');
      toast({
        title: `${t('languageUpdated')} ${getRandomAnimalEmoji()}`,
      });
    },
    onError: () => {
      // Revert back to the previous locale if the mutation fails
      changeLocale(currentLocale as 'en');
      toast({
        title: 'Error updating language',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      // Just invalidate the query on success, locale is already changed
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });

  const handleLocaleChange = (newLocale: string) => {
    updateLocaleMutation.mutate(newLocale);
  };

  return (
    <div className="flex items-center overflow-hidden rounded-md">
      <LocaleSwitcherSelect
        defaultValue={currentLocale as Locale}
        label={t('label')}
        getCountryCode={getCountryCode}
        locales={locales}
        onLocaleSelect={handleLocaleChange}
      />
    </div>
  );
}
