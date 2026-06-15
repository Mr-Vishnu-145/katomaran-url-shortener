import { create } from 'zustand';

const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  theme: localStorage.getItem('theme') || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),
  setUser: (user) => set({ user }),
  setInitialized: (val) => set({ isInitialized: val }),
  
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: nextTheme };
  }),

  initTheme: () => {
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: savedTheme });
  },

  login: (accessToken, user) => set({
    accessToken,
    user,
    isAuthenticated: true
  }),

  logout: () => {
    // Preserve theme preference — only clear auth session data
    const theme = localStorage.getItem('theme');
    localStorage.clear();
    sessionStorage.clear();
    if (theme) localStorage.setItem('theme', theme);
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false
    });
  }
}));

export default useAuthStore;
