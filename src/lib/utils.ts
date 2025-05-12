import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to format ad placement names for display
export function formatPlacementName(place: string | undefined | null): string {
   // Extra safety checks: ensure 'place' is a non-empty string before calling replace
  if (typeof place !== 'string' || !place) {
    // console.warn("formatPlacementName received invalid input:", place);
    return 'N/A'; // Return 'N/A' or similar for invalid/missing placements
  }
  try {
    // Replace hyphens with spaces and capitalize each word
    return place.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch (error) {
      console.error("Error in formatPlacementName with input:", place, error);
      return place; // Return original value on error
  }
}
