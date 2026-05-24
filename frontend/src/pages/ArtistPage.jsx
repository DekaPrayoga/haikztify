import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { getArtistTopTracks, getArtistAlbums } from '../services/spotifyApi';
import usePlayerStore from '../store/playerStore';

function formatFollowers(n) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M followers`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K followers`;
  return `${n} followers`;
}

export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, toggleLike, likedIds } = usePlayerStore();

  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [albumsTotal, setAlbumsTotal] = useState(0);
  const [albumsOffset, setAlbumsOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTracks([]);
    setAlbums([]);
    setAlbumsOffset(0);

    Promise.all([
      getArtistTopTracks(id),
      getArtistAlbums(id, 10, 0),
    ]).then(([topResult, albumsResult]) => {
      setArtist(topResult.artist);
      setTracks(topResult.tracks);
      setAlbums(albumsResult.albums);
      setAlbumsTotal(albumsResult.total);
      setAlbumsOffset(albumsResult.albums.length);
      setLoading(false);
    });
  }, [id]);

  const loadMoreAlbums = useCallback(async () => {
    setAlbumsLoading(true);
    const result = await getArtistAlbums(id, 10, albumsOffset);
    setAlbums(prev => [...prev, ...result.albums]);
    setAlbumsOffset(prev => prev + result.albums.length);
    setAlbumsLoading(false);
  }, [id, albumsOffset]);

  const formatDur = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const visibleTracks = showAllTracks ? tracks : tracks.slice(0, 5);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="page-empty" style={{ textAlign: 'center', padding: 40 }}>
        <h2>Artist not found</h2>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, color: '#1db954', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="page-genre">
      {/* Hero banner with dynamic ambient color */}
      <div style={{
        position: 'relative', height: 280, margin: '-24px -32px 0',
        background: '#121212',
        overflow: 'hidden',
      }}>
        {artist.cover && (
          <>
            {/* Blurred ambient background */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${artist.cover})`,
              backgroundSize: 'cover', backgroundPosition: 'center top',
              filter: 'blur(40px) saturate(2) brightness(0.32)',
              transform: 'scale(1.12)',
            }} />
            {/* Artist photo on top */}
            <img
              src={artist.cover} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.65, position: 'absolute', inset: 0 }}
            />
          </>
        )}
        {/* Gradient fade */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(18,18,18,0.6) 60%, #121212 100%)' }} />
        <div style={{ position: 'absolute', bottom: 24, left: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#1db954"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <span style={{ color: '#1db954' }}>Verified Artist</span>
          </div>
          <h1 style={{ fontSize: artist.name.length > 15 ? 40 : 56, fontWeight: 900, lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            {artist.name}
          </h1>
          <p style={{ color: '#b3b3b3', fontSize: 14, marginTop: 8 }}>{formatFollowers(artist.followers)}</p>
        </div>
      </div>

      {/* Play button */}
      <div className="detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 16 }}>
        {tracks.length > 0 && (
          <button className="big-play-btn" onClick={() => playTrack(tracks[0], tracks)}>
            <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
          </button>
        )}
      </div>

      {/* Popular tracks */}
      {tracks.length > 0 && (
        <section className="home-section">
          <h2 className="section-heading" style={{ marginBottom: 16 }}>Popular</h2>
          <div className="track-list">
            {visibleTracks.map((t, i) => {
              const isActive = currentTrack?.id === t.id;
              const isLiked = likedIds.has(t.id);
              return (
                <div
                  key={t.id}
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
                    <span className="track-artist-sub">{t.album}</span>
                  </div>
                  <span className="track-album hide-mobile">
                    {t.popularity ? `🔥 ${t.popularity}` : ''}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
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
          {tracks.length > 5 && (
            <button
              onClick={() => setShowAllTracks(v => !v)}
              style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: '12px 12px', letterSpacing: '0.05em' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
            >
              {showAllTracks ? 'Show less' : 'See more'}
            </button>
          )}
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="home-section">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Discography</h2>
          </div>
          <div className="card-row">
            {albums.map(al => (
              <div key={al.id} className="card" onClick={() => navigate(`/album/${al.spotifyId || al.id.replace('album_', '')}`)}>
                <div className="card-img-wrap">
                  <img src={al.cover} alt="" loading="lazy"
                    onError={(e) => { e.target.style.background = '#282828'; e.target.src = ''; }} />
                  <div className="card-play-btn">
                    <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
                  </div>
                </div>
                <div className="card-title">{al.title}</div>
                <div className="card-sub">{al.desc || al.type}</div>
              </div>
            ))}
          </div>
          {albumsLoading && <div className="loader"><div className="spinner" /></div>}
          {!albumsLoading && albumsOffset < albumsTotal && (
            <div style={{ textAlign: 'center', paddingTop: 12 }}>
              <button onClick={loadMoreAlbums} className="load-more-btn">Load more albums</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
