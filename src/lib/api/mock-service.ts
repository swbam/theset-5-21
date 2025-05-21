import { toast } from "sonner";

/**
 * Helper function to format an artist name for use in URLs and IDs
 */
export function formatArtistNameForUrl(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

/**
 * Format a date for display
 */
export function formatDate(dateString?: string, includeTime = false): string {
  if (!dateString) return "TBA";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "TBA";
    
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "TBA";
  }
}
