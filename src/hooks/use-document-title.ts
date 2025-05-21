
import { useEffect } from 'react';

/**
 * Custom hook to set document title and meta description
 */
export function useDocumentTitle(
  title: string,
  description?: string,
  suffix = "TheSet"
) {
  useEffect(() => {
    // Format the full title
    const formattedTitle = title ? `${title} | ${suffix}` : `${suffix} | Vote on concert setlists for your favorite artists`;
    
    // Update the document title
    document.title = formattedTitle;
    
    // Update meta description if provided
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = `TheSet | Vote on concert setlists for your favorite artists`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          'content', 
          'Join TheSet to vote on setlists for upcoming concerts and influence what your favorite artists will play live.'
        );
      }
    };
  }, [title, description, suffix]);
}
