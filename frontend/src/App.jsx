import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Home from './pages/Home';
import Search from './pages/Search';
import Genre, { LikedSongs } from './pages/Genre';
import Playlist from './pages/Playlist';
import AlbumPage from './pages/AlbumPage';
import ArtistPage from './pages/ArtistPage';
import SpotifyPlaylistPage from './pages/SpotifyPlaylistPage';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import Library from './pages/Library';
import AIChat from './components/AIChat';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import usePlayerStore from './store/playerStore';

function KeyboardShortcuts() {
  const { togglePlay } = usePlayerStore();
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay]);
  return null;
}

function MobileHeader() {
  const navigate = useNavigate();
  return (
    <header className="mobile-header" onClick={() => navigate('/')}>
      <img src="/logo.png" alt="HaikZTIFY" width="32" height="32" style={{ borderRadius: 6 }} />
      <span className="mobile-header-title">HaikZTIFY</span>
    </header>
  );
}

function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLibActive = location.pathname.startsWith('/library') || location.pathname.startsWith('/playlist');
  return (
    <nav className="mobile-bottom-nav">
      <button className={`mobile-nav-btn ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577l-7.5-4.33zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-7h-3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732l7.5-4.33z"/></svg>
        <span>Home</span>
      </button>
      <button className={`mobile-nav-btn ${location.pathname === '/search' ? 'active' : ''}`} onClick={() => navigate('/search')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/></svg>
        <span>Search</span>
      </button>
      <button className={`mobile-nav-btn ${isLibActive ? 'active' : ''}`} onClick={() => navigate('/library')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zM15.5 2.134A1 1 0 0 0 14 3v18a1 1 0 0 0 2 0V4.732l5 2.886V21a1 1 0 1 0 2 0V7.04a1 1 0 0 0-.5-.866l-7-4.04zM9 2a1 1 0 0 0-1 1v18a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1z"/></svg>
        <span>Library</span>
      </button>
      <button className={`mobile-nav-btn ${location.pathname === '/liked' ? 'active' : ''}`} onClick={() => navigate('/liked')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        <span>Liked</span>
      </button>
    </nav>
  );
}

// Main layout (with sidebar + player)
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <MobileHeader />
      <main className="main-view">
        <div className="content-scroll">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/genre/:id" element={<Genre />} />
            <Route path="/liked" element={<LikedSongs />} />
            <Route path="/library" element={<Library />} />
            <Route path="/playlist/:id" element={<Playlist />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/spotify-playlist/:id" element={<SpotifyPlaylistPage />} />
          </Routes>
        </div>
      </main>
      <Player />
      <MobileNav />
      <AIChat />
      <KeyboardShortcuts />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
