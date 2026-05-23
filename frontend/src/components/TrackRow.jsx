import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/playerStore';

export default function TrackRow({ track, index, queue, playlistId }) {
  const { 
    playTrack, currentTrack, isPlaying, toggleLike, likedIds,
    playlists, addTrackToPlaylist, removeTrackFromPlaylist, createPlaylist 
  } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const isLiked = likedIds.has(track.id);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showDropdown) return;
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [showDropdown]);

  const formatTime = (s) => {
    if (!s || s <= 0) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`track-row ${isActive ? 'track-active' : ''}`}
      onClick={() => playTrack(track, queue)}
    >
      <span className="track-idx">
        {isActive && isPlaying ? (
          <span className="eq-bars"><span/><span/><span/></span>
        ) : (
          index + 1
        )}
      </span>
      <img className="track-cover" src={track.cover} alt="" loading="lazy" onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 80 80%27%3E%3Crect fill=%27%23282828%27 width=%2780%27 height=%2780%27/%3E%3Cpath d=%27M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 3a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm-3-6a3 3 0 1 0 6 0 3 3 0 0 0-6 0z%27 fill=%27%23555%27/%3E%3C/svg%3E'; }} />
      <div className="track-info">
        <span className={`track-name ${isActive ? 'text-green' : ''}`}>{track.title}</span>
        <span 
          className={`track-artist-sub ${track.artistId ? 'clickable' : ''}`}
          onClick={(e) => {
            if (track.artistId) {
              e.stopPropagation();
              navigate(`/artist/${track.artistId}`);
            }
          }}
        >
          {track.artist}
        </span>
      </div>
      <span 
        className={`track-album hide-mobile ${track.albumId ? 'clickable' : ''}`}
        onClick={(e) => {
          if (track.albumId) {
            e.stopPropagation();
            navigate(`/album/${track.albumId}`);
          }
        }}
      >
        {track.album}
      </span>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
        <button className={`like-btn-sm ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(track)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
          {isLiked ? (
            <svg viewBox="0 0 24 24" fill="#1db954" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          )}
        </button>

        {playlistId ? (
          <button 
            className="remove-btn-sm" 
            onClick={() => removeTrackFromPlaylist(playlistId, track.id)}
            title="Remove from playlist"
            style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#e91429'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        ) : (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              className="add-btn-sm" 
              onClick={() => setShowDropdown(!showDropdown)}
              title="Add to playlist"
              style={{
                background: 'none',
                border: 'none',
                color: '#b3b3b3',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
            
            {showDropdown && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  backgroundColor: '#181818',
                  borderRadius: '4px',
                  padding: '4px 0',
                  minWidth: '160px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                  zIndex: 100,
                  marginBottom: '8px',
                  border: '1px solid #282828'
                }}
              >
                <div style={{ padding: '8px 12px', fontSize: '11px', color: '#b3b3b3', borderBottom: '1px solid #282828', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Add to playlist
                </div>
                {playlists.length === 0 ? (
                  <div 
                    onClick={() => {
                      const name = window.prompt("Enter new playlist name:");
                      if (name) {
                        const newPl = createPlaylist(name.trim());
                        addTrackToPlaylist(newPl.id, track);
                      }
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#282828'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    + Create Playlist
                  </div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {playlists.map(pl => (
                      <div 
                        key={pl.id}
                        onClick={() => {
                          addTrackToPlaylist(pl.id, track);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          fontSize: '13px',
                          color: '#fff',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#282828'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {pl.name}
                      </div>
                    ))}
                    <div 
                      onClick={() => {
                        const name = window.prompt("Enter new playlist name:");
                        if (name) {
                          const newPl = createPlaylist(name.trim());
                          addTrackToPlaylist(newPl.id, track);
                        }
                        setShowDropdown(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        color: '#1db954',
                        cursor: 'pointer',
                        borderTop: '1px solid #282828',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#282828'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      + Create Playlist
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <span className="track-dur">{formatTime(track.duration)}</span>
    </div>
  );
}
