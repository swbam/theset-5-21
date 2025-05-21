
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  provider?: string;
  provider_id?: string;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithSpotify: () => Promise<void>;
  signup: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
}
