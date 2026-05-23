import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promisify } from 'util';

const app = express();

// CORS: allow frontend origin from env (for Vercel split deploy)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /\.vercel\.app$/, /\.haikz\.me$/, 'https://haikz.me',
  ],
  credentials: true,
}));

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';

let token = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiresAt - 60000) return token;
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = await res.json();
  token = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return token;
}

async function spotifyGet(path) {
  const accessToken = await getToken();
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!text || text.trim() === '') return null;
  try {
    const data = JSON.parse(text);
    if (!res.ok) { console.error('Spotify error:', res.status, JSON.stringify(data).slice(0, 200)); return null; }
    return data;
  } catch (e) {
    console.error('JSON parse error for', path, text.slice(0, 100));
    return null;
  }
}

function mapTrack(track) {
  if (!track || !track.id) return null;
  return {
    id: track.id,
    title: track.name,
    artist: (track.artists || []).map(a => a.name).join(', '),
    album: track.album?.name || '',
    albumId: track.album?.id || '',
    cover: track.album?.images?.[0]?.url || track.images?.[0]?.url || '',
    src: track.preview_url || null,
    duration: Math.round((track.duration_ms || 0) / 1000),
    popularity: track.popularity || 0,
    artistId: track.artists?.[0]?.id || '',
    spotifyUrl: track.external_urls?.spotify || '',
  };
}

function mapAlbum(album) {
  if (!album || !album.id) return null;
  return {
    id: album.id,
    title: album.name,
    artist: (album.artists || []).map(a => a.name).join(', '),
    cover: album.images?.[0]?.url || '',
    type: album.album_type || 'album',
    releaseDate: album.release_date || '',
    totalTracks: album.total_tracks || 0,
    artistId: album.artists?.[0]?.id || '',
  };
}

// ── SEARCH (tracks) ──────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 10, 10);
  if (!q) return res.json({ tracks: [], total: 0 });
  try {
    const data = await spotifyGet(`/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}&offset=${offset}`);
    if (!data) return res.json({ tracks: [], total: 0 });
    const tracks = (data.tracks?.items || []).map(mapTrack).filter(Boolean);
    res.json({ tracks, total: data.tracks?.total || 0 });
  } catch (e) {
    console.error('Search error:', e.message);
    res.json({ tracks: [], total: 0 });
  }
});

// ── NEW RELEASES via search albums ───────────────────────────────────────────
app.get('/api/new-releases', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 10, 10);
  const queries = ['tag:new', 'year:2025', 'year:2024'];
  const q = queries[Math.floor(offset / 10) % queries.length];
  try {
    const data = await spotifyGet(`/search?q=${encodeURIComponent(q)}&type=album&limit=${limit}&offset=${offset % 10}`);
    if (!data) return res.json({ albums: [], total: 0 });
    const albums = (data.albums?.items || []).map(mapAlbum).filter(Boolean);
    res.json({ albums, total: data.albums?.total || 0 });
  } catch (e) {
    console.error('New releases error:', e.message);
    res.json({ albums: [], total: 0 });
  }
});

// ── FEATURED PLAYLISTS via search artists ──────────────────────────────────
app.get('/api/featured-playlists', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 10, 10);
  const popularArtists = [
    'Taylor Swift','Drake','The Weeknd','Billie Eilish','Ed Sheeran',
    'Ariana Grande','Post Malone','Bad Bunny','Dua Lipa','Harry Styles',
    'Olivia Rodrigo','Justin Bieber','Doja Cat','Kendrick Lamar','SZA',
    'Bruno Mars','Coldplay','Rihanna','Adele','Eminem',
  ];
  try {
    const artist = popularArtists[(offset) % popularArtists.length];
    const data = await spotifyGet(`/search?q=${encodeURIComponent(artist)}&type=artist&limit=${limit}`);
    if (!data) return res.json({ playlists: [], total: 0 });
    const playlists = (data.artists?.items || []).filter(Boolean).map(a => ({
      id: a.id,
      title: a.name,
      desc: `${(a.followers?.total || 0).toLocaleString()} followers`,
      cover: a.images?.[0]?.url || '',
      type: 'artist',
    }));
    res.json({ playlists, total: popularArtists.length * 5 });
  } catch (e) {
    console.error('Featured error:', e.message);
    res.json({ playlists: [], total: 0 });
  }
});

