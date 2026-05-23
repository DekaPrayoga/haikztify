import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import usePlayerStore from '../store/playerStore';
import TrackRow from '../components/TrackRow';
import { searchTracks, getTrending } from '../services/spotifyApi';

export default function Playlist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, deletePlaylist, playTrack, removeTrackFromPlaylist, addTrackToPlaylist } = usePlayerStore();

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalResults, setModalResults] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalOffset, setModalOffset] = useState(0);
  const [modalLoadingMore, setModalLoadingMore] = useState(false);
  // Default songs shown when no query (trending)
  const [defaultSongs, setDefaultSongs] = useState([]);
  const [defaultOffset, setDefaultOffset] = useState(0);
  const [defaultTotal, setDefaultTotal] = useState(0);
  const [defaultLoading, setDefaultLoading] = useState(false);

  const searchRef = useRef(null);
  const timerRef = useRef(null);
  const currentQuery = useRef('');
  const listRef = useRef(null);
  const defaultLoadingRef = useRef(false);
  const modalLoadingMoreRef = useRef(false);

  const playlist = playlists.find(pl => pl.id === id);

  // Load trending as default suggestions
  const loadDefault = useCallback(async (off) => {
    if (defaultLoadingRef.current) return;
    defaultLoadingRef.current = true;
    setDefaultLoading(true);
    try {
      const result = await getTrending(10, off);
      setDefaultSongs(prev => off === 0 ? result.tracks : [...prev, ...result.tracks]);
      setDefaultTotal(result.total || 0);
      setDefaultOffset(off + result.tracks.length);
    } catch (e) {
      console.error('loadDefault error:', e);
    }
    defaultLoadingRef.current = false;
    setDefaultLoading(false);
  }, []);

  useEffect(() => {
    if (showAddModal && defaultSongs.length === 0) {
      loadDefault(0);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (showAddModal && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (!showAddModal) {
      setSearchQuery('');
      setModalResults([]);
      setModalTotal(0);
      setModalOffset(0);
    }
  }, [showAddModal]);

  // Search via Spotify API
  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setModalResults([]);
      setModalTotal(0);
      setModalOffset(0);
      return;
    }
    currentQuery.current = q;
    setModalLoading(true);
    setModalResults([]);
    const result = await searchTracks(q, 10, 0);
    if (currentQuery.current !== q) return;
    setModalResults(result.tracks);
    setModalTotal(result.total);
    setModalOffset(result.tracks.length);
    setModalLoading(false);
  }, []);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 350);
  };

  const loadMoreModal = useCallback(async () => {
    if (modalLoadingMoreRef.current || !searchQuery) return;
    modalLoadingMoreRef.current = true;
    setModalLoadingMore(true);
    try {
      const result = await searchTracks(searchQuery, 10, modalOffset);
      setModalResults(prev => [...prev, ...result.tracks]);
      setModalOffset(prev => prev + result.tracks.length);
    } catch (e) {
      console.error('loadMoreModal error:', e);
    }
    modalLoadingMoreRef.current = false;
    setModalLoadingMore(false);
  }, [searchQuery, modalOffset]);

  // Check if a song is already in playlist (by spotifyId or id)
  const isInPlaylist = (song) => {
    if (!playlist) return false;
    return playlist.tracks.some(t =>
      t.id === song.id ||
      (t.spotifyId && song.spotifyId && t.spotifyId === song.spotifyId)
    );
  };

  // Displayed songs in modal
  const displaySongs = searchQuery.trim().length >= 2 ? modalResults : defaultSongs;
  const displayLoading = searchQuery.trim().length >= 2 ? modalLoading : defaultLoading;
  const displayTotal = searchQuery.trim().length >= 2 ? modalTotal : defaultTotal;
  const displayOffset = searchQuery.trim().length >= 2 ? modalOffset : defaultOffset;
  const hasMoreModal = displayOffset < displayTotal;

  if (!playlist) {
    return (
      <div className="page-empty" style={{ padding: 32, textAlign: 'center' }}>
        <h2>Playlist not found</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 16, background: '#1db954', color: '#fff',
            border: 'none', borderRadius: '20px', padding: '8px 24px',
            fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${playlist.name}"?`)) {
      deletePlaylist(playlist.id);
      navigate('/');
    }
  };

  return (
    <div className="page-genre">
      {/* Header */}
      <div className="detail-header" style={{ background: 'linear-gradient(to bottom, #3a3a3a, #121212)' }}>
        {playlist.tracks.length > 0 && playlist.tracks[0].cover ? (
          <img className="detail-cover" src={playlist.tracks[0].cover} alt="" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="detail-cover" style={{ background: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="#b3b3b3" width="64" height="64">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
            </svg>
          </div>
        )}
        <div className="detail-info">
          <span className="detail-type">Playlist</span>
          <h1 className="detail-name">{playlist.name}</h1>
          <p className="detail-meta">{playlist.tracks.length} songs</p>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {playlist.tracks.length > 0 && (
          <button className="big-play-btn" onClick={() => playTrack(playlist.tracks[0], playlist.tracks)}>
            <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
          </button>
        )}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'none', border: '1px solid #535353', color: '#b3b3b3',
            padding: '8px 20px', borderRadius: '20px', fontWeight: 700,
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            transition: 'border-color 0.15s, color 0.15s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#535353'; e.currentTarget.style.color = '#b3b3b3'; }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Add songs
        </button>
        <button
          onClick={handleDelete}
          style={{
            background: 'none', border: '1px solid #535353', color: '#b3b3b3',
            padding: '8px 16px', borderRadius: '20px', fontWeight: 700,
            cursor: 'pointer', fontSize: 13, transition: 'border-color 0.15s, color 0.15s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e91429'; e.currentTarget.style.color = '#e91429'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#535353'; e.currentTarget.style.color = '#b3b3b3'; }}
        >
          Delete Playlist
        </button>
      </div>

      {/* Track list */}
      {playlist.tracks.length === 0 ? (
        <div style={{ padding: '48px 32px', textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" fill="#535353" width="48" height="48" style={{ marginBottom: 16 }}>
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
          </svg>
          <p style={{ color: '#b3b3b3', marginBottom: 24, fontSize: 15 }}>
            Let's find something for your playlist
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#fff', color: '#000', border: 'none',
              borderRadius: '20px', padding: '12px 32px',
              fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            Find songs
          </button>
        </div>
      ) : (
        <>
          <div className="track-list">
            {playlist.tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                queue={playlist.tracks}
                playlistId={playlist.id}
              />
            ))}
          </div>
          <div style={{ padding: '24px 0 8px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Let's find something for your playlist</span>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'transparent', border: '1px solid #727272', color: '#fff',
                  borderRadius: '20px', padding: '8px 20px', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#727272'}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add songs
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== ADD SONGS MODAL ===== */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#282828', borderRadius: 8, width: 560,
              maxWidth: '94vw', maxHeight: '82vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
            }}
          >
            {/* Modal header */}
            <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add to "{playlist.name}"</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', display: 'flex', padding: 4 }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              {/* Search bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#3e3e3e', borderRadius: 4, padding: '9px 12px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#b3b3b3" style={{ flexShrink: 0 }}>
                  <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/>
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search for songs or artists"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setModalResults([]); setModalTotal(0); setModalOffset(0); }}
                    style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                )}
              </div>
              {!searchQuery.trim() && (
                <p style={{ fontSize: 12, color: '#727272', marginTop: 8 }}>Trending on Spotify — scroll for more</p>
              )}
            </div>

            {/* Song list */}
            <div ref={listRef} style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
              {displayLoading && modalResults.length === 0 && defaultSongs.length === 0 ? (
                <div className="loader"><div className="spinner" /></div>
              ) : displaySongs.length === 0 && !displayLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#b3b3b3' }}>
                  {searchQuery ? `No results for "${searchQuery}"` : 'Loading suggestions...'}
                </div>
              ) : (
                <>
                  {displaySongs.map((song) => {
                    const added = isInPlaylist(song);
                    return (
                      <div
                        key={song.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 16px', transition: 'background 0.15s',
                          background: added ? 'rgba(29,185,84,0.08)' : 'transparent'
                        }}
                        onMouseEnter={(e) => { if (!added) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = added ? 'rgba(29,185,84,0.08)' : 'transparent'; }}
                      >
                        <img
                          src={song.cover}
                          alt=""
                          width={40} height={40}
                          style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: '#333' }}
                          onError={(e) => { e.target.style.background = '#333'; e.target.src = ''; }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: added ? '#1db954' : '#fff' }}>
                            {song.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#b3b3b3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.artist}
                          </div>
                        </div>
                        {added ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1db954', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            Added
                          </div>
                        ) : (
                          <button
                            onClick={() => addTrackToPlaylist(playlist.id, song)}
                            style={{
                              background: 'transparent', border: '1px solid #727272', color: '#fff',
                              borderRadius: '20px', padding: '5px 16px', fontWeight: 700,
                              fontSize: 12, cursor: 'pointer', flexShrink: 0,
                              transition: 'border-color 0.15s, background 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#727272'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Load more / spinner */}
                  {(displayLoading || modalLoadingMore || defaultLoading) && (
                    <div className="loader"><div className="spinner" /></div>
                  )}
                  {!displayLoading && !modalLoadingMore && !defaultLoading && hasMoreModal && (
                    <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                      <button
                        onClick={() => {
                          if (searchQuery.trim().length >= 2) loadMoreModal();
                          else loadDefault(defaultOffset);
                        }}
                        className="load-more-btn"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
