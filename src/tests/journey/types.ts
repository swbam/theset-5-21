
/**
 * Type definitions for the user journey test
 */

// Test step function and result types
export interface TestContext {
  artistId?: string;
  spotifyArtistId?: string | null;
  supabase: any;
  artistTracks?: any[];
  errors: ErrorLog[];
  successes: SuccessLog[];
  [key: string]: any;
}

export interface TestStepResult {
  success: boolean;
  message: string;
  details?: any;
}

export type TestStep = (context: TestContext) => Promise<TestStepResult>;

// Error tracking
export interface ErrorLog {
  step: string;
  source: "API" | "Database" | "Client";
  message: string;
  timestamp: Date;
  details?: any;
}

// Success tracking
export interface SuccessLog {
  step: string;
  message: string;
  timestamp: Date;
  details?: any;
}

// Test results
export interface TestResults {
  startTime: Date;
  endTime: Date | null;
  errors: ErrorLog[];
  successes: SuccessLog[];
  completed: boolean;
  supabase: any;
  artistId?: string;
  spotifyArtistId?: string | null;
  artistTracks?: any[];
  success?: boolean; // Added to fix type errors
  message?: string;  // Added to fix type errors
}
