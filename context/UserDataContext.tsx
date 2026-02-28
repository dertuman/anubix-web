'use client';

import { createContext, ReactNode, useContext } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useClerkSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/supabase';

interface UserDataContextType {
  profile: Profile | null;
  isLoading: boolean;
  error?: string;
  refreshUserData: () => void;
}

const UserDataContext = createContext<UserDataContextType | null>(null);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isSignedIn, user } = useUser();
  const supabase = useClerkSupabaseClient();

  const userEmail = user?.primaryEmailAddress?.emailAddress;

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: ['userData', userEmail],
    queryFn: async () => {
      if (!userEmail || !supabase) {
        console.log('[UserDataContext] Missing email or supabase:', { userEmail, hasSupabase: !!supabase });
        return null;
      }

      console.log('[UserDataContext] Fetching profile for email:', userEmail);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error) {
        console.warn('[UserDataContext] Error fetching profile:', error);
        // Throw so react-query triggers a retry — the Clerk webhook may
        // not have created the profile row yet (race condition on sign-up).
        throw new Error('Profile not found');
      }

      console.log('[UserDataContext] Profile fetched:', { email: data?.email, isAdmin: data?.is_admin });
      return data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    enabled: !!isSignedIn && !!userEmail && !!supabase,
    // Retry with back-off when profile is missing — handles the race
    // condition where the user is redirected after sign-up before the
    // Clerk webhook has created their profile row in Supabase.
    retry: (failureCount) => !!isSignedIn && failureCount < 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const refreshUserData = () => {
    queryClient.invalidateQueries({ queryKey: ['userData', userEmail] });
  };

  return (
    <UserDataContext.Provider
      value={{
        profile: profile ?? null,
        isLoading,
        error: error?.message,
        refreshUserData,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}
