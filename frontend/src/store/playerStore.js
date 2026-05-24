import { create } from 'zustand';
import { ALL_SONGS, resolveTrackAudio } from '../data/catalog';

const audio = typeof window !== 'undefined' ? new Audio() : null;

const usePlayerStore = create((set, get) => ({
  queue: [...ALL_SONGS],
  currentIndex: -1,
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  volume: 0.7,
  isMuted: false,
  shuffle: false,
  repeat: 0,
  progress: 0,
  duration: 0,
  currentTime: 0,
  likedIds: typeof window !== 'undefined' ? new Set(JSON.parse(localStorage.getItem('likedIds') || '[]')) : new Set(),
  playlists: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('playlists') || '[]') : [],

  createPlaylist: (name) => {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `playlist_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const newPlaylist = {
      id,
      name: name || `My Playlist #${get().playlists.length + 1}`,
      tracks: []
    };
    const updated = [...get().playlists, newPlaylist];
    set({ playlists: updated });
    localStorage.setItem('playlists', JSON.stringify(updated));
    return newPlaylist;
  },

  deletePlaylist: (playlistId) => {
    const updated = get().playlists.filter(pl => pl.id !== playlistId);
    set({ playlists: updated });
    localStorage.setItem('playlists', JSON.stringify(updated));
  },

  addTrackToPlaylist: (playlistId, track) => {
    const updated = get().playlists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.some(t => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    });
    set({ playlists: updated });
    localStorage.setItem('playlists', JSON.stringify(updated));
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const updated = get().playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    });
    set({ playlists: updated });
    localStorage.setItem('playlists', JSON.stringify(updated));
  },

  toggleLike: (track) => {
    if (!track) return;
    set(s => {
      const liked = new Set(s.likedIds);
      if (liked.has(track.id)) liked.delete(track.id);
      else liked.add(track.id);
      localStorage.setItem('likedIds', JSON.stringify([...liked]));
      return { likedIds: liked };
    });
  },

  playTrack: async (track, newQueue) => {
    const state = get();
    const q = newQueue || state.queue;
    const idx = q.findIndex(s => s.id === track.id);
    if (!audio) return;

    set({ currentTrack: track, currentIndex: idx >= 0 ? idx : 0, queue: q, isLoading: true });

    // Resolve audio URL if not present
    let resolved = track;
    if (!track.src || (!track.src.includes('localhost') && !track.src.includes('/api/proxy') && !track.src.includes('/api/yt-stream') && !track.src.includes(':3001'))) {
      resolved = await resolveTrackAudio(track);
      if (!resolved.src) {
        // No audio source — show track info as paused, don't auto-skip
        set({ currentTrack: { ...track, cover: resolved.cover || track.cover }, isLoading: false, isPlaying: false });
        return;
      }
    }

    // Set metadata for native Android audio bridge (notification title/artist/cover)
    if (typeof window !== "undefined" && window.__setTrackMeta) {
      window.__setTrackMeta(track.title, track.artist, resolved.cover || track.cover || "");
    }
    audio.src = resolved.src;
    audio.volume = state.isMuted ? 0 : state.volume;
    audio.play().catch(() => {});
    set({ currentTrack: { ...track, src: resolved.src, duration: resolved.duration, cover: resolved.cover || track.cover }, isPlaying: true, isLoading: false });
  },

  playIndex: async (index) => {
    const q = get().queue;
    if (index < 0 || index >= q.length) return;
    await get().playTrack(q[index], q);
  },

  setQueue: (songs) => set({ queue: songs }),

  togglePlay: () => {
    const { isPlaying, currentIndex } = get();
    if (!audio) return;
    if (currentIndex === -1) { get().playIndex(0); return; }
    if (isPlaying) { audio.pause(); set({ isPlaying: false }); }
    else { audio.play().catch(() => {}); set({ isPlaying: true }); }
  },

  playNext: () => {
    const { queue, currentIndex, repeat } = get();
    let next = currentIndex + 1;
    if (next >= queue.length) {
      if (repeat === 1) next = 0;
      else { if (audio) audio.pause(); set({ isPlaying: false }); return; }
    }
    get().playIndex(next);
  },

  playPrev: () => {
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const { queue, currentIndex } = get();
    let prev = currentIndex - 1;
    if (prev < 0) prev = queue.length - 1;
    get().playIndex(prev);
  },

  toggleShuffle: () => {
    const { shuffle, queue } = get();
    if (!shuffle) {
      const shuffled = [...queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      set({ shuffle: true, queue: shuffled });
    } else {
      set({ shuffle: false, queue: [...ALL_SONGS] });
    }
  },

  toggleRepeat: () => set(s => ({ repeat: (s.repeat + 1) % 3 })),

  setVolume: (v) => {
    const vol = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = vol;
    set({ volume: vol, isMuted: false });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    if (audio) audio.volume = isMuted ? volume : 0;
    set({ isMuted: !isMuted });
  },

  seekTo: (pct) => {
    if (!audio || !audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
  },



  _updateTime: () => {
    if (!audio) return;
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    set({ duration: dur, currentTime: cur, progress: dur ? (cur / dur) * 100 : 0 });
  },
}));

if (audio) {
  audio.addEventListener('timeupdate', () => usePlayerStore.getState()._updateTime());
  audio.addEventListener('ended', () => {
    const { repeat } = usePlayerStore.getState();
    if (repeat === 2) { audio.currentTime = 0; audio.play(); return; }
    usePlayerStore.getState().playNext();
  });
  audio.addEventListener('error', () => setTimeout(() => usePlayerStore.getState().playNext(), 1500));

  // Native notification controls (Android media session buttons)
  window.addEventListener('haikztify-prev', () => {
    usePlayerStore.getState().playPrev();
  });
  window.addEventListener('haikztify-shuffle', (e) => {
    const store = usePlayerStore.getState();
    const enabled = e.detail?.enabled;
    if (enabled !== undefined && enabled !== store.shuffle) store.toggleShuffle();
  });
}

export default usePlayerStore;
