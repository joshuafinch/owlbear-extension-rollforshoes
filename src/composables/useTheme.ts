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

    // Map OBR Theme Colors to CSS Variables
    // Backgrounds
    root.style.setProperty('--obr-bg-default', theme.background?.default || '#ffffff');
    root.style.setProperty('--obr-bg-paper', theme.background?.paper || '#f3f4f6');
    
    // Text
    root.style.setProperty('--obr-text-primary', theme.text?.primary || '#000000');
    root.style.setProperty('--obr-text-secondary', theme.text?.secondary || '#6b7280');
    root.style.setProperty('--obr-text-disabled', theme.text?.disabled || '#9ca3af');

    // Primary
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
