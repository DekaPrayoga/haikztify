import { useNavigate, useLocation } from 'react-router-dom';
import { GENRES } from '../data/catalog';
import usePlayerStore from '../store/playerStore';
import { useAuth } from '../context/AuthContext';

const SpotifyLogo = () => (
  <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const HaikZTIFYLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <SpotifyLogo />
    <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>HaikZTIFY</span>
  </div>
);

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { likedIds, playlists, createPlaylist } = usePlayerStore();
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <nav className="sidebar">
      <div className="logo" onClick={() => navigate('/')}>
        <HaikZTIFYLogo />
      </div>

      <ul className="nav-menu">
        <li className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577l-7.5-4.33zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-7h-3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732l7.5-4.33z"/></svg>
          <span>Home</span>
        </li>
        <li className={`nav-item ${location.pathname === '/search' ? 'active' : ''}`} onClick={() => navigate('/search')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/></svg>
          <span>Search</span>
        </li>
      </ul>

      <div className="library-section">
        <div className="library-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="library-title">
            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
            <span>Playlist</span>
          </div>
          <button 
            className="create-playlist-btn" 
            onClick={() => {
              const name = window.prompt("Enter new playlist name:");
              if (name !== null) {
                const newPl = createPlaylist(name.trim() || undefined);
                navigate(`/playlist/${newPl.id}`);
              }
            }}
            title="Create Playlist"
            style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
              transition: 'color 0.2s, background-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = '#242424'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#b3b3b3'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
          </button>
        </div>
        <div className="library-scroll">
          <div className="lib-item" onClick={() => navigate('/liked')}>
            <div className="lib-cover liked-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="white" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <div>
              <div className="lib-name">Liked Songs</div>
              <div className="lib-meta">Playlist • {likedIds.size} songs</div>
            </div>
          </div>
          {playlists.map(pl => (
            <div key={pl.id} className="lib-item" onClick={() => navigate(`/playlist/${pl.id}`)}>
              {pl.tracks.length > 0 && pl.tracks[0].cover ? (
                <img className="lib-cover" src={pl.tracks[0].cover} alt="" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="lib-cover custom-playlist-cover" style={{ background: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="#b3b3b3" width="20" height="20"><path d="M6 3h12v2H6zm0 4h12v2H6zm0 4h8v2H6zm10 0h2v5h-2zm-3 5h8v2h-8z"/></svg>
                </div>
              )}
              <div>
                <div className="lib-name">{pl.name}</div>
                <div className="lib-meta">Playlist • {pl.tracks.length} songs</div>
              </div>
            </div>
          ))}
          {GENRES.map(g => (
            <div key={g.category} className="lib-item" onClick={() => navigate(`/genre/${g.category}`)}>
              {g.image ? (
                <img className="lib-cover" src={g.image} alt="" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="lib-cover" style={{ background: g.color }}>{g.name.charAt(0)}</div>
              )}
              <div>
                <div className="lib-name">{g.name} Mix</div>
                <div className="lib-meta">Playlist</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User profile / Login */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 'auto' }}>
        {isLoggedIn && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {user.avatar
              ? <img src={user.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#535353', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="#b3b3b3" width="18" height="18"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                </div>
              )
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: '#b3b3b3' }}>{user.product === 'premium' ? '✦ Premium' : 'Free'}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#e91429'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
