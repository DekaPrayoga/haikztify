import { useNavigate } from 'react-router-dom';
import usePlayerStore from '../store/playerStore';

export default function Library() {
  const navigate = useNavigate();
  const playlists = usePlayerStore(s => s.playlists);
  const likedIds = usePlayerStore(s => s.likedIds);
  const createPlaylist = usePlayerStore(s => s.createPlaylist);

  const handleCreate = () => {
    const name = window.prompt('Nama playlist:');
    if (!name || !name.trim()) return;
    const pl = createPlaylist(name.trim());
    navigate(`/playlist/${pl.id}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="greeting" style={{ margin: 0 }}>Your Library</h2>
        <button
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1db954', color: '#000', border: 'none',
            borderRadius: '500px', padding: '10px 20px',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'transform 0.1s, background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1ed760'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1db954'; }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Create playlist
        </button>
      </div>

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
        <div className="page-empty">
          Belum ada playlist custom. Klik <strong>Create playlist</strong> di atas.
        </div>
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
