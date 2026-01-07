import React, { useRef, useState, useEffect } from 'react';

// Reusable audio player with a simple static waveform-like visualization
// Props:
// - audioSrc: string (required)
// - bars: number (default 48)
// - className: optional wrapper className
// - title: optional title string displayed above the player
// - onPlay / onPause / onEnded: optional callbacks
// simple in-memory cache for decoded waveform/bar data per audioSrc
const waveCache = new Map();

export default function WaveAudioPlayer({ audioSrc, bars = 48, className = '', title, onPlay, onPause, onEnded, autoPlay = false, disableAfterEnd = false, disabled = false, playOnce = false }) {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [playedOnce, setPlayedOnce] = useState(false);
  const [barsArray, setBarsArray] = useState(() => {
    // initial deterministic fallback so UI isn't empty while decoding
    const seed = audioSrc ? audioSrc.length : 1;
    const out = [];
    let s = seed & 0xffff;
    for (let i = 0; i < bars; i++) {
      s = (s * 214013 + 2531011) & 0xffffffff;
      const rnd = ((s >>> 16) & 0xffff) / 0xffff;
      out.push(12 + Math.round(rnd * 60));
    }
    return out;
  });

  const [visibleBars, setVisibleBars] = useState(bars);
  const localDisabled = disabled || !audioSrc || (playOnce && playedOnce);

  // When audioSrc changes, try to decode and compute real waveform bars
  useEffect(() => {
    let mounted = true;
    if (!audioSrc || localDisabled) return undefined;

    // if cached, use cached values
    if (waveCache.has(audioSrc)) {
      setBarsArray(waveCache.get(audioSrc));
      return undefined;
    }

    // decode audio and compute bars
    const decodeAndCompute = async () => {
      try {
        const resp = await fetch(audioSrc);
        const arrayBuffer = await resp.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        // use first channel
        const channelData = audioBuffer.numberOfChannels > 0 ? audioBuffer.getChannelData(0) : null;
        if (!channelData) {
          ctx.close && ctx.close();
          return;
        }

        const blockSize = Math.floor(channelData.length / bars) || 1;
        const newBars = new Array(bars).fill(0).map((_, i) => {
          let sum = 0;
          let max = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, channelData.length);
          for (let j = start; j < end; j++) {
            const v = Math.abs(channelData[j]);
            sum += v * v; // for RMS
            if (v > max) max = v;
          }
          const rms = Math.sqrt(sum / (end - start || 1));
          // combine RMS and peak to get a fuller shape
          const amp = Math.max(rms, max * 0.8);
          // map amp (0..1) -> pixel height (min..max)
          const h = 8 + Math.round(amp * 72);
          return h;
        });

        waveCache.set(audioSrc, newBars);
        if (mounted) setBarsArray(newBars);
        ctx.close && ctx.close();
      } catch (err) {
        // fail silently — keep fallback bars
      }
    };

    decodeAndCompute();

    return () => {
      mounted = false;
    };
  }, [audioSrc, bars, disabled]);

  // make waveform responsive: adjust number of visible bars and bar width based on container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const resize = () => {
      const width = el.clientWidth || el.getBoundingClientRect().width || 0;
      // minimal pixel per bar (including gap) — keep it readable on small screens
      const minPerBar = 6; // px
      const maxBarsThatFit = Math.max(4, Math.floor(width / minPerBar));
      const newVisible = Math.min(bars, maxBarsThatFit);
      setVisibleBars(newVisible);
    };

    resize();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(el);
    } else {
      window.addEventListener('resize', resize);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
    };
  }, [bars]);
  const playedBars = duration > 0 ? Math.max(0, Math.min(visibleBars, (currentTime / duration) * visibleBars)) : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    // if disableAfterEnd requested and audio already ended, ignore toggles
    if (disabled) return;
    if (disableAfterEnd && hasEnded) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
      onPlay && onPlay();
    } else {
      a.pause();
      setPlaying(false);
      onPause && onPause();
    }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTime(a.currentTime || 0);
  };

  const onLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    setDuration(a.duration || 0);
  };

  const onSeek = (e) => {
    // allow click-to-seek on the waveform container
    const a = audioRef.current;
    if (!a || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    a.currentTime = ratio * duration;
    setCurrentTime(a.currentTime);
  };

  // autoplay when audioSrc changes if requested
  useEffect(() => {
    setHasEnded(false);
    if (!audioRef.current) return;
    if (localDisabled) return;
    if (autoPlay) {
      try {
        audioRef.current.play();
        setPlaying(true);
        onPlay && onPlay();
      } catch (e) {
        // autoplay may be blocked by browser; ignore
      }
    }
    // reset playback state
    setCurrentTime(0);
  }, [audioSrc, disabled]);

  return (
    <div className={`wave-audio-player ${className}`}>
      {title && <div className="text-base text-gray-200 mb-2">{title}</div>}
      <div className="w-full bg-gray-700 rounded-2xl p-4 flex items-center">
        {(() => {
          const isReplayDisabled = disableAfterEnd && hasEnded;
          const isDisabledButton = isReplayDisabled || localDisabled;
          return (
            <button
                  onClick={toggle}
                  aria-label={playing ? 'Pause' : (isDisabledButton ? 'Play disabled' : 'Play')}
                  aria-disabled={isDisabledButton}
                  disabled={isDisabledButton}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-transform ${isDisabledButton ? 'bg-gray-400 cursor-not-allowed opacity-80' : 'bg-green-500 hover:scale-105'}`}
                >
              {playing ? (
                <svg width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="#000" /><rect x="14" y="5" width="4" height="14" fill="#000" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3v18l15-9L5 3z" fill="#000" /></svg>
              )}
            </button>
          );
        })()}

        <div className="flex-1 ml-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div
              ref={containerRef}
              className="grid items-end h-20 overflow-hidden cursor-pointer" 
              style={{ gridTemplateColumns: `repeat(${visibleBars}, minmax(0, 1fr))`, gap: '4px' }}
              onClick={onSeek}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSeek(e);
              }}
            >
              {barsArray.slice(0, visibleBars).map((h, i) => {
                return (
                  <div
                    key={i}
                    style={{
                      height: `${h}px`,
                      background: i < playedBars ? '#10B981' : '#6B7280',
                      borderRadius: 2,
                      transition: 'background-color 120ms linear'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={!localDisabled ? audioSrc : undefined}
          className="hidden"
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(0);
            setHasEnded(true);
            onEnded && onEnded();
          }}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onPlay={() => {
            setPlaying(true);
            setPlayedOnce(true);
          }}
          onPause={() => setPlaying(false)}
        />
      </div>
    </div>
  );
}
