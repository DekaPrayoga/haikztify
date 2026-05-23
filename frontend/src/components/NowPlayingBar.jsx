import { useEffect, useState, useRef } from 'react';
import usePlayerStore from '../store/playerStore';

/**
 * Dynamic "Now Playing" floating pill — inspired by Dynamic Island.
 * Shows up above the player when a track is playing, collapses/expands on click.
 */
export default function NowPlayingBar() {
  const { currentTrack, isPlaying, togglePlay, playNext, playPrev, progress, isLoading } = usePlayerStore();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [prevTrack, setPrevTrack] = useState(null);
  const [bump, setBump] = useState(false);
  const timerRef = useRef(null);

  // Show bar whenever a track is loaded
  useEffect(() => {
    if (currentTrack) {
      setVisible(true);
      // Bump animation on track change
      if (prevTrack?.id !== currentTrack?.id) {
        setBump(true);
        setTimeout(() => setBump(false), 600);
        setPrevTrack(currentTrack);
      }
    }
  }, [currentTrack]);

  // Auto-collapse after 4 s of inactivity when expanded
  useEffect(() => {
    if (expanded) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setExpanded(false), 4000);
    }
    return () => clearTimeout(timerRef.current);
  }, [expanded]);

  if (!visible || !currentTrack) return null;

  const trackTitle = currentTrack.title || 'Unknown';
  const trackArtist = currentTrack.artist || '';

  return (
    <div
      className={`dynbar ${expanded ? 'dynbar-expanded' : ''} ${bump ? 'dynbar-bump' : ''} ${isPlaying ? 'dynbar-playing' : ''}`}
      onClick={() => {
        setExpanded((v) => !v);
        clearTimeout(timerRef.current);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      aria-label="Now Playing"
    >
      {/* Collapsed pill */}
      {!expanded && (
        <div className="dynbar-pill">
          {/* Artwork thumbnail */}
          <div className="dynbar-art">
            {currentTrack.cover
              ? <img src={currentTrack.cover} alt="" />
              : <svg viewBox="0 0 24 24" fill="#1db954" width="14" height="14"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
            }
            {isLoading && <div className="dynbar-art-loader" />}
          </div>

          {/* Marquee title */}
          <div className="dynbar-pill-text">
            <span className="dynbar-pill-title">{trackTitle}</span>
            <span className="dynbar-pill-artist">{trackArtist}</span>
          </div>

          {/* EQ bars or pause icon */}
          <div className="dynbar-eq">
            {isPlaying ? (
              <span className="eq-bars dynbar-eq-bars">
                <span/><span/><span/>
              </span>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="dynbar-card" onClick={(e) => e.stopPropagation()}>
          <div className="dynbar-card-inner">
            {/* Cover art */}
            <div className={`dynbar-cover-wrap ${isPlaying ? 'dynbar-cover-spin' : ''}`}>
              {currentTrack.cover
                ? <img src={currentTrack.cover} alt="" className="dynbar-cover-img" />
                : (
                  <div className="dynbar-cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="#1db954" width="32" height="32"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
                  </div>
                )
              }
            </div>

            {/* Track info */}
            <div className="dynbar-card-info">
              <div className="dynbar-card-title">{trackTitle}</div>
              <div className="dynbar-card-artist">{trackArtist}</div>

              {/* Progress mini bar */}
              <div className="dynbar-progress-track">
                <div className="dynbar-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="dynbar-controls" onClick={(e) => e.stopPropagation()}>
            <button className="dynbar-ctrl" onClick={playPrev} aria-label="Previous">
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"/>
              </svg>
            </button>
            <button
              className={`dynbar-play ${isLoading ? 'dynbar-play-loading' : ''}`}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="dynbar-spinner" />
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
              )}
            </button>
            <button className="dynbar-ctrl" onClick={playNext} aria-label="Next">
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