// ── TRENDING via search popular tracks ───────────────────────────────────────
const TRENDING_QUERIES = [
  'genre:pop year:2025', 'genre:hip-hop year:2025', 'genre:pop year:2024',
  'genre:r&b year:2025', 'genre:latin year:2025', 'genre:pop year:2024 hits',
];
app.get('/api/trending', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 10, 10);
  const q = TRENDING_QUERIES[Math.floor(offset / 10) % TRENDING_QUERIES.length];
  try {
    const data = await spotifyGet(`/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}&offset=${offset % 50}`);
    if (!data) return res.json({ tracks: [], total: 0 });
    const tracks = (data.tracks?.items || []).map(mapTrack).filter(Boolean);
    res.json({ tracks, total: data.tracks?.total || 0 });
  } catch (e) {
    console.error('Trending error:', e.message);
    res.json({ tracks: [], total: 0 });
  }
});

// ── RECOMMENDATIONS via genre search ─────────────────────────────────────────
app.get('/api/recommendations', async (req, res) => {
  const { seed_genres, seed_tracks, limit: lim } = req.query;
  const limit = Math.min(parseInt(lim) || 10, 10);
  const genre = seed_genres?.split(',')?.[0] || 'pop';
  const q = `genre:${genre}`;
  try {
    const randOffset = Math.floor(Math.random() * 50);
    const data = await spotifyGet(`/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}&offset=${randOffset}`);
    if (!data) return res.json([]);
    const tracks = (data.tracks?.items || []).map(mapTrack).filter(Boolean);
    res.json(tracks);
  } catch (e) {
    console.error('Recommendations error:', e.message);
    res.json([]);
  }
});

// ── CATEGORIES (static) ───────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'pop', name: 'Pop', cover: '' },
  { id: 'hiphop', name: 'Hip-Hop', cover: '' },
  { id: 'rock', name: 'Rock', cover: '' },
  { id: 'electronic', name: 'Electronic', cover: '' },
  { id: 'rnb', name: 'R&B', cover: '' },
  { id: 'latin', name: 'Latin', cover: '' },
  { id: 'indie', name: 'Indie', cover: '' },
  { id: 'jazz', name: 'Jazz', cover: '' },
  { id: 'classical', name: 'Classical', cover: '' },
  { id: 'kpop', name: 'K-Pop', cover: '' },
  { id: 'metal', name: 'Metal', cover: '' },
  { id: 'country', name: 'Country', cover: '' },
  { id: 'soul', name: 'Soul', cover: '' },
  { id: 'reggae', name: 'Reggae', cover: '' },
  { id: 'folk', name: 'Folk', cover: '' },
  { id: 'blues', name: 'Blues', cover: '' },
  { id: 'alternative', name: 'Alternative', cover: '' },
  { id: 'dancehall', name: 'Dancehall', cover: '' },
  { id: 'workout', name: 'Workout', cover: '' },
  { id: 'chill', name: 'Chill', cover: '' },
];
app.get('/api/categories', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  const slice = CATEGORIES.slice(offset, offset + limit);
  res.json({ categories: slice, total: CATEGORIES.length });
});

