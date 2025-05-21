
import ReactGA from "react-ga4";

/**
 * Initialize Google Analytics with your tracking ID
 * @param trackingId Your Google Analytics tracking ID (e.g., "G-XXXXXXXXXX")
 */
export const initGA = (trackingId: string) => {
  if (!trackingId) {
    console.warn("Google Analytics tracking ID is missing. Analytics will not be initialized.");
    return;
  }
  
  try {
    ReactGA.initialize(trackingId);
    console.log("Google Analytics initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Google Analytics:", error);
  }
};

/**
 * Track a page view in Google Analytics
 * @param path The path to track (e.g., "/home")
 * @param title The page title
 */
export const trackPageView = (path: string, title?: string) => {
  try {
    ReactGA.send({ hitType: "pageview", page: path, title });
    console.log(`Page view tracked: ${path}`);
  } catch (error) {
    console.error("Failed to track page view:", error);
  }
};

/**
 * Track an event in Google Analytics
 * @param category Event category
 * @param action Event action
 * @param label Event label (optional)
 * @param value Event value (optional)
 */
export const trackEvent = (
  category: string, 
  action: string, 
  label?: string, 
  value?: number
) => {
  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
    console.log(`Event tracked: ${category} - ${action}`);
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};

/**
 * Set user ID for user tracking
 * @param userId The user ID to set
 */
export const setUserId = (userId: string) => {
  try {
    ReactGA.set({ userId });
    console.log(`User ID set: ${userId}`);
  } catch (error) {
    console.error("Failed to set user ID:", error);
  }
};
