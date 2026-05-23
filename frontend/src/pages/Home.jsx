import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_SONGS } from '../data/catalog';
import { API_BASE } from '../services/spotifyApi';
import usePlayerStore from '../store/playerStore';

function ArtCard({ item, onClick, badge }) {
  return (
    <div className="card" onClick={onClick}>
      <div className="card-img-wrap">
        <img src={item.cover} alt="" loading="lazy"
          onError={(e) => { e.target.style.background = '#282828'; e.target.src = ''; }} />
        {badge && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10,
            fontWeight: 800, letterSpacing: 1, padding: '3px 8px',
            borderRadius: 4, textTransform: 'uppercase',
          }}>{badge}</span>
        )}
        <div className="card-play-btn">
          <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        </div>
      </div>
      <div className="card-title">{item.title}</div>
      <div className="card-sub">{item.subtitle || ''}</div>
    </div>
  );
}

function CardSection({ title, items, loading, onCardClick, badge, keyPrefix }) {
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
              <ArtCard key={`${keyPrefix}_${item.id || i}`} item={item} badge={badge}
                onClick={() => onCardClick && onCardClick(item)} />
            ))}
          </div>
        )
      }
    </section>
  );
}

function TrackSection({ title, tracks, loading, onTrackClick, pageSize = 20, replaceMode = false }) {
  const [page, setPage] = useState(0); // for replace mode
  const [visible, setVisible] = useState(pageSize); // for append mode
  if (!loading && tracks.length === 0) return null;
  const shown = replaceMode
    ? tracks.slice(page * pageSize, (page + 1) * pageSize)
    : tracks.slice(0, visible);
  const hasMore = replaceMode
    ? (page + 1) * pageSize < tracks.length
    : tracks.length > visible;
  const handleMore = () => {
    if (replaceMode) setPage(p => p + 1);
    else setVisible(v => v + pageSize);
  };
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
              {shown.map((t, i) => (
                <div key={`${t.id}_${i}`} className="track-row" onClick={() => onTrackClick(t, shown)}>
                  <span className="track-idx">{i + 1 + (replaceMode ? page * pageSize : 0)}</span>
                  <img className="track-cover" src={t.cover} alt="" loading="lazy"
                    onError={(e) => { e.target.src = ''; e.target.style.background = '#282828'; }} />
                  <div className="track-info">
                    <span className="track-name">{t.title}</span>
                    <span className="track-artist-sub">{t.artist}</span>
                  </div>
                  <span className="track-album hide-mobile">{t.album}</span>
                  <span className="track-dur">
                    {t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}` : '--:--'}
                  </span>
                </div>
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <button onClick={handleMore} className="load-more-btn">Load more</button>
              </div>
            )}
          </>
        )
      }
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = feed?.profile?.name;
  const greeting = name ? `${greet}, ${name}` : greet;
  const quickPicks = ALL_SONGS.slice(0, 8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/feed/home`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) { setLoading(false); return; }
        const wrapTracks = (arr) => (arr || []).map(t => ({
          ...t,
          id: `spotify_${t.id}`,
          spotifyId: t.id,
          src: t.src ? `${API_BASE}/api/proxy?url=${encodeURIComponent(t.src)}` : null,
        }));
        setFeed({
          profile: data.profile,
          startListening: wrapTracks(data.sections?.startListening),
          mixes: data.sections?.mixes || [],
          radios: data.sections?.radios || [],
          genreSections: (data.sections?.genreSections || []).map(s => ({
            ...s,
            tracks: wrapTracks(s.tracks),
          })),
        });
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const startListening = feed?.startListening || [];
  const mixes = feed?.mixes || [];
  const radios = feed?.radios || [];
  const genreSections = feed?.genreSections || [];

  // Build the "Untukmu" mixed pool: dedupe + shuffle once across all genre tracks
  const [shuffledPool, setShuffledPool] = useState([]);
  useEffect(() => {
    if (genreSections.length === 0) return;
    const seen = new Set();
    const flat = [];
    for (const s of genreSections) {
      for (const t of s.tracks) {
        if (!seen.has(t.id)) { seen.add(t.id); flat.push(t); }
      }
    }
    // Fisher-Yates shuffle (stable per page load)
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    setShuffledPool(flat);
  }, [genreSections]);

  return (
    <div className="page-home">
      <h2 className="section-heading greeting">{greeting}</h2>
      <p style={{ color: '#b3b3b3', fontSize: 14, marginTop: -12, marginBottom: 24 }}>
        Nikmati sesi berdasarkan seleramu
      </p>

      {/* Quick Picks — local catalog shortcuts */}
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

      <TrackSection title="Mulai mendengarkan"
        tracks={startListening} loading={loading} onTrackClick={playTrack} />

      <TrackSection title="Untukmu"
        tracks={shuffledPool} loading={loading} onTrackClick={playTrack}
        pageSize={50} replaceMode={true} />

      <CardSection title="Untuk membantu kamu mulai mendengarkan"
        items={mixes} loading={loading}
        onCardClick={(item) => navigate(`/artist/${item.artistId}`)}
        keyPrefix="mix" />

      <CardSection title="Stasiun Radio yang Direkomendasikan"
        items={radios} loading={loading} badge="Radio"
        onCardClick={(item) => navigate(`/artist/${item.artistId}`)}
        keyPrefix="radio" />

      {genreSections.map((g) => (
        <TrackSection key={g.id} title={g.title}
          tracks={g.tracks} loading={loading} onTrackClick={playTrack} />
      ))}
    </div>
  );
}
