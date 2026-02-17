'use client';

import { useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { useScopedI18n } from '@/locales/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useClerkSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader } from '@/components/ui/loader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark'], {
    required_error: 'Please select a theme.',
  }),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function AppearanceForm() {
  const t = useScopedI18n('profile.appearance');
  const { user } = useUser();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();
  const supabase = useClerkSupabaseClient();

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    mode: 'onChange',
  });

  const { profile } = useUserData();

  useEffect(() => {
    if (profile) {
      form.reset({
        theme: (profile.theme as 'light' | 'dark') ?? 'dark',
      });
    }
  }, [profile, form]);

  const updateAppearanceMutation = useMutation({
    mutationFn: async (data: AppearanceFormValues) => {
      if (!user) throw new Error('Not authenticated');
      if (!supabase) throw new Error('Database not configured');

      await supabase
        .from('profiles')
        .update({ font: 'inter', theme: data.theme })
        .eq('id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
      toast({ title: `${t('appearanceUpdated')} 😺` });
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }, 300);
    },
    onError: (error) => {
      console.error('Error updating appearance:', error);
      toast({
        title: 'Error updating appearance',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: AppearanceFormValues) {
    updateAppearanceMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>{t('theme')}</FormLabel>
              <FormDescription>{t('selectTheme')}</FormDescription>
              <FormMessage />
              <RadioGroup
                disabled
                onValueChange={(value) => {
                  field.onChange(value);
                  setTheme(value);
                }}
                defaultValue={field.value}
                className="grid max-w-md grid-cols-2 gap-8 pt-2"
              >
                <FormItem>
                  <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
                    <FormControl>
                      <RadioGroupItem value="light" className="sr-only" />
                    </FormControl>
                    <div className="border-muted hover:border-accent items-center rounded-md border-2 p-1">
                      <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                        <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="size-4 rounded-full bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="size-4 rounded-full bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                      </div>
                    </div>
                    <span className="flex w-full  items-center justify-around p-2 text-center font-normal">
                      {t('light')}
                      <Icons.sun className="h-6 w-[1.3rem]" />
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
                    <FormControl>
                      <RadioGroupItem value="dark" className="sr-only" />
                    </FormControl>
                    <div className="border-muted bg-popover hover:bg-accent hover:text-accent-foreground items-center rounded-md border-2 p-1">
                      <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                        <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="size-4 rounded-full bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="size-4 rounded-full bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                      </div>
                    </div>
                    <span className="flex w-full  items-center justify-around p-2 text-center font-normal">
                      {t('dark')}
                      <Icons.moon className="size-5" />
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Button disabled type="submit">
          {updateAppearanceMutation.isPending ? (
            <Loader />
          ) : (
            t('updateAppearance')
          )}
        </Button>
      </form>
    </Form>
  );
}
