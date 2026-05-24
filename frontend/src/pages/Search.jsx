import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES, ALL_SONGS } from '../data/catalog';
import { searchTracks, getTrending, getCategories, getRecommendations } from '../services/spotifyApi';
import TrackRow from '../components/TrackRow';
import usePlayerStore from '../store/playerStore';

// Trending browse section when no query
function BrowseSection({ onGenreClick }) {
  const [categories, setCategories] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [catOffset, setCatOffset] = useState(0);
  const [catTotal, setCatTotal] = useState(0);
  const [trending, setTrending] = useState([]);
  const [trendOffset, setTrendOffset] = useState(0);
  const [trendTotal, setTrendTotal] = useState(0);
  const [trendLoading, setTrendLoading] = useState(false);
  const playTrack = usePlayerStore(s => s.playTrack);
  const mountedRef = useRef(false);
  const catLoadingRef = useRef(false);
  const trendLoadingRef = useRef(false);

  const loadCats = async (off) => {
    if (catLoadingRef.current) return;
    catLoadingRef.current = true;
    setLoadingCat(true);
    try {
      const result = await getCategories(10, off);
      setCategories(prev => off === 0 ? result.categories : [...prev, ...result.categories]);
      setCatTotal(result.total || 0);
      setCatOffset(off + result.categories.length);
    } catch (e) {}
    catLoadingRef.current = false;
    setLoadingCat(false);
  };

  const loadTrending = async (off) => {
    if (trendLoadingRef.current) return;
    trendLoadingRef.current = true;
    setTrendLoading(true);
    try {
      const result = await getTrending(10, off);
      setTrending(prev => off === 0 ? result.tracks : [...prev, ...result.tracks]);
      setTrendTotal(result.total || 0);
      setTrendOffset(off + result.tracks.length);
    } catch (e) {}
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
    kpop: '#E13300', metal: '#000000', punk: '#504F4F', folk: '#477D95',
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
              key={`t_${t.id}_${i}`}
              className="track-row"
              onClick={() => playTrack(t, trending)}
            >
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
                {t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : '--:--'}
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
        {GENRES.map(g => (
          <div
            key={g.category}
            className="genre-card"
            style={{ background: g.color, overflow: 'hidden', position: 'relative' }}
            onClick={() => onGenreClick(g.category)}
          >
            <span>{g.name}</span>
            {g.image && (
              <img
                src={g.image} alt=""
                style={{
                  position: 'absolute', bottom: '-12px', right: '-12px',
                  width: '64px', height: '64px', transform: 'rotate(25deg)',
                  objectFit: 'cover', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}
              />
            )}
          </div>
        ))}
        {categories.map(cat => (
          <div
            key={cat.id}
            className="genre-card"
            style={{
              background: GENRE_COLORS[cat.id] || '#333',
              overflow: 'hidden', position: 'relative'
            }}
            onClick={() => onGenreClick(cat.id)}
          >
            <span>{cat.name}</span>
            {cat.cover && (
              <img
                src={cat.cover} alt=""
                style={{
                  position: 'absolute', bottom: '-12px', right: '-12px',
                  width: '64px', height: '64px', transform: 'rotate(25deg)',
                  objectFit: 'cover', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
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

export default function Search() {
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState([]);
  const [onlineResults, setOnlineResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [onlineOffset, setOnlineOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();
  const currentQuery = useRef('');

  const doOnlineSearch = useCallback(async (q) => {
    if (!q || q.length < 2) return;
    currentQuery.current = q;
    setSearching(true);
    setOnlineResults([]);
    setOnlineOffset(0);
    try {
      const result = await searchTracks(q, 10, 0);
      if (currentQuery.current !== q) return;
      setOnlineResults(result.tracks);
      setOnlineTotal(result.total);
      setOnlineOffset(result.tracks.length);
    } catch (_) {
    } finally {
      if (currentQuery.current === q) setSearching(false);
    }
  }, []);

  const loadMoreOnline = useCallback(async () => {
    if (loadingMore || !query) return;
    setLoadingMore(true);
    try {
      const result = await searchTracks(query, 10, onlineOffset);
      setOnlineResults(prev => [...prev, ...result.tracks]);
      setOnlineOffset(prev => prev + result.tracks.length);
    } catch (e) {
      console.warn('loadMoreOnline failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [query, onlineOffset, loadingMore]);

  // Typing → local catalog search only (instant, no API call)
  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val || val.length < 2) {
      setLocalResults([]);
      setOnlineResults([]);
      setSearched(false);
      setOnlineTotal(0);
      setOnlineOffset(0);
      return;
    }
    setSearched(true);
    const ql = val.toLowerCase();
    setLocalResults(ALL_SONGS.filter(s =>
      s.title.toLowerCase().includes(ql) ||
      s.artist.toLowerCase().includes(ql) ||
      (s.album || '').toLowerCase().includes(ql)
    ));
  };

  // Enter → hit the API
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      doOnlineSearch(query.trim());
    }
  };

  const allResults = [
    ...localResults,
    ...onlineResults.filter(o => !localResults.some(l => l.title === o.title && l.artist === o.artist))
  ];

  const hasMore = onlineOffset < onlineTotal;

  return (
    <div className="page-search">
      <div className="search-bar-wrap">
        <svg className="search-bar-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/>
        </svg>
        <input
          type="text"
          className="search-input-big"
          placeholder="Ketik lagu / artis, tekan Enter untuk cari..."
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {query && (
          <button
            className="search-clear-btn"
            onClick={() => {
              setQuery('');
              setLocalResults([]);
              setOnlineResults([]);
              setSearched(false);
              setOnlineTotal(0);
              setOnlineOffset(0);
              currentQuery.current = '';
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
            </svg>
          </button>
        )}
      </div>

      {!searched ? (
        <BrowseSection onGenreClick={(id) => navigate(`/genre/${id}`)} />
      ) : (
        <div className="search-results">
          {/* Local library results */}
          {localResults.length > 0 && (
            <>
              <h3 className="search-section-label">From Library</h3>
              <div className="track-list">
                {localResults.slice(0, 5).map((t, i) => (
                  <TrackRow key={t.id} track={t} index={i} queue={localResults} />
                ))}
              </div>
            </>
          )}

          {/* Online results */}
          <h3 className="search-section-label">
            {searching
              ? 'Searching Spotify...'
              : onlineTotal > 0
                ? `Spotify Results (${onlineTotal.toLocaleString()} found)`
                : 'Spotify Results'}
          </h3>

          {searching && <div className="loader"><div className="spinner" /></div>}

          {!searching && allResults.length > 0 && (
            <div className="track-list">
              {onlineResults
                .filter(o => !localResults.some(l => l.title === o.title && l.artist === o.artist))
                .map((t, i) => (
                  <TrackRow key={t.id} track={t} index={i} queue={onlineResults} />
                ))}
            </div>
          )}

          {/* Load more */}
          {!searching && hasMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {loadingMore
                ? <div className="loader"><div className="spinner" /></div>
                : (
                  <button onClick={loadMoreOnline} className="load-more-btn">
                    Load more results
                  </button>
                )
              }
            </div>
          )}

          {!searching && searched && localResults.length === 0 && onlineResults.length === 0 && (
            <p className="no-results">No results found for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
