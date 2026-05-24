import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';

export default function CallbackPage() {
  const { saveTokens } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Logging you in...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      setStatus('Login dibatalkan.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Exchange one-time code for real tokens (tokens never touch the URL)
    const code = params.get('code');
    if (code) {
      fetch(`${API_BASE}/auth/token-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(tokens => {
          saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
          return fetch(`${API_BASE}/api/me`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }).then(r => r.ok ? r.json() : null);
        })
        .then(user => {
          if (user) sessionStorage.setItem('sp_user', JSON.stringify(user));
          navigate('/');
        })
        .catch(() => {
          setStatus('Login gagal. Coba lagi.');
          setTimeout(() => navigate('/login'), 2000);
        });
      return;
    }

    setStatus('Parameter tidak valid.');
    setTimeout(() => navigate('/login'), 2000);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#121212',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, fontFamily: 'Inter, sans-serif',
    }}>
      <svg viewBox="0 0 24 24" fill="#1db954" width="48" height="48">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #282828', borderTopColor: '#1db954', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <p style={{ color: '#b3b3b3', fontSize: 14 }}>{status}</p>
    </div>
  );
}