// ── ALBUM TRACKS ─────────────────────────────────────────────────────────────
app.get('/api/albums/:id/tracks', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const [albumData, tracksData] = await Promise.all([
      spotifyGet(`/albums/${req.params.id}`),
      spotifyGet(`/albums/${req.params.id}/tracks?limit=${limit}&offset=${offset}`),
    ]);
    if (!albumData || !tracksData) return res.json({ tracks: [], total: 0, album: null });
    const tracks = (tracksData.items || []).map(track => ({
      id: track.id,
      title: track.name,
      artist: (track.artists || []).map(a => a.name).join(', '),
      album: albumData.name,
      albumId: albumData.id,
      cover: albumData.images?.[0]?.url || '',
      src: track.preview_url || null,
      duration: Math.round((track.duration_ms || 0) / 1000),
      artistId: track.artists?.[0]?.id || '',
    })).filter(t => t.id);
    res.json({ tracks, total: tracksData.total || 0, album: mapAlbum(albumData) });
  } catch (e) {
    console.error('Album tracks error:', e.message);
    res.json({ tracks: [], total: 0, album: null });
  }
});

// ── ARTIST INFO + TOP TRACKS ────────────────────────────────────────────────
app.get('/api/artists/:id/top-tracks', async (req, res) => {
  try {
    const artistData = await spotifyGet(`/artists/${req.params.id}`);
    if (!artistData) return res.json({ tracks: [], artist: null });
    const tracksData = await spotifyGet(`/search?q=artist:${encodeURIComponent(artistData.name)}&type=track&limit=10&offset=0`);
    const tracks = (tracksData?.tracks?.items || []).map(mapTrack).filter(Boolean);
    res.json({
      tracks,
      artist: {
        id: artistData.id,
        name: artistData.name,
        cover: artistData.images?.[0]?.url || '',
        followers: artistData.followers?.total || 0,
        genres: artistData.genres || [],
      }
    });
  } catch (e) {
    console.error('Artist top-tracks error:', e.message);
    res.json({ tracks: [], artist: null });
  }
});

// ── ARTIST ALBUMS ─────────────────────────────────────────────────────────────
app.get('/api/artists/:id/albums', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const data = await spotifyGet(`/artists/${req.params.id}/albums?limit=${limit}&offset=${offset}&include_groups=album,single&market=US`);
    if (!data) return res.json({ albums: [], total: 0 });
    res.json({ albums: (data.items || []).map(mapAlbum).filter(Boolean), total: data.total || 0 });
  } catch (e) {
    console.error('Artist albums error:', e.message);
    res.json({ albums: [], total: 0 });
  }
});

// ── SPOTIFY PLAYLIST TRACKS ──────────────────────────────────────────────────
app.get('/api/spotify-playlist/:id/tracks', async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 10, 10);
  try {
    const artistData = await spotifyGet(`/artists/${req.params.id}`);
    if (artistData && artistData.name) {
      const tracksData = await spotifyGet(`/search?q=artist:${encodeURIComponent(artistData.name)}&type=track&limit=${limit}&offset=${offset}`);
      const tracks = (tracksData?.tracks?.items || []).map(mapTrack).filter(Boolean);
      return res.json({ tracks, total: tracksData?.tracks?.total || 0, artist: artistData.name });
    }
    const tracksData = await spotifyGet(`/search?q=genre:pop&type=track&limit=${limit}&offset=${offset}`);
    const tracks = (tracksData?.tracks?.items || []).map(mapTrack).filter(Boolean);
    res.json({ tracks, total: tracksData?.tracks?.total || 0 });
  } catch (e) {
    console.error('Playlist tracks error:', e.message);
    res.json({ tracks: [], total: 0 });
  }
});

// ── YT-DLP AUDIO ──────────────────────────────────────────────────────────────
const execFileAsync = promisify(execFile);
const audioCache = new Map();

app.get('/api/yt-audio', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing q' });
  if (audioCache.has(q)) return res.json(audioCache.get(q));
  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '-f', 'http_mp3_0_1/bestaudio[protocol=http]/bestaudio',
      '-g', '--no-warnings', '--no-playlist',
      `scsearch1:${q}`
    ], { timeout: 15000 });
    const audioUrl = stdout.trim();
    if (audioUrl) {
      const result = { url: audioUrl };
      audioCache.set(q, result);
      setTimeout(() => audioCache.delete(q), 3 * 60 * 60 * 1000);
      return res.json(result);
    }
    res.status(404).json({ error: 'No audio found' });
  } catch (e) {
    res.status(500).json({ error: 'yt-dlp failed' });
  }
});

