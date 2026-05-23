import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/playerStore';
import Modal from './Modal';

export default function TrackRow({ track, index, queue, playlistId }) {
  const {
    playTrack, currentTrack, isPlaying, toggleLike, likedIds,
    playlists, addTrackToPlaylist, removeTrackFromPlaylist, createPlaylist,
  } = usePlayerStore();

  const isActive = currentTrack?.id === track.id;
  const isLiked = likedIds.has(track.id);

  const [showDropdown, setShowDropdown] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const fmt = (s) => {
    if (!s || s <= 0) return '--:--';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleCreateAndAdd = (name) => {
    if (!name) return;
    const newPl = createPlaylist(name);
    addTrackToPlaylist(newPl.id, track);
  };

  return (
    <>
      <div
        className={`track-row ${isActive ? 'track-active' : ''}`}
        onClick={() => playTrack(track, queue)}
      >
        {/* Index / EQ indicator */}
        <span className="track-idx">
          {isActive && isPlaying ? (
            <span className="eq-bars"><span /><span /><span /></span>
          ) : (
            index + 1
          )}
        </span>

        {/* Cover */}
        <img
          className="track-cover"
          src={track.cover}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%23282828' width='80' height='80'/%3E%3Cpath d='M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 3a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm-3-6a3 3 0 1 0 6 0 3 3 0 0 0-6 0z' fill='%23555'/%3E%3C/svg%3E";
          }}
        />

        {/* Info */}
        <div className="track-info">
          <span className={`track-name ${isActive ? 'text-green' : ''}`}>{track.title}</span>
          <span className="track-artist-sub">{track.artist}</span>
        </div>

        {/* Album */}
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

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
          {/* Like button */}
          <button
            className={`like-btn-sm ${isLiked ? 'liked' : ''}`}
            onClick={() => toggleLike(track)}
            title={isLiked ? 'Hapus dari Liked' : 'Tambah ke Liked'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {isLiked ? (
              <svg viewBox="0 0 24 24" fill="#1db954" width="16" height="16">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            )}
          </button>

          {/* Remove (inside playlist) or Add-to-playlist (outside) */}
          {playlistId ? (
            <button
              onClick={() => removeTrackFromPlaylist(playlistId, track.id)}
              title="Hapus dari playlist"
              style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e91429')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#b3b3b3')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          ) : (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown((v) => !v)}
                title="Tambah ke playlist"
                style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#b3b3b3')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>

              {showDropdown && (
                <div className="track-dropdown">
                  <div className="track-dropdown-header">Tambah ke playlist</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {playlists.map((pl) => (
                      <div
                        key={pl.id}
                        className="track-dropdown-item"
                        onClick={() => {
                          addTrackToPlaylist(pl.id, track);
                          setShowDropdown(false);
                        }}
                      >
                        {pl.name}
                      </div>
                    ))}
                    <div
                      className="track-dropdown-item track-dropdown-create"
                      onClick={() => {
                        setShowDropdown(false);
                        setCreateModalOpen(true);
                      }}
                    >
                      + Buat Playlist Baru
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Duration */}
        <span className="track-dur">{fmt(track.duration)}</span>
      </div>

      {/* Create playlist modal */}
      <Modal
        open={createModalOpen}
        title="Buat Playlist Baru"
        placeholder="Nama playlist…"
        onConfirm={handleCreateAndAdd}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
