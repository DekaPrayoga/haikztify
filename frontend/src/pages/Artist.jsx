import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getArtistTopTracks, getArtistAlbums } from '../services/spotifyApi';
import TrackRow from '../components/TrackRow';

function AlbumCard({ item, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <div className="card-img-wrap">
        <img
          src={item.cover}
          alt=""
          loading="lazy"
          onError={(e) => { e.target.style.background = '#282828'; e.target.src = ''; }}
        />
        <div className="card-play-btn">
          <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        </div>
      </div>
      <div className="card-title">{item.title}</div>
      <div className="card-sub">{item.desc || item.type}</div>
    </div>
  );
}

export default function Artist() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [albumsOffset, setAlbumsOffset] = useState(0);
  const [albumsTotal, setAlbumsTotal] = useState(0);
  const [loadingAlbums, setLoadingAlbums] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    
    const loadArtistData = async () => {
      const topData = await getArtistTopTracks(id);
      if (!active) return;
      
      setArtist(topData.artist);
      setTracks(topData.tracks || []);
      
      const albumsData = await getArtistAlbums(id, 8, 0);
      if (!active) return;
      
      setAlbums(albumsData.albums || []);
      setAlbumsTotal(albumsData.total || 0);
      setAlbumsOffset(0);
      
      setLoading(false);
    };
    
    loadArtistData();
    
    return () => { active = false; };
  }, [id]);

  const loadMoreAlbums = async () => {
    if (loadingAlbums || albums.length >= albumsTotal) return;
    setLoadingAlbums(true);
    const nextOffset = albumsOffset + 8;
    const data = await getArtistAlbums(id, 8, nextOffset);
    setAlbums(prev => [...prev, ...(data.albums || [])]);
    setAlbumsOffset(nextOffset);
    setLoadingAlbums(false);
  };

  if (loading && !artist) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="page-empty" style={{ padding: 32, textAlign: 'center' }}>
        <h2>Artist not found</h2>
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
      <div className="detail-header" style={{ background: 'linear-gradient(to bottom, #454545, #121212)' }}>
        {artist.cover ? (
          <img 
            className="detail-cover" 
            src={artist.cover} 
            alt={artist.name} 
            style={{ borderRadius: '50%', objectFit: 'cover' }} 
          />
        ) : (
          <div className="detail-cover" style={{ background: '#282828', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="#b3b3b3" width="64" height="64"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
        )}
        <div className="detail-info">
          <span className="detail-type">Artist</span>
          <h1 className="detail-name">{artist.name}</h1>
          <p className="detail-meta">
            {artist.followers?.toLocaleString()} followers
            {artist.genres?.length > 0 && ` • ${artist.genres.slice(0, 3).join(', ')}`}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Popular Tracks</h2>
        <div className="track-list">
          {tracks.slice(0, 5).map((t, idx) => (
            <TrackRow 
              key={t.id} 
              track={t} 
              index={idx} 
              queue={tracks.slice(0, 5)} 
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Albums & Singles</h2>
        <div className="card-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              item={album}
              onClick={() => navigate(`/album/${album.spotifyId}`)}
            />
          ))}
        </div>
        {albums.length < albumsTotal && (
          <button 
            className="load-more-btn" 
            onClick={loadMoreAlbums} 
            disabled={loadingAlbums}
            style={{ marginTop: 24 }}
          >
            {loadingAlbums ? 'Loading...' : 'Show more albums'}
          </button>
        )}
      </div>
    </div>
  );
}
