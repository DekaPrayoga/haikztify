import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSpotifyPlaylist, getSpotifyPlaylistTracks } from '../services/spotifyApi';
import TrackRow from '../components/TrackRow';

export default function SpotifyPlaylist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOffset(0);

    const loadPlaylistData = async () => {
      const meta = await getSpotifyPlaylist(id);
      if (!active) return;
      setPlaylist(meta);

      if (meta) {
        const tracksData = await getSpotifyPlaylistTracks(id, 10, 0);
        if (active) {
          setTracks(tracksData.tracks || []);
          setTotal(tracksData.total || meta.tracks || 0);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    loadPlaylistData();

    return () => { active = false; };
  }, [id]);

  const loadMore = async () => {
    if (loading || tracks.length >= total) return;
    setLoading(true);
    const nextOffset = offset + 10;
    const data = await getSpotifyPlaylistTracks(id, 10, nextOffset);
    setTracks(prev => [...prev, ...(data.tracks || [])]);
    setOffset(nextOffset);
    setLoading(false);
  };

  if (loading && !playlist) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="page-empty" style={{ padding: 32, textAlign: 'center' }}>
        <h2>Playlist not found</h2>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            marginTop: 16, 
            background: '#1db954', 
            color: 'white', 
            border: 'none', 
            borderRadius: '20px', 
            padding: '8px 16px', 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="page-genre">
      <div className="detail-header" style={{ background: 'linear-gradient(to bottom, #1e3c72, #121212)' }}>
        {playlist.cover ? (
          <img className="detail-cover" src={playlist.cover} alt={playlist.title} onError={(e) => { e.target.src = ''; }} />
        ) : (
          <div className="detail-cover custom-playlist-cover" style={{ background: '#282828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="#b3b3b3" width="64" height="64"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>
        )}
        <div className="detail-info">
          <span className="detail-type">Spotify Playlist</span>
          <h1 className="detail-name">{playlist.title}</h1>
          <p className="detail-meta" dangerouslySetInnerHTML={{ __html: playlist.desc }}></p>
          <p className="detail-meta" style={{ marginTop: 8 }}>{total} songs</p>
        </div>
      </div>

      <div className="track-list" style={{ marginTop: 24 }}>
        {tracks.map((t, idx) => (
          <TrackRow 
            key={t.id} 
            track={t} 
            index={idx} 
            queue={tracks} 
          />
        ))}
      </div>

      {tracks.length < total && (
        <button className="load-more-btn" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
