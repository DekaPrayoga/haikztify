// API_BASE reads from Vite environment variable
// Set VITE_API_URL in .env (local) or Vercel env vars (production)
const API_BASE = import.meta.env.VITE_API_URL
  || (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001');

export { API_BASE };

function mapTrack(r) {
  return {
    id: `spotify_${r.id}`,
    spotifyId: r.id,
    title: r.title,
    artist: r.artist,
    album: r.album,
    albumId: r.albumId || '',
    cover: r.cover,
    src: r.src ? `${API_BASE}/api/proxy?url=${encodeURIComponent(r.src)}` : null,
    duration: r.duration,
    popularity: r.popularity || 0,
    artistId: r.artistId || '',
    spotifyUrl: r.spotifyUrl || '',
  };
}

// Search with pagination
export async function searchTracks(query, limit = 10, offset = 0) {
  if (!query || query.length < 2) return { tracks: [], total: 0 };
  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return { tracks: data.map(mapTrack), total: data.length };
    }
    return {
      tracks: (data.tracks || []).map(mapTrack),
      total: data.total || 0,
    };
  } catch (err) {
    console.error('Search error:', err);
    return { tracks: [], total: 0 };
  }
}

// New Releases albums
export async function getNewReleases(limit = 10, offset = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/new-releases?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return {
      albums: (data.albums || []).map(a => ({
        id: `album_${a.id}`,
        spotifyId: a.id,
        title: a.title,
        artist: a.artist,
        cover: a.cover,
        desc: a.artist,
        type: a.type,
        artistId: a.artistId || '',
      })),
      total: data.total || 0,
    };
  } catch (err) {
    console.error('New releases error:', err);
    return { albums: [], total: 0 };
  }
}

// Featured Playlists
export async function getFeaturedPlaylists(limit = 10, offset = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/featured-playlists?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return {
      playlists: data.playlists || [],
      total: data.total || 0,
      message: data.message || '',
    };
  } catch (err) {
    console.error('Featured playlists error:', err);
    return { playlists: [], total: 0 };
  }
}

// Trending tracks
export async function getTrending(limit = 10, offset = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/trending?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return {
      tracks: (data.tracks || []).map(mapTrack),
      total: data.total || 0,
    };
  } catch (err) {
    console.error('Trending error:', err);
    return { tracks: [], total: 0 };
  }
}

// Browse categories
export async function getCategories(limit = 10, offset = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/categories?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return { categories: data.categories || [], total: data.total || 0 };
  } catch (err) {
    console.error('Categories error:', err);
    return { categories: [], total: 0 };
  }
}

// Recommendations
export async function getRecommendations({ seedTracks = [], seedArtists = [], seedGenres = ['pop'], limit = 10 } = {}) {
  try {
    const params = new URLSearchParams({ limit });
    if (seedTracks.length) params.set('seed_tracks', seedTracks.slice(0, 5).join(','));
    if (seedArtists.length) params.set('seed_artists', seedArtists.slice(0, 5).join(','));
    if (seedGenres.length) params.set('seed_genres', seedGenres.slice(0, 5).join(','));
    const res = await fetch(`${API_BASE}/api/recommendations?${params}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(mapTrack);
  } catch (err) {
    console.error('Recommendations error:', err);
    return [];
  }
}

// Album tracks
export async function getAlbumTracks(albumId, limit = 10, offset = 0) {
  try {
    const cleanId = albumId.replace('album_', '');
    const res = await fetch(`${API_BASE}/api/albums/${cleanId}/tracks?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return {
      tracks: (data.tracks || []).map(t => mapTrack(t)),
      total: data.total || 0,
      album: data.album || null,
    };
  } catch (err) {
    console.error('Album tracks error:', err);
    return { tracks: [], total: 0, album: null };
  }
}

// Artist top tracks
export async function getArtistTopTracks(artistId) {
  try {
    const res = await fetch(`${API_BASE}/api/artists/${artistId}/top-tracks`);
    const data = await res.json();
    return {
      tracks: (data.tracks || []).map(mapTrack),
      artist: data.artist || null,
    };
  } catch (err) {
    console.error('Artist top tracks error:', err);
    return { tracks: [], artist: null };
  }
}

// Artist albums
export async function getArtistAlbums(artistId, limit = 10, offset = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/artists/${artistId}/albums?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return {
      albums: (data.albums || []).map(a => ({
        id: `album_${a.id}`,
        spotifyId: a.id,
        title: a.title,
        artist: a.artist,
        cover: a.cover,
        desc: a.releaseDate?.slice(0, 4) || a.artist,
        type: a.type,
        artistId: a.artistId || '',
      })),
      total: data.total || 0,
    };
  } catch (err) {
    console.error('Artist albums error:', err);
    return { albums: [], total: 0 };
  }
}

// Spotify playlist tracks
export async function getSpotifyPlaylistTracks(playlistId, limit = 10, offset = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/spotify-playlist/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return {
      tracks: (data.tracks || []).map(mapTrack),
      total: data.total || 0,
    };
  } catch (err) {
    console.error('Playlist tracks error:', err);
    return { tracks: [], total: 0 };
  }
}

// Spotify playlist metadata info
export async function getSpotifyPlaylist(playlistId) {
  try {
    const res = await fetch(`${API_BASE}/api/spotify-playlist/${playlistId}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Get Spotify playlist error:', err);
    return null;
  }
}
