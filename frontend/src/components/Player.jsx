import { useRef, useCallback } from 'react';
import usePlayerStore from '../store/playerStore';

export default function Player() {
  const {
    currentTrack, isPlaying, togglePlay, playNext, playPrev,
    shuffle, toggleShuffle, repeat, toggleRepeat,
    volume, isMuted, setVolume, toggleMute,
    progress, currentTime, duration, seekTo,
    toggleLike, likedIds,
  } = usePlayerStore();

  const progressRef = useRef(null);
  const volumeRef = useRef(null);

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * 100);
  }, [seekTo]);

  const handleVolumeClick = useCallback((e) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    setVolume((e.clientX - rect.left) / rect.width);
  }, [setVolume]);

  const isLiked = currentTrack ? likedIds.has(currentTrack.id) : false;
  const vol = isMuted ? 0 : volume;

  return (
    <footer className="player-bar">
      <div className="player-left">
        <img
          className={`player-cover${isPlaying ? ' player-cover-playing' : ''}`}
          src={currentTrack?.cover || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 80 80%27%3E%3Crect fill=%27%23282828%27 width=%2780%27 height=%2780%27/%3E%3Cpath d=%27M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 3a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm-3-6a3 3 0 1 0 6 0 3 3 0 0 0-6 0z%27 fill=%27%23555%27/%3E%3C/svg%3E'}
          alt=""
          onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 80 80%27%3E%3Crect fill=%27%23282828%27 width=%2780%27 height=%2780%27/%3E%3Cpath d=%27M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30zm0 3a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm-3-6a3 3 0 1 0 6 0 3 3 0 0 0-6 0z%27 fill=%27%23555%27/%3E%3C/svg%3E'; }}
        />
        <div className="player-track-info">
          <span className="track-name-link">{currentTrack?.title || 'Not playing'}</span>
          <span className="track-artist-link">{currentTrack?.artist || 'Select a track'}</span>
        </div>
        <button className={`like-btn ${isLiked ? 'active' : ''}`} onClick={() => currentTrack && toggleLike(currentTrack)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
          {isLiked ? (
            <svg viewBox="0 0 24 24" fill="#1db954" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          )}
        </button>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className={`ctrl-btn ${shuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"/><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"/></svg>
          </button>
          <button className="ctrl-btn" onClick={playPrev} title="Previous">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"/></svg>
          </button>
          <button className="play-btn-lg" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="black"><path d="M8 5.14v14l11-7-11-7z"/></svg>
            )}
          </button>
          <button className="ctrl-btn" onClick={playNext} title="Next">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"/></svg>
          </button>
          <button className={`ctrl-btn ${repeat > 0 ? 'active' : ''} ${repeat === 2 ? 'repeat-one' : ''}`} onClick={toggleRepeat} title="Repeat">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"/></svg>
            {repeat === 2 && <span className="repeat-badge">1</span>}
          </button>
        </div>
        <div className="progress-container">
          <span className="progress-time">{fmt(currentTime)}</span>
          <div className="progress-track" ref={progressRef} onClick={handleProgressClick}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <div className="progress-thumb" style={{ left: `${progress}%` }} />
          </div>
          <span className="progress-time">{fmt(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="ctrl-btn" onClick={toggleMute} title="Volume">
          {isMuted || vol === 0 ? (
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06z"/><path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.642 3.642 0 0 0-1.33 4.967 3.639 3.639 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a.75.75 0 0 0-1.5 0v1.007L3.7 10.25a2.139 2.139 0 0 1 0-3.7l5.8-3.35V10.5a.75.75 0 0 0 1.5 0V1.5z"/></svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z"/></svg>
          )}
        </button>
        <div className="volume-wrap">
          <div className="volume-track" ref={volumeRef} onClick={handleVolumeClick}>
            <div className="volume-fill" style={{ width: `${vol * 100}%` }} />
            <div className="volume-thumb" style={{ left: `${vol * 100}%` }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
