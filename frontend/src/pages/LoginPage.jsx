import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../context/AuthContext';

export default function LoginPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn]);

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#121212',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
        {/* Spotify logo */}
        <svg viewBox="0 0 24 24" fill="#1db954" width="64" height="64" style={{ marginBottom: 32 }}>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>

        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
          HaikZTIFY
        </h1>
        <p style={{ color: '#b3b3b3', fontSize: 16, marginBottom: 40, lineHeight: 1.5 }}>
          Login dengan akun Spotify kamu untuk<br />
          menikmati musik, playlist, dan rekomendasi personal.
        </p>

        <button
          onClick={handleLogin}
          style={{
            background: '#1db954', color: '#000', border: 'none',
            borderRadius: '500px', padding: '16px 48px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'transform 0.1s, background 0.15s',
            display: 'inline-flex', alignItems: 'center', gap: 12,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.background = '#1ed760'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#1db954'; }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Login dengan Spotify
        </button>

        <p style={{ color: '#535353', fontSize: 12, marginTop: 32, lineHeight: 1.6 }}>
          Dengan login, kamu menyetujui akses read-only ke<br />
          profil, playlist, dan histori musik kamu di Spotify.
        </p>
      </div>
    </div>
  );
}