// ── STREAM PROXY ───────────────────────────────────────────────────────────────
app.get(['/api/yt-stream', '/api/proxy'], async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    if (req.headers.range) headers.Range = req.headers.range;
    const response = await fetch(url, { headers });
    res.status(response.status);
    const ct = response.headers.get('content-type');
    if (ct) res.set('Content-Type', ct);
    res.set('Accept-Ranges', 'bytes');
    const cl = response.headers.get('content-length');
    if (cl) res.set('Content-Length', cl);
    const cr = response.headers.get('content-range');
    if (cr) res.set('Content-Range', cr);
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        if (!res.write(value)) await new Promise(r => res.once('drain', r));
      }
    };
    pump().catch(() => res.end());
  } catch (e) {
    res.status(500).send('Stream error');
  }
});

// ── OAUTH ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://127.0.0.1:${PORT}/auth/callback`;
const SCOPES = [
  'user-read-private','user-read-email',
  'user-top-read','user-read-recently-played',
  'user-library-read','playlist-read-private','playlist-read-collaborative',
].join(' ');

function genState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function refreshUserToken(refreshToken) {
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { access_token: data.access_token, refresh_token: data.refresh_token || refreshToken, expires_in: data.expires_in || 3600 };
}

function userSpotifyGet(path, userToken) {
  return fetch(`${SPOTIFY_API}${path}`, { headers: { Authorization: `Bearer ${userToken}` } })
    .then(r => r.text())
    .then(text => { if (!text || text.trim() === '') return null; try { return JSON.parse(text); } catch { return null; } })
    .catch(() => null);
}

app.get('/auth/login', (req, res) => {
  const state = genState();
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.status(400).json({ error: error || 'No code' });
  try {
    const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
    });
    const data = await r.json();
    if (!r.ok || !data.access_token) return res.status(400).json({ error: 'Token exchange failed' });
    const frontendBase = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
    const params = new URLSearchParams({
      code: '_done_',
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_in: String(data.expires_in || 3600),
    });
    res.redirect(`${frontendBase}/callback?${params}`);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.query;
  if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });
  const data = await refreshUserToken(refresh_token);
  if (!data) return res.status(400).json({ error: 'Refresh failed' });
  res.json(data);
});

// ── USER API ─────────────────────────────────────────────────────────────────
function getUserToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

app.get('/api/me', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const data = await userSpotifyGet('/me', tok);
  if (!data) return res.status(401).json({ error: 'Failed' });
  res.json({ id: data.id, name: data.display_name, email: data.email, avatar: data.images?.[0]?.url || null, product: data.product });
});

app.get('/api/user/top-tracks', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  const range = req.query.time_range || 'medium_term';
  const data = await userSpotifyGet(`/me/top/tracks?limit=${limit}&offset=${offset}&time_range=${range}`, tok);
  res.json(data || { items: [], total: 0 });
});

app.get('/api/user/featured-playlists', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  const data = await userSpotifyGet(`/browse/featured-playlists?limit=${limit}&offset=${offset}`, tok);
  res.json(data || { playlists: { items: [], total: 0 } });
});

app.get('/api/user/new-releases', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  const data = await userSpotifyGet(`/browse/new-releases?limit=${limit}&offset=${offset}`, tok);
  res.json(data || { albums: { items: [], total: 0 } });
});

app.get('/api/user/recommendations', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const top = await userSpotifyGet('/me/top/tracks?limit=5&time_range=short_term', tok);
  const seeds = (top?.items || []).slice(0, 5).map(t => t.id).join(',');
  const params = seeds
    ? `seed_tracks=${seeds}&limit=${limit}`
    : `seed_genres=pop,indie,dance&limit=${limit}`;
  const data = await userSpotifyGet(`/recommendations?${params}`, tok);
  res.json(data || { tracks: [] });
});

