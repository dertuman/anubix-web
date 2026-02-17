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

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: ['userData'],
    queryFn: async () => {
      if (!user?.id || !supabase) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    enabled: !!isSignedIn && !!user?.id && !!supabase,
  });

  const refreshUserData = () => {
    queryClient.invalidateQueries({ queryKey: ['userData'] });
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
