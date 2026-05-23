import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES, ALL_SONGS } from '../data/catalog';
import { searchTracks, getTrending, getCategories } from '../services/spotifyApi';
import TrackRow from '../components/TrackRow';
import usePlayerStore from '../store/playerStore';

// ── Browse section shown when no query ──────────────────────────────────────
function BrowseSection({ onGenreClick }) {
  const [categories, setCategories] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [catOffset, setCatOffset] = useState(0);
  const [catTotal, setCatTotal] = useState(0);
  const [trending, setTrending] = useState([]);
  const [trendOffset, setTrendOffset] = useState(0);
  const [trendTotal, setTrendTotal] = useState(0);
  const [trendLoading, setTrendLoading] = useState(false);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const mountedRef = useRef(false);
  const catLoadingRef = useRef(false);
  const trendLoadingRef = useRef(false);

  const loadCats = async (off) => {
    if (catLoadingRef.current) return;
    catLoadingRef.current = true;
    setLoadingCat(true);
    try {
      const result = await getCategories(10, off);
      setCategories((prev) => (off === 0 ? result.categories : [...prev, ...result.categories]));
      setCatTotal(result.total || 0);
      setCatOffset(off + result.categories.length);
    } catch (_) {}
    catLoadingRef.current = false;
    setLoadingCat(false);
  };

  const loadTrending = async (off) => {
    if (trendLoadingRef.current) return;
    trendLoadingRef.current = true;
    setTrendLoading(true);
    try {
      const result = await getTrending(10, off);
      setTrending((prev) => (off === 0 ? result.tracks : [...prev, ...result.tracks]));
      setTrendTotal(result.total || 0);
      setTrendOffset(off + result.tracks.length);
    } catch (_) {}
    trendLoadingRef.current = false;
    setTrendLoading(false);
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadCats(0);
    loadTrending(0);
  }, []);

  const GENRE_COLORS = {
    pop: '#8D67AB', hiphop: '#BA5D07', rock: '#E8115B', electronic: '#148A08',
    jazz: '#1E3264', classical: '#503750', indie: '#477D95', rnb: '#E13300',
    country: '#DC148C', latin: '#E61E32', mood: '#1E3264', workout: '#E8115B',
    kpop: '#E13300', metal: '#333333', punk: '#504F4F', folk: '#477D95',
    soul: '#BA5D07', blues: '#1E3264', reggae: '#148A08', alternative: '#503750',
  };

  return (
    <>
      {/* Trending Now */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="section-heading" style={{ marginBottom: 16 }}>Trending Now</h2>
        {trendLoading && trending.length === 0 && (
          <div className="loader"><div className="spinner" /></div>
        )}
        <div className="track-list">
          {trending.map((t, i) => (
            <div
              key={`trend_${t.id}_${i}`}
              className="track-row"
              onClick={() => playTrack(t, trending)}
            >
              <span className="track-idx">{i + 1}</span>
              <img
                className="track-cover"
                src={t.cover}
                alt=""
                loading="lazy"
                onError={(e) => { e.target.style.background = '#282828'; e.target.src = ''; }}
              />
              <div className="track-info">
                <span className="track-name">{t.title}</span>
                <span className="track-artist-sub">{t.artist}</span>
              </div>
              <span className="track-album hide-mobile">{t.album}</span>
              <span style={{ fontSize: 11, color: '#b3b3b3', paddingRight: 4 }}>
                {t.popularity ? `🔥 ${t.popularity}` : ''}
              </span>
              <span className="track-dur">
                {t.duration
                  ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`
                  : '--:--'}
              </span>
            </div>
          ))}
        </div>
        {trendLoading && trending.length > 0 && <div className="loader"><div className="spinner" /></div>}
        {!trendLoading && trendOffset < trendTotal && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <button onClick={() => loadTrending(trendOffset)} className="load-more-btn">
              Load more
            </button>
          </div>
        )}
      </section>

      {/* Browse Categories */}
      <h2 className="section-heading" style={{ marginBottom: 16 }}>Browse all</h2>
      <div className="genre-grid">
        {GENRES.map((g) => (
          <div
            key={g.category}
            className="genre-card"
            style={{ background: g.color, overflow: 'hidden', position: 'relative' }}
            onClick={() => onGenreClick(g.category)}
          >
            <span>{g.name}</span>
            {g.image && (
              <img
                src={g.image}
                alt=""
                style={{
                  position: 'absolute', bottom: '-12px', right: '-12px',
                  width: '64px', height: '64px', transform: 'rotate(25deg)',
                  objectFit: 'cover', borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              />
            )}
          </div>
        ))}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="genre-card"
            style={{ background: GENRE_COLORS[cat.id] || '#333', overflow: 'hidden', position: 'relative' }}
            onClick={() => onGenreClick(cat.id)}
          >
            <span>{cat.name}</span>
            {cat.cover && (
              <img
                src={cat.cover}
                alt=""
                style={{
                  position: 'absolute', bottom: '-12px', right: '-12px',
                  width: '64px', height: '64px', transform: 'rotate(25deg)',
                  objectFit: 'cover', borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              />
            )}
          </div>
        ))}
      </div>
      {loadingCat && <div className="loader"><div className="spinner" /></div>}
      {!loadingCat && catOffset < catTotal && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button onClick={() => loadCats(catOffset)} className="load-more-btn">
            Load more categories
          </button>
        </div>
      )}
    </>
  );
}

// ── Top-result hero card ─────────────────────────────────────────────────────
function TopResult({ track, onPlay }) {
  return (
    <div className="search-top-result" onClick={() => onPlay(track)}>
      <img
        src={track.cover}
        alt=""
        className="search-top-cover"
        onError={(e) => { e.target.style.background = '#282828'; e.target.src = ''; }}
      />
      <div className="search-top-info">
        <div className="search-top-title">{track.title}</div>
        <div className="search-top-meta">
          <span className="search-top-badge">Song</span>
          <span style={{ color: '#b3b3b3', fontSize: 13 }}>{track.artist}</span>
        </div>
      </div>
      <button className="search-top-play" onClick={(e) => { e.stopPropagation(); onPlay(track); }}>
        <svg viewBox="0 0 24 24" fill="black" width="22" height="22">
          <path d="M8 5.14v14l11-7-11-7z"/>
        </svg>
      </button>
    </div>
  );
}

// ── Main Search component ────────────────────────────────────────────────────
export default function Search() {
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState([]);
  const [onlineResults, setOnlineResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [onlineOffset, setOnlineOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const timerRef = useRef(null);
  const currentQueryRef = useRef('');
  const { playTrack } = usePlayerStore();

  const resetResults = () => {
    setLocalResults([]);
    setOnlineResults([]);
    setSearched(false);
    setOnlineTotal(0);
    setOnlineOffset(0);
    setError(null);
  };

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      resetResults();
      return;
    }

    setSearched(true);
    setError(null);
    currentQueryRef.current = trimmed;

    // Local catalog search (instant)
    const ql = trimmed.toLowerCase();
    const local = ALL_SONGS.filter(
      (s) =>
        s.title.toLowerCase().includes(ql) ||
        s.artist.toLowerCase().includes(ql) ||
        (s.album || '').toLowerCase().includes(ql),
    );
    setLocalResults(local);

    // Online Spotify search
    setSearching(true);
    setOnlineResults([]);
    setOnlineOffset(0);
    setOnlineTotal(0);

    try {
      const result = await searchTracks(trimmed, 10, 0);
      // Guard against stale responses
      if (currentQueryRef.current !== trimmed) return;
      setOnlineResults(result.tracks || []);
      setOnlineTotal(result.total || 0);
      setOnlineOffset((result.tracks || []).length);
    } catch (e) {
      if (currentQueryRef.current === trimmed) {
        setError('Gagal mengambil hasil dari Spotify. Coba lagi.');
      }
    } finally {
      if (currentQueryRef.current === trimmed) {
        setSearching(false);
      }
    }
  }, []);

  const loadMoreOnline = useCallback(async () => {
    if (loadingMore || !query.trim()) return;
    setLoadingMore(true);
    try {
      const result = await searchTracks(query.trim(), 10, onlineOffset);
      setOnlineResults((prev) => {
        // Dedupe by id
        const existingIds = new Set(prev.map((t) => t.id));
        const fresh = (result.tracks || []).filter((t) => !existingIds.has(t.id));
        return [...prev, ...fresh];
      });
      setOnlineOffset((prev) => prev + (result.tracks || []).length);
    } catch (_) {}
    setLoadingMore(false);
  }, [query, onlineOffset, loadingMore]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) {
      resetResults();
      return;
    }
    timerRef.current = setTimeout(() => doSearch(val), 350);
  };

  const clearSearch = () => {
    setQuery('');
    resetResults();
  };

  // Dedupe online vs local by title+artist (case-insensitive)
  const localKeys = new Set(
    localResults.map((l) => `${l.title.toLowerCase()}|${l.artist.toLowerCase()}`),
  );
  const filteredOnline = onlineResults.filter(
    (o) => !localKeys.has(`${o.title.toLowerCase()}|${o.artist.toLowerCase()}`),
  );

  // Combined for queue context
  const allQueue = [...localResults, ...filteredOnline];
  const topResult = filteredOnline[0] || localResults[0] || null;
  const hasMore = onlineOffset < onlineTotal;

  return (
    <div className="page-search">
      {/* Search bar */}
      <div className="search-bar-wrap">
        <svg className="search-bar-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/>
        </svg>
        <input
          type="text"
          className="search-input-big"
          placeholder="Mau dengerin apa?"
          value={query}
          onChange={handleInput}
          autoFocus
        />
        {query && (
          <button className="search-clear-btn" onClick={clearSearch} aria-label="Clear search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Browse (no query) */}
      {!searched && <BrowseSection onGenreClick={(id) => navigate(`/genre/${id}`)} />}

      {/* Results */}
      {searched && (
        <div className="search-results">

          {/* Error */}
          {error && (
            <div className="search-error">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ flexShrink: 0 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!searching && localResults.length === 0 && onlineResults.length === 0 && !error && (
            <div className="search-empty">
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style={{ color: '#535353' }}>
                <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/>
              </svg>
              <p>Tidak ada hasil untuk <strong>"{query}"</strong></p>
              <p style={{ fontSize: 13, color: '#727272' }}>Coba cari kata kunci lain</p>
            </div>
          )}

          {/* Top result + tracks two-column layout (only if we have Spotify results) */}
          {(localResults.length > 0 || filteredOnline.length > 0) && !searching && topResult && (
            <div className="search-split">
              {/* Left: Top result hero */}
              <div className="search-split-left">
                <h3 className="search-section-label">Hasil Terbaik</h3>
                <TopResult track={topResult} onPlay={(t) => playTrack(t, allQueue)} />
              </div>

              {/* Right: Songs list */}
              <div className="search-split-right">
                <h3 className="search-section-label">Lagu</h3>
                <div className="track-list">
                  {filteredOnline.slice(0, 5).map((t, i) => (
                    <TrackRow key={`online_${t.id}_${i}`} track={t} index={i} queue={allQueue} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Local library matches */}
          {localResults.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3 className="search-section-label">Dari Perpustakaan</h3>
              <div className="track-list">
                {localResults.slice(0, 5).map((t, i) => (
                  <TrackRow key={`local_${t.id}_${i}`} track={t} index={i} queue={allQueue} />
                ))}
              </div>
            </div>
          )}

          {/* All Spotify results */}
          {filteredOnline.length > 5 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className="search-section-label" style={{ margin: 0 }}>
                  Semua Hasil Spotify
                  {onlineTotal > 0 && (
                    <span style={{ fontSize: 12, color: '#727272', fontWeight: 400, marginLeft: 8 }}>
                      ({onlineTotal.toLocaleString()} ditemukan)
                    </span>
                  )}
                </h3>
              </div>
              <div className="track-list">
                {filteredOnline.slice(5).map((t, i) => (
                  <TrackRow key={`more_${t.id}_${i}`} track={t} index={i + 5} queue={allQueue} />
                ))}
              </div>
            </div>
          )}

          {/* Searching spinner */}
          {searching && (
            <div className="search-loading">
              <div className="loader"><div className="spinner" /></div>
              <p style={{ color: '#b3b3b3', fontSize: 13, marginTop: 8 }}>Mencari di Spotify…</p>
            </div>
          )}

          {/* Load more */}
          {!searching && hasMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {loadingMore ? (
                <div className="loader"><div className="spinner" /></div>
              ) : (
                <button onClick={loadMoreOnline} className="load-more-btn">
                  Muat lebih banyak
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
