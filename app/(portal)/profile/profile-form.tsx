'use client';

import { useEffect, useState } from 'react';
import { useScopedI18n } from '@/locales/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useClerk } from '@clerk/nextjs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Avatar } from '@/components/ui/avatar';
import { Loader } from '@/components/ui/loader';

import 'react-day-picker/dist/style.css';

import Image from 'next/image';
import { useUserData } from '@/context/UserDataContext';
import axios from 'axios';
import DatePicker from 'react-datepicker';

import { useClerkSupabaseClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';

import 'react-datepicker/dist/react-datepicker.css';

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.',
    })
    .max(50, {
      message: 'Name must not be longer than 50 characters.',
    }),
  bio: z.string().max(300).min(4),
  dob: z.date({
    required_error: 'A date of birth is required.',
  }),
  profilePicture: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const t = useScopedI18n('profile');
  const tCommon = useScopedI18n('common');
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const { profile, refreshUserData } = useUserData();
  const supabase = useClerkSupabaseClient();

  const [uploadedPicture, setUploadedPicture] = useState<File | string>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const defaultProfilePicture =
    'https://placehold.co/600x400/png?text=Hello+World';
  const [currentProfilePicture, setCurrentProfilePicture] = useState<string>(
    defaultProfilePicture
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      bio: '',
      dob: new Date(),
      profilePicture: defaultProfilePicture,
    },
  });

  const { reset, handleSubmit, control } = form;

  useEffect(() => {
    if (!profile && isSignedIn) {
      refreshUserData();
    }

    if (profile && user) {
      setCurrentProfilePicture(
        profile.profile_picture || defaultProfilePicture
      );
      reset({
        name: user.fullName || '',
        bio: profile.bio || '',
        dob: profile.dob ? new Date(profile.dob) : new Date(),
        profilePicture: profile.profile_picture || defaultProfilePicture,
      });
      setIsLoading(false);
    }
  }, [profile, user, reset, refreshUserData, isSignedIn]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (uploadedPicture) {
        const imageData = new FormData();
        imageData.append('profilePicture', uploadedPicture as Blob);
        imageData.append('currentProfilePicture', currentProfilePicture ?? '');
        await axios.post('/api/users/update-profile-picture', imageData);
      }

      // Update name via Clerk
      if (user && data.name !== user.fullName) {
        const nameParts = data.name.split(' ');
        await user.update({
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || undefined,
        });
      }

      // Update bio/dob via Supabase
      if (supabase) {
        await supabase
          .from('profiles')
          .update({
            bio: data.bio,
            dob: data.dob.toISOString().split('T')[0],
          })
          .eq('id', user!.id);
      }
    },
    onSuccess: () => {
      setImagePreview(undefined);
      toast({ title: `${t('profileUpdated')} 😺` });
      queryClient.invalidateQueries({ queryKey: ['userData'] });

      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }, 300);
    },
  });

  const handleImageChange = (e: any) => {
    compressImage(e, ({ imagePreview, compressedImage }: any) => {
      setImagePreview(imagePreview);
      setUploadedPicture(compressedImage);
    });
  };

  async function onSubmit(data: ProfileFormValues) {
    updateProfileMutation.mutate(data);
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error(tCommon('failed'), error);
      toast({
        title: `${tCommon('failed')} 😔`,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={control}
          name="profilePicture"
          render={({ field }) => (
            <FormItem className="relative">
              <Avatar className="mx-auto size-52">
                <Image
                  src={imagePreview || field.value || defaultProfilePicture}
                  width={280}
                  height={0}
                  alt="PROJECT Profile Picture"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    width: '208px',
                  }}
                  priority
                />
                {currentProfilePicture !== defaultProfilePicture && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedPicture('delete');
                      setImagePreview(defaultProfilePicture);
                      setCurrentProfilePicture(defaultProfilePicture);
                      field.onChange(defaultProfilePicture);
                    }}
                    className="absolute left-1/2 top-1 translate-x-[-150%] hover:bg-destructive"
                  >
                    <Icons.trash className="size-5" />
                  </Button>
                )}
                {imagePreview && (
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="absolute left-1/2 top-1 translate-x-1/2 hover:bg-primary"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader />
                    ) : (
                      <Icons.checkSquare className="h-6 w-[1.3rem]" />
                    )}
                  </Button>
                )}
              </Avatar>
              <FormLabel className="cursor-pointer hover:animate-pulse"></FormLabel>
              <FormControl>
                <Input
                  type="file"
                  placeholder={t('PROJECTProfileImage')}
                  onChange={handleImageChange}
                  className="mx-auto cursor-pointer hover:animate-pulse hover:bg-muted lg:max-w-[50%]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('name')} {...field} />
              </FormControl>
              <FormDescription>{t('publicDisplay')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-2">
          <p>{t('yourEmail')}</p>
          <p className="text-sm text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        <FormField
          control={control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('bio')}
                  className="min-h-[100px] resize-none overflow-hidden"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('bio')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('dateOfBirth')}</FormLabel>
              <FormControl>
                <DatePicker
                  selected={field.value}
                  onChange={(date: Date | null) => field.onChange(date)}
                  dateFormat="PPP"
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  maxDate={new Date()}
                  minDate={new Date('1900-01-01')}
                  placeholderText={t('pickADate')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormControl>
              <FormDescription>{t('yourInformation')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={!isSignedIn || updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? <Loader /> : t('updateProfile')}
        </Button>
        <Button
          type="button"
          className="ml-4"
          variant="destructive"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? <Loader /> : t('logout')}
        </Button>
      </form>
    </Form>
  );
}
