
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from './types';
import { setUserId } from '@/integrations/google-analytics';

/**
 * Fetch user profile from the database
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log("Fetching user profile for:", userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    console.log("User profile fetched:", data);
    
    // Track user ID in Google Analytics
    setUserId(userId);
    
    // Identify user in PostHog if available
    if (window.posthog && data) {
      window.posthog.identify(userId, {
        name: data.username || data.full_name,
        provider: data.provider,
        provider_id: data.provider_id
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
