import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,           // { id, name, role, email }
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,      // true until the boot /auth/refresh resolves

  /**
   * setAuth — update token and/or user.
   * Only flips isAuthenticated to true when BOTH accessToken and user are present.
   * Prevents the window where isAuthenticated=true but user=null (sidebar crash).
   */
  setAuth: ({ user, accessToken }) =>
    set((state) => {
      const nextUser = user !== undefined ? user : state.user;
      const nextToken = accessToken !== undefined ? accessToken : state.accessToken;
      return {
        user: nextUser,
        accessToken: nextToken,
        // Only mark authenticated when we have a token AND a user object
        isAuthenticated: !!(nextToken && nextUser),
        isLoading: false,
      };
    }),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));

export default useAuthStore;
