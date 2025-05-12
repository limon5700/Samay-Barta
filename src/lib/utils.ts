
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to format layout section names for display
export function formatSectionName(section: string | undefined | null): string {
  // Extra safety checks: ensure 'section' is a non-empty string before calling replace
  if (typeof section !== 'string' || !section) {
    // console.warn("formatSectionName received invalid input:", section);
    return 'N/A'; // Return 'N/A' or similar for invalid/missing sections
  }
  try {
    // Replace hyphens with spaces and capitalize each word
    return section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch (error) {
      console.error("Error in formatSectionName with input:", section, error);
      return section; // Return original value on error
  }
}
