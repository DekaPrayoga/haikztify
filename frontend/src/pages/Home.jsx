import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_SONGS } from '../data/catalog';
import {
  getTrending,
  getFeedRecentlyPlayed,
  getFeedTopTracks,
  getFeedRecommendations,
  getFeedPlaylists,
  getFeedMe,
} from '../services/spotifyApi';
import usePlayerStore from '../store/playerStore';

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

function CardSection({ title, items, loading, onCardClick, keyPrefix }) {
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
          </div>
        )
      }
    </section>
  );
}

function TrackSection({ title, tracks, loading, onTrackClick }) {
  if (!loading && tracks.length === 0) return null;
  return (
    <section className="home-section">
      <div className="section-heading-wrap">
        <h2 className="section-heading">{title}</h2>
      </div>
      {loading && tracks.length === 0
        ? <div className="loader"><div className="spinner" /></div>
        : (
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
                <span className="track-dur">
                  {t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}` : '--:--'}
                </span>
              </div>
            ))}
          </div>
        )
      }
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();
  const [me, setMe] = useState(null);
  const [recent, setRecent] = useState([]);
  const [top, setTop] = useState([]);
  const [recs, setRecs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = me?.name ? `${greet}, ${me.name.split(' ')[0]}` : greet;
  const quickPicks = ALL_SONGS.slice(0, 8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getFeedMe(),
      getFeedRecentlyPlayed(20),
      getFeedTopTracks(10, 'short_term'),
      getFeedRecommendations(20),
      getFeedPlaylists(20),
      getTrending(10, 0),
    ]).then(([m, r, t, rec, pl, tr]) => {
      if (cancelled) return;
      setMe(m);
      setRecent(r);
      setTop(t);
      setRecs(rec);
      setPlaylists(pl);
      setTrending(tr.tracks || []);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

      <TrackSection title="Recently played"
        tracks={recent} loading={loading} onTrackClick={playTrack} />

      <TrackSection title="Your top tracks"
        tracks={top} loading={loading} onTrackClick={playTrack} />

      <CardSection title="Made for you"
        items={recs.map(t => ({ ...t, desc: t.artist }))}
        loading={loading}
        onCardClick={(item) => playTrack(item, recs)}
        keyPrefix="rec" />

      <CardSection title="Your playlists"
        items={playlists} loading={loading}
        onCardClick={(item) => navigate(`/spotify-playlist/${item.id}`)}
        keyPrefix="ownpl" />

      <TrackSection title="Trending now"
        tracks={trending} loading={loading} onTrackClick={playTrack} />
    </div>
  );
}
