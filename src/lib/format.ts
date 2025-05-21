/**
 * Formats venue details with optional city/state
 */
export function formatVenue(venue: { 
  name: string; 
  city?: string; 
  state?: string;
}) {
  if (!venue.name) return 'Venue TBA';
  
  if (venue.city && venue.state) {
    return `${venue.name}, ${venue.city}, ${venue.state}`;
  }
  
  if (venue.city) {
    return `${venue.name}, ${venue.city}`;
  }
  
  if (venue.state) {
    return `${venue.name}, ${venue.state}`;
  }
  
  return venue.name;
}

/**
 * Format a date range into a friendly string
 */
export function formatDateRange(startDate: string, endDate?: string) {
  const start = new Date(startDate);
  
  if (!endDate) {
    return start.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  const end = new Date(endDate);
  
  // Same day
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Same month and year
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${start.toLocaleDateString('en-US', { day: 'numeric' })} - ${end.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })}`;
  }
  
  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })}`;
  }
  
  // Different years
  return `${start.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })} - ${end.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })}`;
}

/**
 * Format a duration in milliseconds to minutes and seconds
 */
export function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
} 