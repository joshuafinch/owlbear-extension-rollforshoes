import { onMounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';

export function useTheme() {
  const updateTheme = (theme: any) => {
    // console.log("[RollForShoes] Theme Update:", theme.mode);

    const root = document.documentElement;
    
    // Set Mode Class
    if (theme.mode === 'DARK') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // NOTE: All specific color variables are now handled in src/style.css
    // using CSS variables and the .dark selector.
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
