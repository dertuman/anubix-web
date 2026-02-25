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
        return null;
      }

      console.log('[UserDataContext] Profile fetched:', { email: data?.email, isAdmin: data?.is_admin });
      return data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    enabled: !!isSignedIn && !!userEmail && !!supabase,
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
