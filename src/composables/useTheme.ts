import { onMounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';

export function useTheme() {
  const updateTheme = (theme: any) => {
    console.log("[RollForShoes] Theme Update:", theme);
    console.log("[RollForShoes] Mode:", theme.mode);
    console.log("[RollForShoes] Background:", theme.background);

    const root = document.documentElement;
    
    // Set Mode Class
    if (theme.mode === 'DARK') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Map OBR Theme Colors to CSS Variables with High Contrast Overrides
    const isDark = theme.mode === 'DARK';

    // Backgrounds - Enforce distinct "Sheet" look
    // Dark: Slightly lighter/bluer than OBR's #222639 to stand out (Slate-900)
    // Light: Pure White to stand out against OBR's gray-ish #f1f3f9
    
    // The "Paper" is the card background
    root.style.setProperty('--obr-bg-paper', isDark ? '#1e293b' : '#ffffff'); 
    
    // The "Default" is the main app background behind the cards
    // Dark: Very dark slate to contrast with the lighter OBR background
    // Light: Warm, slightly yellow paper to look like a document on a desk
    root.style.setProperty('--obr-bg-default', isDark ? '#0f172a' : '#fefce8'); 

    // Text - Use OBR's exact values where possible for harmony, or our fallbacks
    root.style.setProperty('--obr-text-primary', theme.text?.primary || (isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)'));
    root.style.setProperty('--obr-text-secondary', theme.text?.secondary || (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'));
    root.style.setProperty('--obr-text-disabled', theme.text?.disabled || (isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.38)'));

    // Primary - Use OBR's if available, else our default Indigo
    root.style.setProperty('--obr-primary-main', theme.primary?.main || '#6366f1');
    root.style.setProperty('--obr-primary-contrast', theme.primary?.contrastText || '#ffffff');

    // Secondary
    root.style.setProperty('--obr-secondary-main', theme.secondary?.main || '#a855f7');
    root.style.setProperty('--obr-secondary-contrast', theme.secondary?.contrastText || '#ffffff');
  };

  onMounted(() => {
    if (!OBR.isAvailable) return;
    
    OBR.onReady(async () => {
      const theme = await OBR.theme.getTheme();
      updateTheme(theme);

      OBR.theme.onChange((newTheme) => {
         updateTheme(newTheme);
      });
    });
  });
}
