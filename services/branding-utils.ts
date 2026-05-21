/**
 * Branding Utilities
 * Normalizes and enhances team branding data for UI consumption.
 */

import { BrandingCache } from './supabase';

// Standard fallback colors if DB values are missing
const DEFAULT_PRIMARY = '#000000';
const DEFAULT_SECONDARY = '#ffffff';

/**
 * Normalizes branding data with safe fallbacks
 */
export const normalizeBranding = (branding: BrandingCache | null) => {
  return {
    primary: branding?.primary_color || DEFAULT_PRIMARY,
    secondary: branding?.secondary_color || DEFAULT_SECONDARY,
    logo: branding?.logo_url || '/placeholder-logo.png', // Ensure this path exists
    abbr: branding?.abbreviation || '??'
  };
};

/**
 * Simple contrast calculator (Black or White)
 * Based on luminance formula.
 */
export const getContrastColor = (hexColor: string): '#000000' | '#ffffff' => {
  // Remove '#' if present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // YIQ formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};
