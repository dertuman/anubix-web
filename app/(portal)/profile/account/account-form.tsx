'use client';

import { useEffect, useState } from 'react';
import { useChangeLocale, useScopedI18n } from '@/locales/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronsUpDown, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useClerkSupabaseClient } from '@/lib/supabase/client';
import { useUserData } from '@/context/UserDataContext';
import {
  cn,
  getPreferencesTranslation,
  getRandomAnimalEmoji,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader } from '@/components/ui/loader';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';

const availableLanguages = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
];

const accountFormSchema = z.object({
  language: z.string({
    required_error: 'Please select a language.',
  }),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const changeLocale = useChangeLocale();
  const t = useScopedI18n('profile.account');
  const queryClient = useQueryClient();
  const { user } = useUser();
  const supabase = useClerkSupabaseClient();
  const { profile, isLoading: isProfileLoading } = useUserData();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        language: profile.language,
      });
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      if (!user) throw new Error('Not authenticated');
      if (!supabase) throw new Error('Database not configured');

      await supabase
        .from('profiles')
        .update({ language: data.language })
        .eq('id', user.id);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
      changeLocale(variables.language as 'en' | 'es');

      toast({
        title: `${getPreferencesTranslation(variables.language)} ${getRandomAnimalEmoji()}`,
      });
    },
    onError: (error) => {
      console.error('Error updating locale:', error);
      toast({
        title: t('errorUpdatingLanguage'),
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: AccountFormValues) {
    updateProfileMutation.mutate(data);
  }

  const [open, setOpen] = useState(false);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('language')}</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-[200px] justify-between',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value
                        ? availableLanguages.find(
                            (language) => language.value === field.value
                          )?.label
                        : t('selectLanguage')}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder={t('searchLanguage')} />
                    <CommandList>
                      <CommandEmpty>{t('noLanguageFound')}</CommandEmpty>
                      <CommandGroup>
                        {availableLanguages.map((language) => (
                          <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                              form.setValue('language', language.value);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 size-4',
                                language.value === field.value
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={updateProfileMutation.isPending || isProfileLoading}
        >
          {updateProfileMutation.isPending ? <Loader /> : t('updateProfile')}
        </Button>
      </form>
    </Form>
  );
}
