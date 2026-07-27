import { useEffect } from "react";

/**
 * Sets document.title to "<title> | Mindful Check-In" for as long as the
 * calling component is mounted. Falls back to the app's default title
 * (already set in index.html) if no title is passed.
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | Mindful Check-In` : "Mindful Check-In | Mental Health Assessment";
    return () => {
      document.title = previous;
    };
  }, [title]);
}