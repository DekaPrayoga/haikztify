import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { getAlbumTracks } from '../services/spotifyApi';
import usePlayerStore from '../store/playerStore';

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, addTrackToPlaylist, playlists, createPlaylist, toggleLike, likedIds } = usePlayerStore();

  const [tracks, setTracks] = useState([]);
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (off) => {
    if (off === 0) setLoading(true); else setLoadingMore(true);
    const result = await getAlbumTracks(id, 10, off);
    if (result.album && off === 0) setAlbum(result.album);
    setTracks(prev => off === 0 ? result.tracks : [...prev, ...result.tracks]);
    setTotal(result.total || 0);
    setOffset(off + result.tracks.length);
    if (off === 0) setLoading(false); else setLoadingMore(false);
  }, [id]);

  useEffect(() => { load(0); }, [id]);

  const formatDur = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const gradColors = ['#1a6b3c', '#6b1a5f', '#1a3b6b', '#6b4a1a', '#3b1a6b'];
  const gradColor = gradColors[id.charCodeAt(0) % gradColors.length];

  return (
    <div className="page-genre">
      {/* Header */}
      <div className="detail-header" style={{ background: `linear-gradient(to bottom, ${gradColor}, #121212)` }}>
        {album?.cover ? (
          <img className="detail-cover" src={album.cover} alt="" style={{ objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} />
        ) : (
          <div className="detail-cover" style={{ background: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="#535353" width="64" height="64"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
          </div>
        )}
        <div className="detail-info">
          <span className="detail-type">{album?.type === 'single' ? 'Single' : 'Album'}</span>
          <h1 className="detail-name" style={{ fontSize: album?.title?.length > 20 ? 32 : 48 }}>
            {album?.title || 'Loading...'}
          </h1>
          <p className="detail-meta">
            <span
              style={{ color: '#fff', fontWeight: 700, cursor: album?.artistId ? 'pointer' : 'default' }}
              onClick={() => album?.artistId && navigate(`/artist/${album.artistId}`)}
              onMouseEnter={(e) => { if (album?.artistId) e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              {album?.artist}
            </span>
            {album?.releaseDate && <span style={{ color: '#b3b3b3' }}> • {album.releaseDate.slice(0, 4)}</span>}
            {total > 0 && <span style={{ color: '#b3b3b3' }}> • {total} songs</span>}
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

      {/* Track list */}
      {loading ? (
        <div className="loader" style={{ paddingTop: 40 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto 60px', gap: 12, padding: '4px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#727272', textAlign: 'center' }}>#</span>
            <span style={{ fontSize: 12, color: '#727272' }}>Title</span>
            <span style={{ fontSize: 12, color: '#727272' }}></span>
            <span style={{ fontSize: 12, color: '#727272', textAlign: 'right' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>
            </span>
          </div>

          <div className="track-list">
            {tracks.map((t, i) => {
              const isActive = currentTrack?.id === t.id;
              const isLiked = likedIds.has(t.id);
              return (
                <div
                  key={t.id}
                  className={`track-row ${isActive ? 'track-active' : ''}`}
                  style={{ gridTemplateColumns: '32px 1fr auto 60px' }}
                  onClick={() => playTrack(t, tracks)}
                >
                  <span className="track-idx">
                    {isActive && isPlaying ? (
                      <span className="eq-bars"><span/><span/><span/></span>
                    ) : i + 1}
                  </span>
                  <div className="track-info">
                    <span className={`track-name ${isActive ? 'text-green' : ''}`}>{t.title}</span>
                    <span className="track-artist-sub"
                      style={{ cursor: t.artistId ? 'pointer' : 'default' }}
                      onClick={(e) => { e.stopPropagation(); if (t.artistId) navigate(`/artist/${t.artistId}`); }}
                      onMouseEnter={(e) => { if (t.artistId) e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.color = ''; }}
                    >
                      {t.artist}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
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
