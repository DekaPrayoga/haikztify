import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_SONGS } from '../data/catalog';
import { getTrending } from '../services/spotifyApi';
import { useAuth, API_BASE } from '../context/AuthContext';
import usePlayerStore from '../store/playerStore';

function mapUserTrack(t) {
  if (!t || !t.id) return null;
  return {
    id: `spotify_${t.id}`,
    spotifyId: t.id,
    title: t.name,
    artist: (t.artists || []).map(a => a.name).join(', '),
    album: t.album?.name || '',
    albumId: t.album?.id || '',
    cover: t.album?.images?.[0]?.url || t.images?.[0]?.url || '',
    src: t.preview_url ? `${API_BASE}/api/proxy?url=${encodeURIComponent(t.preview_url)}` : null,
    duration: Math.round((t.duration_ms || 0) / 1000),
    popularity: t.popularity || 0,
    artistId: t.artists?.[0]?.id || '',
  };
}

function mapUserAlbum(a) {
  if (!a || !a.id) return null;
  return {
    id: `album_${a.id}`,
    spotifyId: a.id,
    title: a.name,
    artist: (a.artists || []).map(x => x.name).join(', '),
    cover: a.images?.[0]?.url || '',
    desc: (a.artists || []).map(x => x.name).join(', '),
    artistId: a.artists?.[0]?.id || '',
  };
}

function mapUserPlaylist(p) {
  if (!p || !p.id) return null;
  return {
    id: p.id,
    title: p.name,
    desc: p.description || `${p.tracks?.total || 0} songs`,
    cover: p.images?.[0]?.url || '',
  };
}

function Card({ item, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <div className="card-img-wrap">
        <img src={item.cover} alt="" loading="lazy"
          onError={(e) => { e.target.style.background = '#282828'; e.target.src = ''; }} />
        <div className="card-play-btn">
          <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        </div>
      </div>
      <div className="card-title">{item.title}</div>
      <div className="card-sub">{item.desc || item.artist || ''}</div>
    </div>
  );
}

function CardSection({ title, items, loading, hasMore, onLoadMore, onCardClick, keyPrefix }) {
  if (!loading && items.length === 0) return null;
  return (
    <section className="home-section">
      <div className="section-heading-wrap">
        <h2 className="section-heading">{title}</h2>
      </div>
      {loading && items.length === 0
        ? <div className="loader"><div className="spinner" /></div>
        : (
          <div className="card-row" style={{ alignItems: 'flex-start' }}>
            {items.map((item, i) => (
              <Card key={`${keyPrefix}_${item.id || i}`} item={item}
                onClick={() => onCardClick && onCardClick(item)} />
            ))}
            {loading && (
              <div style={{ minWidth: 40, display: 'flex', alignItems: 'center', paddingTop: 60 }}>
                <div className="spinner" />
              </div>
            )}
            {!loading && hasMore && (
              <div style={{ minWidth: 110, display: 'flex', alignItems: 'center', paddingTop: 40, flexShrink: 0 }}>
                <button onClick={onLoadMore} className="load-more-btn">Show more</button>
              </div>
            )}
          </div>
        )
      }
    </section>
  );
}

