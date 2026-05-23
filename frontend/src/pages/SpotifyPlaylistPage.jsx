import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { getSpotifyPlaylistTracks, API_BASE } from '../services/spotifyApi';
import usePlayerStore from '../store/playerStore';

export default function SpotifyPlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, toggleLike, likedIds, addTrackToPlaylist, playlists, createPlaylist } = usePlayerStore();

  const [tracks, setTracks] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(null);

  const load = useCallback(async (off) => {
    if (off === 0) setLoading(true); else setLoadingMore(true);
    try {
      let result = { tracks: [], total: 0 };
      // Try owner feed first (private playlists need this)
      try {
        const r = await fetch(`${API_BASE}/api/feed/playlist/${id}/tracks?limit=50&offset=${off}`);
        if (r.ok) {
          const d = await r.json();
          result = {
            tracks: (d.tracks || []).map(t => ({
              ...t,
              id: `spotify_${t.id}`,
              spotifyId: t.id,
              src: t.src ? `${API_BASE}/api/proxy?url=${encodeURIComponent(t.src)}` : null,
            })),
            total: d.total || 0,
          };
        }
      } catch {}
      // Fallback to public endpoint
      if (result.tracks.length === 0) {
        result = await getSpotifyPlaylistTracks(id, 20, off);
      }
      setTracks(prev => off === 0 ? result.tracks : [...prev, ...result.tracks]);
      setTotal(result.total || 0);
      setOffset(off + result.tracks.length);
    } catch (e) { console.error(e); }
    if (off === 0) setLoading(false); else setLoadingMore(false);
  }, [id]);

  useEffect(() => {
    setTracks([]);
    setOffset(0);
    setMeta(null);
    fetch(`${API_BASE}/api/feed/playlist/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(m => { if (m) setMeta(m); })
      .catch(() => {});
    load(0);
  }, [id]);

  const formatDur = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const gradColors = ['#1e6b3c', '#6b1e3c', '#1e3c6b', '#6b5c1e', '#3c1e6b', '#1e5c6b'];
  const gradColor = gradColors[id.charCodeAt(0) % gradColors.length];

  const handleAddToPlaylist = (track, playlistId) => {
    if (playlistId === '__new__') {
      const name = window.prompt('New playlist name:');
      if (!name) return;
      const pl = createPlaylist(name.trim());
      addTrackToPlaylist(pl.id, track);
    } else {
      addTrackToPlaylist(playlistId, track);
    }
    setShowAddMenu(null);
  };

  return (
    <div className="page-genre" onClick={() => setShowAddMenu(null)}>
      {/* Header */}
      <div className="detail-header" style={{ background: `linear-gradient(to bottom, ${gradColor}, #121212)` }}>
        <div className="detail-cover" style={{ background: gradColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)" width="64" height="64">
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="detail-info">
          <span className="detail-type">Playlist</span>
          <h1 className="detail-name" style={{ fontSize: 36 }}>{meta?.name || 'Spotify Playlist'}</h1>
          <p className="detail-meta" style={{ color: '#b3b3b3' }}>
            {meta ? `${meta.owner ? meta.owner + ' • ' : ''}${total || meta.tracks_count || 0} songs` : (total > 0 ? `${total} songs` : 'Loading...')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {tracks.length > 0 && (
          <button className="big-play-btn" onClick={() => playTrack(tracks[0], tracks)}>
            <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
          </button>
        )}
      </div>

      {/* Tracks */}
      {loading ? (
        <div className="loader" style={{ paddingTop: 40 }}><div className="spinner" /></div>
      ) : (
        <>
          <div className="track-list">
            {tracks.map((t, i) => {
              const isActive = currentTrack?.id === t.id;
              const isLiked = likedIds.has(t.id);
              return (
                <div
                  key={`${t.id}_${i}`}
                  className={`track-row ${isActive ? 'track-active' : ''}`}
                  onClick={() => playTrack(t, tracks)}
                >
                  <span className="track-idx">
                    {isActive && isPlaying
                      ? <span className="eq-bars"><span/><span/><span/></span>
                      : i + 1}
                  </span>
                  <img className="track-cover" src={t.cover} alt="" loading="lazy"
                    onError={(e) => { e.target.src = ''; e.target.style.background = '#282828'; }} />
                  <div className="track-info">
                    <span className={`track-name ${isActive ? 'text-green' : ''}`}>{t.title}</span>
                    <span
                      className="track-artist-sub"
                      style={{ cursor: t.artistId ? 'pointer' : 'default' }}
                      onClick={(e) => { e.stopPropagation(); if (t.artistId) navigate(`/artist/${t.artistId}`); }}
                      onMouseEnter={(e) => { if (t.artistId) { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.color = '#fff'; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.color = ''; }}
                    >
                      {t.artist}
                    </span>
                  </div>
                  <span className="track-album hide-mobile">{t.album}</span>

                  {/* Like + Add to playlist */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`like-btn-sm ${isLiked ? 'liked' : ''}`}
                      onClick={() => toggleLike(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {isLiked
                        ? <svg viewBox="0 0 24 24" fill="#1db954" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      }
                    </button>
                    {/* Add to playlist button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAddMenu(prev => prev === t.id ? null : t.id); }}
                        style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
                        title="Add to playlist"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                      </button>
                      {showAddMenu === t.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute', bottom: '100%', right: 0,
                            background: '#181818', borderRadius: 4, minWidth: 160,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.7)', zIndex: 100,
                            border: '1px solid #282828', marginBottom: 8,
                          }}
                        >
                          <div style={{ padding: '8px 12px', fontSize: 11, color: '#b3b3b3', borderBottom: '1px solid #282828', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Add to playlist
                          </div>
                          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                            {playlists.map(pl => (
                              <div
                                key={pl.id}
                                onClick={() => handleAddToPlaylist(t, pl.id)}
                                style={{ padding: '10px 12px', fontSize: 13, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#282828'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                {pl.name}
                              </div>
                            ))}
                            <div
                              onClick={() => handleAddToPlaylist(t, '__new__')}
                              style={{ padding: '10px 12px', fontSize: 13, color: '#1db954', cursor: 'pointer', borderTop: '1px solid #282828', fontWeight: 700 }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#282828'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              + Create playlist
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="track-dur">{formatDur(t.duration)}</span>
                </div>
              );
            })}
          </div>

          {loadingMore && <div className="loader"><div className="spinner" /></div>}
          {!loadingMore && offset < total && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button onClick={() => load(offset)} className="load-more-btn">Load more</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