app.get('/api/user/saved-albums', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  const data = await userSpotifyGet(`/me/albums?limit=${limit}&offset=${offset}`, tok);
  res.json(data || { items: [], total: 0 });
});

app.get('/api/user/recently-played', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const data = await userSpotifyGet(`/me/player/recently-played?limit=${limit}`, tok);
  res.json(data || { items: [] });
});

app.get('/api/user/playlists', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;
  const data = await userSpotifyGet(`/me/playlists?limit=${limit}&offset=${offset}`, tok);
  res.json(data || { items: [], total: 0 });
});

app.get('/api/user/playlist/:id/tracks', async (req, res) => {
  const tok = getUserToken(req);
  if (!tok) return res.status(401).json({ error: 'No token' });
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;
  const data = await userSpotifyGet(
    `/playlists/${req.params.id}/tracks?limit=${limit}&offset=${offset}`, tok
  );
  if (!data) return res.json({ items: [], total: 0 });
  const tracks = (data.items || []).filter(i => i?.track?.id).map(i => mapTrack(i.track));
  res.json({ tracks, total: data.total || 0 });
});

// ── OWNER FEED (server-stored refresh_token, no client login needed) ─────────
const OWNER_REFRESH_TOKEN = process.env.OWNER_REFRESH_TOKEN || '';
let ownerTokenCache = { access_token: null, expires_at: 0 };

async function getOwnerToken() {
  if (!OWNER_REFRESH_TOKEN) return null;
  const now = Date.now();
  if (ownerTokenCache.access_token && now < ownerTokenCache.expires_at - 30_000) {
    return ownerTokenCache.access_token;
  }
  const data = await refreshUserToken(OWNER_REFRESH_TOKEN);
  if (!data?.access_token) return null;
  ownerTokenCache = { access_token: data.access_token, expires_at: now + (data.expires_in * 1000) };
  return data.access_token;
}

async function ownerGet(path) {
  const tok = await getOwnerToken();
  if (!tok) return null;
  return userSpotifyGet(path, tok);
}

app.get('/api/feed/me', async (req, res) => {
  const data = await ownerGet('/me');
  if (!data) return res.status(503).json({ error: 'Owner feed unavailable' });
  res.json({ id: data.id, name: data.display_name, avatar: data.images?.[0]?.url || null });
});

app.get('/api/feed/top-tracks', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const range = req.query.time_range || 'short_term';
  const data = await ownerGet(`/me/top/tracks?limit=${limit}&time_range=${range}`);
  res.json({ tracks: (data?.items || []).map(mapTrack).filter(Boolean) });
});

app.get('/api/feed/recently-played', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const data = await ownerGet(`/me/player/recently-played?limit=${limit}`);
  const seen = new Set();
  const tracks = [];
  for (const item of (data?.items || [])) {
    const t = mapTrack(item.track);
    if (t && !seen.has(t.id)) { seen.add(t.id); tracks.push(t); }
  }
  res.json({ tracks });
});

app.get('/api/feed/playlists', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const data = await ownerGet(`/me/playlists?limit=${limit}`);
  const playlists = (data?.items || []).filter(Boolean).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    cover: p.images?.[0]?.url || '',
    tracks_count: p.tracks?.total || 0,
    owner: p.owner?.display_name || '',
  }));
  res.json({ playlists });
});

app.get('/api/feed/recommendations', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const top = await ownerGet('/me/top/tracks?limit=5&time_range=short_term');
  const seeds = (top?.items || []).slice(0, 5).map(t => t.id).join(',');
  const params = seeds
    ? `seed_tracks=${seeds}&limit=${limit}`
    : `seed_genres=pop,indie,dance&limit=${limit}`;
  const data = await ownerGet(`/recommendations?${params}`);
  res.json({ tracks: (data?.tracks || []).map(mapTrack).filter(Boolean) });
});

