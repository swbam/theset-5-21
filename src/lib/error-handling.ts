
import { toast } from "sonner";

export enum ErrorSource {
  API = "API",
  Database = "Database",
  Client = "Client",
  Unknown = "Unknown"
}

export interface ErrorDetails {
  message: string;
  source: ErrorSource;
  step?: string;
  originalError?: any;
  context?: Record<string, any>;
}

/**
 * Handles errors consistently across the app with appropriate user feedback and logging
 */
export function handleError(error: ErrorDetails): void {
  // Log the error with source information
  console.error(
    `[${error.source}]${error.step ? ` at ${error.step}` : ''}: ${error.message}`, 
    { 
      originalError: error.originalError,
      context: error.context
    }
  );
  
  // Provide user feedback based on error source
  let toastMessage = error.message;
  
  switch (error.source) {
    case ErrorSource.API:
      toastMessage = `API Error: ${error.message}`;
      toast.error(toastMessage, {
        description: "There was a problem connecting to the service. Please try again later."
      });
      break;
      
    case ErrorSource.Database:
      toastMessage = `Database Error: ${error.message}`;
      toast.error(toastMessage, {
        description: "There was a problem accessing your data. Please try again later."
      });
      break;
      
    case ErrorSource.Client:
      toast.error(error.message);
      break;
      
    case ErrorSource.Unknown:
    default:
      toast.error("Something went wrong", {
        description: "An unexpected error occurred. Please try again later."
      });
      break;
  }
  
  // You could also send error to a monitoring service like Sentry here
}

/**
 * Wraps an async function with consistent error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>, 
  options: { 
    step?: string;
    source?: ErrorSource;
    context?: Record<string, any>;
    onError?: (error: any) => void;
    fallbackValue?: T 
  } = {}
): Promise<T> {
  return fn().catch(err => {
    const errorDetails: ErrorDetails = {
      message: err.message || "Unknown error occurred",
      source: options.source || ErrorSource.Unknown,
      step: options.step,
      originalError: err,
      context: options.context
    };
    
    handleError(errorDetails);
    
    if (options.onError) {
      options.onError(err);
    }
    
    if (options.fallbackValue !== undefined) {
      return options.fallbackValue;
    }
    
    throw err;
  });
}
