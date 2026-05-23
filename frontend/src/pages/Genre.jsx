import { useParams } from 'react-router-dom';
import { MUSIC_CATALOG, GENRES, ALL_SONGS } from '../data/catalog';
import TrackRow from '../components/TrackRow';
import usePlayerStore from '../store/playerStore';

export default function Genre() {
  const { id } = useParams();
  const songs = MUSIC_CATALOG[id] || [];
  const genre = GENRES.find(g => g.category === id);
  const playTrack = usePlayerStore(s => s.playTrack);

  if (!genre) return <div className="page-empty">Genre not found</div>;

  return (
    <div className="page-genre">
      <div className="detail-header" style={{ background: `linear-gradient(to bottom, ${genre.color}, #121212)` }}>
        {genre.image ? (
          <img className="detail-cover" src={genre.image} alt="" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="detail-cover" style={{ background: genre.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 900 }}>
            {genre.name.charAt(0)}
          </div>
        )}
        <div className="detail-info">
          <span className="detail-type">Playlist</span>
          <h1 className="detail-name">{genre.name} Mix</h1>
          <p className="detail-meta">{songs.length} songs</p>
        </div>
      </div>
      <div className="detail-actions">
        <button className="big-play-btn" onClick={() => songs.length && playTrack(songs[0], songs)}>
          <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        </button>
      </div>
      <div className="track-list">
        {songs.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={songs} />)}
      </div>
    </div>
  );
}

export function LikedSongs() {
  const { likedIds } = usePlayerStore();
  const playTrack = usePlayerStore(s => s.playTrack);
  const songs = ALL_SONGS.filter(s => likedIds.has(s.id));

  return (
    <div className="page-genre">
      <div className="detail-header" style={{ background: 'linear-gradient(to bottom, #5038a0, #121212)' }}>
        <div className="detail-cover liked-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" fill="white" width="48" height="48"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
        <div className="detail-info">
          <span className="detail-type">Playlist</span>
          <h1 className="detail-name">Liked Songs</h1>
          <p className="detail-meta">{songs.length} songs</p>
        </div>
      </div>
      <div className="detail-actions">
        <button className="big-play-btn" onClick={() => songs.length && playTrack(songs[0], songs)}>
          <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        </button>
      </div>
      {songs.length === 0 ? (
        <p className="no-results" style={{ padding: 32 }}>No liked songs yet. Click the heart icon on any track!</p>
      ) : (
        <div className="track-list">
          {songs.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={songs} />)}
        </div>
      )}
    </div>
  );
}
