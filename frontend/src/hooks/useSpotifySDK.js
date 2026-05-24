import { useEffect, useRef } from 'react';
import usePlayerStore from '../store/playerStore';
import { API_BASE } from '../context/AuthContext';

export default function useSpotifySDK() {
  const playerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const getOwnerToken = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/owner-token`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.access_token || null;
      } catch { return null; }
    };

    const init = () => {
      const player = new window.Spotify.Player({
        name: 'HaikZTIFY',
        getOAuthToken: async (cb) => {
          const token = await getOwnerToken();
          if (token) cb(token);
        },
        volume: usePlayerStore.getState().volume,
      });

      player.addListener('ready', ({ device_id }) => {
        usePlayerStore.getState().setSpotifyReady(true, device_id, player);
      });

      player.addListener('not_ready', () => {
        usePlayerStore.getState().setSpotifyReady(false, null, null);
      });

      player.addListener('player_state_changed', (state) => {
        if (state) usePlayerStore.getState()._syncSpotifyState(state);
      });

      player.addListener('initialization_error', ({ message }) => console.warn('SDK init error:', message));
      player.addListener('authentication_error', ({ message }) => console.warn('SDK auth error:', message));
      player.addListener('account_error', () => {
        console.warn('Spotify Premium required for Web Playback SDK');
        usePlayerStore.getState().setSpotifyReady(false, null, null);
      });

      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      if (!document.querySelector('script[src*="spotify-player"]')) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      mountedRef.current = false;
      usePlayerStore.getState().setSpotifyReady(false, null, null);
    };
  }, []);
}
