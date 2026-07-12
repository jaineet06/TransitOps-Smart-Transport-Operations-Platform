import { create } from 'zustand';

const useThemeStore = create((set) => ({
  theme: 'dark', // default to dark
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('transitops-theme', nextTheme);
    
    const root = window.document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    return { theme: nextTheme };
  }),
  initTheme: () => {
    const savedTheme = localStorage.getItem('transitops-theme') || 'dark';
    const root = window.document.documentElement;
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    set({ theme: savedTheme });
  }
}));

export default useThemeStore;
