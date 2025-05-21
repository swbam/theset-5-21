import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthError } from '@supabase/supabase-js';

// Define error type
type AuthCallbackError = AuthError | Error | unknown;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started');
        // Get URL parameters to check for the provider
        const searchParams = new URLSearchParams(window.location.search);
        const provider = searchParams.get('provider');
        const code = searchParams.get('code');
        
        console.log('Provider from URL:', provider);
        console.log('Auth code present:', code ? 'Yes' : 'No');
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Session found:', session.user.id);
          console.log('Provider token:', session.provider_token ? 'Yes' : 'No');
          
          if (session.provider_token) {
            console.log('Provider token is available');
          } else {
            console.warn('Provider token is not available - this may cause issues with Spotify API calls');
          }
          
          // Store authentication state in localStorage for persistence
          localStorage.setItem('user_id', session.user.id);
          
          if (provider) {
            localStorage.setItem('auth_provider', provider);
          }
          
          toast.success('Successfully signed in!');
          
          // Check if auth was with Spotify - use both the URL parameter and session info
          if (provider === 'spotify' || session.provider_token) {
            console.log('Redirecting to personalized dashboard since this was a Spotify login');
            
            // Force a slight delay to ensure state updates are complete
            setTimeout(() => {
              console.log('Now navigating to /dashboard');
              navigate('/dashboard');
            }, 1000);
          } else {
            console.log('Non-Spotify login, redirecting to home page');
            setTimeout(() => {
              navigate('/');
            }, 1000);
          }
        } else {
          // If we have a code but no session, try to exchange the code for a session
          if (code) {
            console.log('No session found but code is present, attempting to exchange code for session');
            
            // The code exchange should happen automatically, but we'll wait a moment
            setTimeout(async () => {
              const { data: { session: newSession }, error: exchangeError } = await supabase.auth.getSession();
              
              if (exchangeError) {
                console.error('Error exchanging code for session:', exchangeError);
                throw exchangeError;
              }
              
              if (newSession) {
                console.log('Session obtained after code exchange:', newSession.user.id);
                localStorage.setItem('user_id', newSession.user.id);
                
                if (provider) {
                  localStorage.setItem('auth_provider', provider);
                }
                
                toast.success('Successfully signed in!');
                
                if (provider === 'spotify' || newSession.provider_token) {
                  navigate('/dashboard');
                } else {
                  navigate('/');
                }
              } else {
                console.error('No session after code exchange');
                throw new Error('Authentication failed. Please try again.');
              }
            }, 2000);
          } else {
            console.log('No session found after redirect and no code present');
            setError('Authentication process was interrupted. Please try again.');
            setTimeout(() => navigate('/auth'), 2000);
          }
        }
      } catch (err: AuthCallbackError) {
        console.error('Error during auth callback:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        toast.error(errorMessage);
        setTimeout(() => navigate('/auth'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="text-destructive mb-4">{error}</div>
        <p>Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">Completing authentication...</p>
      <p className="text-sm text-muted-foreground mt-2">Please wait while we verify your identity</p>
    </div>
  );
};

export default AuthCallback;
