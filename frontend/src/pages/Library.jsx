import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/playerStore';

export default function Library() {
  const navigate = useNavigate();
  const playlists = usePlayerStore(s => s.playlists);
  const likedIds = usePlayerStore(s => s.likedIds);

  return (
    <div>
      <h2 className="greeting" style={{ marginBottom: 24 }}>Your Library</h2>

      <div
        className="lib-item"
        onClick={() => navigate('/liked')}
        style={{ padding: 12, marginBottom: 8 }}
      >
        <div className="lib-cover liked-cover">♥</div>
        <div>
          <div className="lib-name">Liked Songs</div>
          <div className="lib-meta">Playlist · {likedIds.size} songs</div>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="page-empty">Belum ada playlist. Tambahkan dari sidebar (desktop) atau dari halaman lagu.</div>
      ) : (
        playlists.map(pl => (
          <div
            key={pl.id}
            className="lib-item"
            onClick={() => navigate(`/playlist/${pl.id}`)}
            style={{ padding: 12, marginBottom: 8 }}
          >
            <div className="lib-cover custom-playlist-cover">{pl.name[0]?.toUpperCase() || 'P'}</div>
            <div>
              <div className="lib-name">{pl.name}</div>
              <div className="lib-meta">Playlist · {pl.tracks.length} songs</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
