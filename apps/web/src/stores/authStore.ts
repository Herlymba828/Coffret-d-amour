import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@coffret/shared';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  welcomePhrase: string | null;
  isAuthenticated: boolean;
  login: (sharedCode: string, password: string, asRole?: 'owner' | 'partner') => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      welcomePhrase: null,
      isAuthenticated: false,

      login: async (sharedCode, password, asRole) => {
        const res = await api.login(sharedCode, password, asRole);
        api.setToken(res.accessToken);
        connectSocket(res.accessToken);
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          welcomePhrase: res.welcomePhrase,
          isAuthenticated: true,
        });
      },

      logout: () => {
        api.setToken(null);
        disconnectSocket();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          welcomePhrase: null,
          isAuthenticated: false,
        });
      },

      hydrate: () => {
        const token = get().accessToken;
        if (token) {
          api.setToken(token);
          connectSocket(token);
        }
      },
    }),
    { name: 'coffret-auth' },
  ),
);

/**
 * L'access token vit 15 minutes : sans ce relais, la session paraissait valide
 * (isAuthenticated persisté) pendant que toutes les requêtes tombaient en 401.
 */
api.setRefreshHandler(async () => {
  const { refreshToken, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const res = await api.refresh(refreshToken);
    useAuthStore.setState({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    api.setToken(res.accessToken);
    // Le socket porte l'ancien token : on le rouvre avec le nouveau.
    connectSocket(res.accessToken);
    return res.accessToken;
  } catch {
    logout();
    return null;
  }
});
