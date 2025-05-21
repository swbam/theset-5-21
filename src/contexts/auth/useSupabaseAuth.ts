
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, UserProfile } from './types';
import { 
  loginWithEmail as apiLoginWithEmail,
  loginWithGoogle as apiLoginWithGoogle,
  loginWithSpotify as apiLoginWithSpotify,
  signup as apiSignup,
  logout as apiLogout,
  getSession as apiGetSession
} from './auth-api';
import { fetchUserProfile } from './profile-api';

export function useSupabaseAuth(): AuthState & {
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithSpotify: () => Promise<void>;
  signup: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  login: () => void;
} {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Handle profile fetching (extracted from the original implementation)
  const handleProfileFetch = useCallback(async (userId: string) => {
    const userProfile = await fetchUserProfile(userId);
    if (userProfile) {
      setProfile(userProfile);
    }
  }, []);

  // Session check and auth state management
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        console.log("Checking session...");
        const { session, error } = await apiGetSession();
        
        if (error) {
          console.error('Error checking session:', error);
          return;
        }

        console.log("Session check result:", session ? "Active session found" : "No active session");
        setSession(session);
        
        if (session?.user) {
          console.log("User found in session:", session.user.id);
          setUser(session.user);
          await handleProfileFetch(session.user.id);
        } else {
          console.log("No user in session");
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        console.log('Current session:', currentSession ? "Present" : "None");
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user) {
          console.log("User in auth change:", currentSession.user.id);
          await handleProfileFetch(currentSession.user.id);
        } else {
          console.log("No user in auth change");
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [handleProfileFetch]);

  // Redirect to auth page
  const login = useCallback(() => {
    navigate('/auth');
  }, [navigate]);

  // Email login handler
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await apiLoginWithEmail(email, password);
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Login process error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Google login handler
  const loginWithGoogle = useCallback(async () => {
    await apiLoginWithGoogle();
  }, []);

  // Spotify login handler
  const loginWithSpotify = useCallback(async () => {
    await apiLoginWithSpotify();
  }, []);

  // Signup handler
  const signup = useCallback(async (email: string, password: string, username?: string) => {
    setIsLoading(true);
    try {
      const { error, needsEmailConfirmation } = await apiSignup(email, password, username);
      
      if (error) throw error;
      
      if (needsEmailConfirmation) {
        // Stay on the current page if email confirmation is needed
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Signup process error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      const { success } = await apiLogout();
      
      if (success) {
        setUser(null);
        setProfile(null);
        setSession(null);
        navigate('/');
      }
    } catch (error) {
      console.error('Logout process error:', error);
    }
  }, [navigate]);

  return {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithEmail,
    loginWithGoogle,
    loginWithSpotify,
    signup,
    logout,
  };
}
