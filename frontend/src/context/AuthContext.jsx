import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL
  || (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001');

export { API_BASE };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // { id, name, email, avatar, product }
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('sp_access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('sp_refresh_token'));
  const [expiresAt, setExpiresAt] = useState(() => parseInt(localStorage.getItem('sp_expires_at') || '0'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setExpiresAt(0);
    sessionStorage.removeItem('sp_access_token');
    sessionStorage.removeItem('sp_user');
    localStorage.removeItem('sp_refresh_token');
    localStorage.removeItem('sp_expires_at');
  }, []);

  const saveTokens = useCallback((access, refresh, expiresIn) => {
    const exp = Date.now() + expiresIn * 1000;
    setAccessToken(access);
    if (refresh) setRefreshToken(refresh);
    setExpiresAt(exp);
    sessionStorage.setItem('sp_access_token', access);
    if (refresh) localStorage.setItem('sp_refresh_token', refresh);
    localStorage.setItem('sp_expires_at', String(exp));
  }, []);

  const refreshAccessToken = useCallback(async (rToken) => {
    const rt = rToken || refreshToken;
    if (!rt) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh?refresh_token=${encodeURIComponent(rt)}`);
      if (!res.ok) { logout(); return null; }
      const data = await res.json();
      if (data.access_token) {
        saveTokens(data.access_token, data.refresh_token || rt, data.expires_in || 3600);
        return data.access_token;
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }
    return null;
  }, [refreshToken, logout, saveTokens]);

  // Get a valid token (refresh if needed)
  const getToken = useCallback(async () => {
    if (accessToken && Date.now() < expiresAt - 60000) return accessToken;
    if (refreshToken) return await refreshAccessToken();
    return null;
  }, [accessToken, expiresAt, refreshToken, refreshAccessToken]);

  // Fetch user profile
  const fetchUser = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }, []);

  // On mount: if we have tokens, fetch user
  useEffect(() => {
    (async () => {
      setLoading(true);
      // Check sessionStorage for cached user first (set by CallbackPage)
      const cachedUser = sessionStorage.getItem('sp_user');
      if (cachedUser) {
        try { setUser(JSON.parse(cachedUser)); } catch {}
      }
      let tok = accessToken;
      if (!tok || Date.now() >= expiresAt - 60000) {
        tok = await refreshAccessToken();
      }
      if (tok) {
        const u = await fetchUser(tok);
        if (u) {
          setUser(u);
          sessionStorage.setItem('sp_user', JSON.stringify(u));
        }
      }
      setLoading(false);
    })();
  }, []);

  // Handle OAuth callback — called from CallbackPage
  const handleCallback = useCallback(async (code) => {
    try {
      const res = await fetch(`${API_BASE}/auth/callback?code=${encodeURIComponent(code)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.access_token) return false;
      saveTokens(data.access_token, data.refresh_token, data.expires_in || 3600);
      const u = await fetchUser(data.access_token);
      setUser(u);
      return true;
    } catch (e) {
      console.error('Callback error:', e);
      return false;
    }
  }, [saveTokens, fetchUser]);

  const isLoggedIn = !!user && !!accessToken;

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoggedIn, loading, getToken, handleCallback, logout, saveTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// Helper: make authenticated Spotify API call via our proxy
export async function spotifyFetch(path, getToken) {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/spotify${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('spotifyFetch error:', path, e);
    return null;
  }
}
