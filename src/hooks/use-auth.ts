import { useAuth as useAuthContext } from '@/contexts/auth/AuthContext';

/**
 * Hook to access authentication state and functions
 * This is a convenience wrapper around the useAuth from AuthContext
 */
export function useAuth() {
  return useAuthContext();
}

// Also export default for convenience
export default useAuth; 