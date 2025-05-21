
export * from './AuthContext';
export * from './types';
export * from './useSupabaseAuth';
export * from './auth-api';
export * from './profile-api';

// Add PostHog type definition
declare global {
  interface Window {
    posthog?: {
      init: (apiKey: string, options?: Record<string, any>) => void;
      identify: (userId: string, userProps?: Record<string, any>) => void;
      reset: () => void;
      capture: (event: string, properties?: Record<string, any>) => void;
    };
  }
}