app.get('/api/feed/playlist/:id', async (req, res) => {
  const data = await ownerGet(`/playlists/${req.params.id}`);
  if (!data) return res.status(404).json({ error: 'Playlist not found' });
  res.json({
    id: data.id,
    name: data.name,
    description: data.description || '',
    cover: data.images?.[0]?.url || '',
    tracks_count: data.tracks?.total || 0,
    owner: data.owner?.display_name || '',
  });
});

app.get('/api/feed/playlist/:id/tracks', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const data = await ownerGet(`/playlists/${req.params.id}/tracks?limit=${limit}&offset=${offset}`);
  if (!data) return res.json({ tracks: [], total: 0 });
  const tracks = (data.items || []).filter(i => i?.track?.id).map(i => mapTrack(i.track)).filter(Boolean);
  res.json({ tracks, total: data.total || tracks.length });
});

app.get('/api/feed/followed-artists', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const data = await ownerGet(`/me/following?type=artist&limit=${limit}`);
  const items = (data?.artists?.items || []).map(a => ({
    id: a.id,
    name: a.name,
    image: a.images?.[0]?.url || '',
    genres: a.genres || [],
    followers: a.followers?.total || 0,
  }));
  res.json({ artists: items });
});

// Assembled "Spotify-style" home feed for the owner. Falls back to followed
// artists when listening history is empty.
app.get('/api/feed/home', async (req, res) => {
  const [recent, top, followed, trending] = await Promise.all([
    ownerGet('/me/player/recently-played?limit=20').catch(() => null),
    ownerGet('/me/top/tracks?limit=10&time_range=medium_term').catch(() => null),
    ownerGet('/me/following?type=artist&limit=10').catch(() => null),
    spotifyGet(`/search?q=${encodeURIComponent('genre:pop year:2025')}&type=track&limit=10&offset=0`).catch(() => null),
  ]);

  const recentTracks = [];
  const seen = new Set();
  for (const item of (recent?.items || [])) {
    const t = mapTrack(item.track);
    if (t && !seen.has(t.id)) { seen.add(t.id); recentTracks.push(t); }
  }

  const topTracks = (top?.items || []).map(mapTrack).filter(Boolean);
  const followedArtists = (followed?.artists?.items || []).map(a => ({
    id: a.id,
    name: a.name,
    image: a.images?.[0]?.url || '',
  }));

  // For each followed artist, pull top tracks (parallel) for the "Mulai mendengarkan" mix.
  // Use search by artist name (the /artists/:id/top-tracks endpoint is deprecated for new apps).
  const artistTopArrays = await Promise.all(
    followedArtists.slice(0, 6).map(a =>
      spotifyGet(`/search?q=${encodeURIComponent('artist:"' + a.name + '"')}&type=track&limit=10`)
        .then(d => (d?.tracks?.items || []).map(mapTrack).filter(Boolean))
        .catch(() => [])
    )
  );

  // Interleave 2 tracks per artist → diverse mix
  const startListening = [];
  for (let i = 0; i < 3; i++) {
    for (const arr of artistTopArrays) {
      if (arr[i]) startListening.push(arr[i]);
    }
  }
  // Prepend recently-played + top tracks if available
  const startSection = [...recentTracks.slice(0, 5), ...topTracks.slice(0, 5), ...startListening].slice(0, 20);

  const charts = (trending?.tracks?.items || []).map(mapTrack).filter(Boolean);

  res.json({
    profile: { id: 'owner', name: 'h' },
    sections: {
      startListening: startSection,
      followedArtists,
      mixes: followedArtists.map(a => ({
        id: `mix_${a.id}`,
        artistId: a.id,
        title: `Mix ${a.name}`,
        subtitle: 'Lagu mirip',
        cover: a.image,
      })),
      radios: followedArtists.map(a => ({
        id: `radio_${a.id}`,
        artistId: a.id,
        title: a.name,
        subtitle: 'Radio',
        cover: a.image,
      })),
      charts,
    },
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HaikZTIFY API on http://localhost:${PORT}`);
});
