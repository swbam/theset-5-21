
import React, { createContext, useContext, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { AuthContextType } from './types';
import { supabase } from '@/integrations/supabase/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSupabaseAuth();

  // Check if admin exists on auth state change
  useEffect(() => {
    const checkAndSetupAdmin = async () => {
      if (auth.user?.email === 'a@theset.live') {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', auth.user.id)
            .single();
            
          if (profileError) {
            console.error('Error checking admin profile:', profileError);
            return;
          }
          
          // If not an admin, update the profile
          if (!profileData?.is_admin) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                is_admin: true,
                username: 'admin',
                full_name: 'Site Admin'
              })
              .eq('id', auth.user.id);
              
            if (updateError) {
              console.error('Error updating admin status:', updateError);
            } else {
              console.log('Admin status updated for', auth.user.email);
              // Refresh the profile in the auth state
              auth.profile = {
                ...auth.profile,
                is_admin: true,
                username: 'admin',
                full_name: 'Site Admin'
              };
            }
          }
        } catch (error) {
          console.error('Admin setup error:', error);
        }
      }
    };
    
    if (auth.user) {
      checkAndSetupAdmin();
    }
  }, [auth.user]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
