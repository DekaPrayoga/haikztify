import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAlbumTracks } from '../services/spotifyApi';
import TrackRow from '../components/TrackRow';

export default function Album() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOffset(0);

    const loadAlbumData = async () => {
      const data = await getAlbumTracks(id, 10, 0);
      if (active) {
        setTracks(data.tracks || []);
        setAlbum(data.album);
        setTotal(data.total || 0);
        setLoading(false);
      }
    };
    loadAlbumData();

    return () => { active = false; };
  }, [id]);

  const loadMore = async () => {
    if (loading || tracks.length >= total) return;
    setLoading(true);
    const nextOffset = offset + 10;
    const data = await getAlbumTracks(id, 10, nextOffset);
    setTracks(prev => [...prev, ...(data.tracks || [])]);
    setOffset(nextOffset);
    setLoading(false);
  };

  if (loading && !album) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="page-empty" style={{ padding: 32, textAlign: 'center' }}>
        <h2>Album not found</h2>
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
      <div className="detail-header" style={{ background: 'linear-gradient(to bottom, #3b3b3b, #121212)' }}>
        <img className="detail-cover" src={album.cover} alt={album.title} onError={(e) => { e.target.src = ''; }} />
        <div className="detail-info">
          <span className="detail-type">{album.type || 'Album'}</span>
          <h1 className="detail-name">{album.title}</h1>
          <p className="detail-meta">
            <span 
              className="clickable" 
              style={{ fontWeight: 'bold' }} 
              onClick={() => album.artistId && navigate(`/artist/${album.artistId}`)}
            >
              {album.artist}
            </span>
            &nbsp;• {album.releaseDate?.slice(0, 4) || ''} • {total} songs
          </p>
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