function TrackSection({ title, tracks, loading, hasMore, onLoadMore, onTrackClick }) {
  if (!loading && tracks.length === 0) return null;
  return (
    <section className="home-section">
      <div className="section-heading-wrap">
        <h2 className="section-heading">{title}</h2>
      </div>
      {loading && tracks.length === 0
        ? <div className="loader"><div className="spinner" /></div>
        : (
          <>
            <div className="track-list">
              {tracks.map((t, i) => (
                <div key={`${t.id}_${i}`} className="track-row" onClick={() => onTrackClick(t, tracks)}>
                  <span className="track-idx">{i + 1}</span>
                  <img className="track-cover" src={t.cover} alt="" loading="lazy"
                    onError={(e) => { e.target.src = ''; e.target.style.background = '#282828'; }} />
                  <div className="track-info">
                    <span className="track-name">{t.title}</span>
                    <span className="track-artist-sub">{t.artist}</span>
                  </div>
                  <span className="track-album hide-mobile">{t.album}</span>
                  <span style={{ fontSize: 11, color: '#b3b3b3', paddingRight: 4 }}>
                    {t.popularity ? `🔥 ${t.popularity}` : ''}
                  </span>
                  <span className="track-dur">
                    {t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}` : '--:--'}
                  </span>
                </div>
              ))}
            </div>
            {loading && <div className="loader"><div className="spinner" /></div>}
            {!loading && hasMore && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <button onClick={onLoadMore} className="load-more-btn">Load more</button>
              </div>
            )}
          </>
        )
      }
    </section>
  );
}

// Simple fetch hook — refetches when `isLoggedIn` changes
function useSection(fetcher, isLoggedIn) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const loadingRef = useRef(false);

  const load = useCallback(async (off) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const result = await fetcher(off);
      const newItems = result.items || result.tracks || result.albums || result.playlists || [];
      setItems(prev => off === 0 ? newItems : [...prev, ...newItems]);
      const tot = result.total || 0;
      setTotal(tot);
      setHasMore(off + newItems.length < tot);
      setOffset(off + newItems.length);
    } catch (e) { console.error(e); }
    loadingRef.current = false;
    setLoading(false);
  }, [fetcher]);

  // Re-run whenever isLoggedIn changes
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setTotal(0);
    setHasMore(false);
    load(0);
  }, [isLoggedIn]);

  return { items, loading, hasMore, offset, total, load };
}

export default function Home() {
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();
  const { isLoggedIn, getToken, user } = useAuth();
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = user ? `${greet}, ${user.name?.split(' ')[0]}` : greet;
  const quickPicks = ALL_SONGS.slice(0, 8);

  // ── Top Tracks ────────────────────────────────────────────────────────────
  const topTracks = useSection(useCallback(async (off) => {
    if (!isLoggedIn) return { tracks: [], total: 0 };
    const token = await getToken();
    if (!token) return { tracks: [], total: 0 };
    const res = await fetch(`${API_BASE}/api/user/top-tracks?limit=10&offset=${off}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { tracks: [], total: 0 };
    const data = await res.json();
    return { tracks: (data.items || []).map(mapUserTrack).filter(Boolean), total: data.total || 0 };
  }, [isLoggedIn, getToken]), isLoggedIn);

  // ── Recommendations ───────────────────────────────────────────────────────
  const recs = useSection(useCallback(async (off) => {
    const token = isLoggedIn ? await getToken() : null;
    if (token) {
      const res = await fetch(`${API_BASE}/api/user/recommendations?limit=10&offset=${off}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const tracks = (data.tracks || []).map(mapUserTrack).filter(Boolean);
        return { tracks, total: tracks.length < 10 ? off + tracks.length : off + tracks.length + 1 };
      }
    }
    // Fallback: public trending
    const result = await getTrending(10, off);
    return { tracks: result.tracks || [], total: result.total || 0 };
  }, [isLoggedIn, getToken]), isLoggedIn);

  // ── Featured Playlists ────────────────────────────────────────────────────
  const featured = useSection(useCallback(async (off) => {
    if (!isLoggedIn) return { playlists: [], total: 0 };
    const token = await getToken();
    if (!token) return { playlists: [], total: 0 };
    const res = await fetch(`${API_BASE}/api/user/featured-playlists?limit=10&offset=${off}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { playlists: [], total: 0 };
    const data = await res.json();
    return {
      playlists: (data.playlists?.items || []).map(mapUserPlaylist).filter(Boolean),
      total: data.playlists?.total || 0,
    };
  }, [isLoggedIn, getToken]), isLoggedIn);

  // ── New Releases ──────────────────────────────────────────────────────────
  const newReleases = useSection(useCallback(async (off) => {
    if (!isLoggedIn) return { albums: [], total: 0 };
    const token = await getToken();
    if (!token) return { albums: [], total: 0 };
    const res = await fetch(`${API_BASE}/api/user/new-releases?limit=10&offset=${off}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { albums: [], total: 0 };
    const data = await res.json();
    return {
      albums: (data.albums?.items || []).map(mapUserAlbum).filter(Boolean),
      total: data.albums?.total || 0,
    };
  }, [isLoggedIn, getToken]), isLoggedIn);

  // ── Saved Albums ──────────────────────────────────────────────────────────
  const savedAlbums = useSection(useCallback(async (off) => {
    if (!isLoggedIn) return { albums: [], total: 0 };
    const token = await getToken();
    if (!token) return { albums: [], total: 0 };
    const res = await fetch(`${API_BASE}/api/user/saved-albums?limit=10&offset=${off}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { albums: [], total: 0 };
    const data = await res.json();
    return {
      albums: (data.items || []).map(i => mapUserAlbum(i.album)).filter(Boolean),
      total: data.total || 0,
    };
  }, [isLoggedIn, getToken]), isLoggedIn);

  // ── Trending (no-auth fallback) ───────────────────────────────────────────
  const trending = useSection(useCallback(async (off) => {
    if (isLoggedIn) return { tracks: [], total: 0 };
    const result = await getTrending(10, off);
    return { tracks: result.tracks || [], total: result.total || 0 };
  }, [isLoggedIn]), isLoggedIn);

  return (
    <div className="page-home">
      <h2 className="section-heading greeting">{greeting}</h2>

      {/* Quick Picks */}
      <div className="quick-grid">
        {quickPicks.map(s => (
          <div key={s.id} className="quick-card" onClick={() => playTrack(s, quickPicks)}>
            <img src={s.cover} alt="" loading="lazy"
              onError={(e) => { e.target.src = ''; e.target.style.background = '#333'; }} />
            <span>{s.title}</span>
            <div className="quick-play-btn" onClick={(e) => { e.stopPropagation(); playTrack(s, quickPicks); }}>
              <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
            </div>
          </div>
        ))}
      </div>

      {/* Login banner (not logged in) */}
      {!isLoggedIn && (
        <div style={{
          background: 'linear-gradient(135deg, #1db95422, #1db95408)',
          border: '1px solid #1db95433', borderRadius: 12,
          padding: '20px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              Dapatkan rekomendasi personal
            </div>
            <div style={{ color: '#b3b3b3', fontSize: 13 }}>
              Login dengan Spotify untuk Featured Playlists, New Releases & Top Tracks kamu.
            </div>
          </div>
          <button onClick={() => navigate('/login')} style={{
            background: '#1db954', color: '#000', border: 'none',
            borderRadius: '500px', padding: '10px 24px',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1ed760'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1db954'; }}
          >
            Login dengan Spotify
          </button>
        </div>
      )}

      {/* Top Tracks */}
      <TrackSection
        title="Your Top Tracks"
        tracks={topTracks.items}
        loading={topTracks.loading}
        hasMore={topTracks.hasMore}
        onLoadMore={() => topTracks.load(topTracks.offset)}
        onTrackClick={playTrack}
      />

      {/* Recommendations / Trending */}
      <CardSection
        title={isLoggedIn ? 'Recommended for You' : 'Trending Tracks'}
        items={recs.items.map(t => ({ ...t, desc: t.artist }))}
        loading={recs.loading}
        hasMore={recs.hasMore}
        onLoadMore={() => recs.load(recs.offset)}
        onCardClick={(item) => playTrack(item, recs.items)}
        keyPrefix="rec"
      />

      {/* Featured Playlists */}
      <CardSection
        title="Featured Playlists"
        items={featured.items}
        loading={featured.loading}
        hasMore={featured.hasMore}
        onLoadMore={() => featured.load(featured.offset)}
        onCardClick={(item) => navigate(`/spotify-playlist/${item.id}`)}
        keyPrefix="feat"
      />

      {/* New Releases */}
      <CardSection
        title="New Releases"
        items={newReleases.items}
        loading={newReleases.loading}
        hasMore={newReleases.hasMore}
        onLoadMore={() => newReleases.load(newReleases.offset)}
        onCardClick={(item) => navigate(`/album/${item.spotifyId}`)}
        keyPrefix="newrel"
      />

      {/* Saved Albums */}
      <CardSection
        title="Your Library"
        items={savedAlbums.items}
        loading={savedAlbums.loading}
        hasMore={savedAlbums.hasMore}
        onLoadMore={() => savedAlbums.load(savedAlbums.offset)}
        onCardClick={(item) => navigate(`/album/${item.spotifyId}`)}
        keyPrefix="saved"
      />

      {/* Trending fallback (no auth) */}
      <TrackSection
        title="Global Trending"
        tracks={trending.items}
        loading={trending.loading}
        hasMore={trending.hasMore}
        onLoadMore={() => trending.load(trending.offset)}
        onTrackClick={playTrack}
      />
    </div>
  );
}
