// hooks/useAuth.ts
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { User, UserRole } from '@/lib/types';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signIn: (provider?: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isTeamMember: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const { data: session, status } = useSession();
  
  const user = session?.user as User | null;
  const isLoading = status === 'loading';
  const isAuthenticated = !!session && !!user;
  const role = user?.role || null;

  const handleSignIn = async (provider = 'credentials') => {
    await signIn(provider);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: 'api/auth/signin' });
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user || !user.role) return false;
    
    // Admin has access to everything
    if (user.role === 'ADMIN') return true;
    
    // Check specific role
    return user.role === requiredRole;
  };

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  return {
    user,
    isLoading,
    isAuthenticated,
    role,
    signIn: handleSignIn,
    signOut: handleSignOut,
    hasRole,
    isAdmin,
    isTeamMember
  };
};