import { useRef, useCallback, useState, useEffect } from 'react';
import { getStreamUrl, getSongUrl } from '../services/youtubeApi';
import axios from '../backendAxios';
import type { Track } from '../interfaces/track';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeatMode: 0 | 1 | 2;
  volume: number;
}

export function useYouTubePlayer(onStateChange?: (state: any) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const queueRef = useRef<Track[]>([]);
  const queueIndexRef = useRef(0);
  const shuffleRef = useRef(false);
  const repeatModeRef = useRef<0 | 1 | 2>(0);
  const currentTrackRef = useRef<Track | null>(null);
  const contextRef = useRef<{ uri: string; metadata: { context_description?: string } | null }>({
    uri: '',
    metadata: null,
  });

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    isLoading: false,
    progress: 0,
    duration: 0,
    shuffle: false,
    repeatMode: 0,
    volume: 100,
  });

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      // Mobile Safari/Chrome require attributes for background & lock-screen playback
      audioRef.current.setAttribute('playsinline', 'true');
      audioRef.current.setAttribute('webkit-playsinline', 'true');
    }

    // Unlock audio on first user gesture (required for mobile browsers)
    const unlockAudio = () => {
      const a = audioRef.current;
      if (a) {
        a.play().then(() => a.pause()).catch(() => {});
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Build the playback state object sent to Redux
  const buildPlaybackState = useCallback(
    (overrides: { paused?: boolean; position?: number; duration?: number } = {}) => ({
      paused: overrides.paused ?? true,
      position: overrides.position ?? 0,
      duration: overrides.duration ?? 0,
      shuffle: shuffleRef.current,
      repeat_mode: repeatModeRef.current,
      context: contextRef.current,
      track_window: {
        current_track: currentTrackRef.current
          ? mapTrackToSpotifyFormat(currentTrackRef.current)
          : null,
        next_tracks: queueRef.current.slice(
          queueIndexRef.current + 1,
          queueIndexRef.current + 3
        ),
        previous_tracks: queueRef.current.slice(
          Math.max(0, queueIndexRef.current - 2),
          queueIndexRef.current
        ),
      },
      disallows: {
        skipping_prev: queueIndexRef.current <= 0,
        skipping_next: queueIndexRef.current >= queueRef.current.length - 1,
        pausing: false,
        resuming: false,
      },
    }),
    []
  );

  // Progress tracking via requestAnimationFrame
  const startProgressTracking = useCallback(() => {
    const update = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const progress = audio.currentTime * 1000;
        const duration = (audio.duration || 0) * 1000;
        setState((prev) => ({ ...prev, progress, duration }));
        if (onStateChange) {
          onStateChange(buildPlaybackState({ paused: false, position: progress, duration }));
        }
      }
      animFrameRef.current = requestAnimationFrame(update);
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(update);
  }, [onStateChange, buildPlaybackState]);

  const stopProgressTracking = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Dispatch current state to redux
  const dispatchState = useCallback(
    (overrides: Partial<PlayerState> = {}) => {
      const merged = { ...state, ...overrides };
      if (onStateChange) {
        onStateChange(
          buildPlaybackState({
            paused: !merged.isPlaying,
            position: merged.progress,
            duration: merged.duration,
          })
        );
      }
    },
    [state, onStateChange, buildPlaybackState]
  );

  const playTrack = useCallback(
    async (track: Track, context?: Track[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Update queue if context provided
      if (context) {
        queueRef.current = context;
        const idx = context.findIndex((t) => t.id === track.id);
        queueIndexRef.current = idx >= 0 ? idx : 0;
      }

      currentTrackRef.current = track;
      const videoId = (track as any).videoId || track.id;

      // Update context URI based on album/playlist
      if (track.album?.uri) {
        contextRef.current = {
          uri: track.album.uri,
          metadata: { context_description: track.album.name },
        };
      }

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        isLoading: true,
        isPlaying: false,
        queue: queueRef.current,
        queueIndex: queueIndexRef.current,
      }));

      // Dispatch initial state with loading
      if (onStateChange) {
        onStateChange(
          buildPlaybackState({ paused: true, position: 0, duration: track.duration_ms || 0 })
        );
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:7860';

      // Helper to start playback once audio src is set
      const beginPlayback = (actualDuration: number) => {
        // Clear old handlers
        audio.oncanplay = null;
        audio.onerror = null;
        audio.onended = null;
        audio.onloadeddata = null;

        const doPlay = () => {
          audio
            .play()
            .then(() => {
              console.log('[Audynox] Playback started:', track.name);
              setState((prev) => ({
                ...prev,
                isPlaying: true,
                isLoading: false,
                duration: actualDuration,
              }));
              startProgressTracking();
              document.title = `${track.name} • ${track.artists?.[0]?.name || 'Unknown'}`;
            })
            .catch((e) => {
              console.error('[Audynox] play() rejected:', e);
              setState((prev) => ({ ...prev, isLoading: false }));
            });
        };

        audio.oncanplay = doPlay;
        // Fallback: also try on loadeddata in case canplay doesn't fire
        audio.onloadeddata = () => {
          if (audio.paused) doPlay();
        };

        audio.onended = () => {
          handleTrackEnd();
        };

        console.log('[Audynox] Loading audio src:', audio.src);
        audio.load();
      };

      // Helper: try JioSaavn search as fallback
      const tryJioSaavnFallback = async () => {
        try {
          const q = `${track.name} ${track.artists?.[0]?.name || ''}`.trim();
          const resp = await axios.get('/api/search', { params: { q, maxResults: 1 } });
          const jsTrack = resp.data?.[0];
          if (jsTrack?.downloadUrl && jsTrack.downloadUrl.length > 0) {
            const best = jsTrack.downloadUrl[jsTrack.downloadUrl.length - 1];
            console.log('[Audynox] Falling back to JioSaavn for:', jsTrack.name);
            audio.src = best.url || best.link;
            beginPlayback(jsTrack.duration_ms || track.duration_ms || 0);
            return true;
          }
        } catch (e) {
          console.error('[Audynox] JioSaavn fallback failed:', e);
        }
        return false;
      };

      try {
        // Check if track has JioSaavn downloadUrl (direct MP3)
        const trackDownloadUrl = (track as any).downloadUrl;
        if (trackDownloadUrl && Array.isArray(trackDownloadUrl) && trackDownloadUrl.length > 0) {
          // Use JioSaavn direct URL — pick best quality (last entry = 320kbps)
          const best = trackDownloadUrl[trackDownloadUrl.length - 1];
          const directUrl = best.url || best.link;
          console.log('[Audynox] Playing via JioSaavn direct URL:', track.name);
          audio.src = directUrl;

          audio.onerror = async () => {
            console.warn('[Audynox] JioSaavn direct URL failed, trying YouTube fallback...');
            // Try YouTube fallback if we have a videoId
            if (videoId && videoId !== track.id) {
              audio.src = `${backendUrl}/api/audio/${videoId}`;
              beginPlayback(track.duration_ms || 0);
            } else {
              setState((prev) => ({ ...prev, isLoading: false, isPlaying: false }));
              nextTrackFn();
            }
          };

          beginPlayback(track.duration_ms || 0);
        } else {
          // No JioSaavn URL — use YouTube audio proxy
          audio.src = `${backendUrl}/api/audio/${videoId}`;

          // Fetch metadata for duration
          const streamData = await getStreamUrl(videoId).catch(() => null);
          const actualDuration = streamData?.duration || track.duration_ms || 0;

          audio.onerror = async () => {
            console.warn('[Audynox] YouTube playback failed, trying JioSaavn fallback...');
            const ok = await tryJioSaavnFallback();
            if (!ok) {
              setState((prev) => ({ ...prev, isLoading: false, isPlaying: false }));
              nextTrackFn();
            }
          };

          beginPlayback(actualDuration);
        }
      } catch (err) {
        console.error('[Audynox] Failed to start playback:', err);
        const ok = await tryJioSaavnFallback();
        if (!ok) {
          setState((prev) => ({ ...prev, isLoading: false }));
          nextTrackFn();
        }
      }
    },
    [onStateChange, startProgressTracking]
  );

  // Autoplay: fetch related tracks when queue is exhausted
  const fetchAutoplayTracks = useCallback(async (): Promise<Track[]> => {
    const current = currentTrackRef.current;
    if (!current) return [];
    try {
      // Try JioSaavn suggestions first
      const songId = current.id;
      console.log('[Audynox] Autoplay: fetching suggestions for:', songId);
      const resp = await axios.get(`/api/suggestions/${songId}`);
      let tracks = resp.data as Track[];

      // If no suggestions, fall back to search
      if (!tracks || tracks.length === 0) {
        const q = `${current.artists?.[0]?.name || ''} music`.trim();
        console.log('[Audynox] Autoplay: no suggestions, searching for:', q);
        const searchResp = await axios.get('/api/search', { params: { q, maxResults: 10 } });
        tracks = searchResp.data as Track[];
      }

      // Filter out tracks already in queue
      const existingIds = new Set(queueRef.current.map((t) => t.id));
      return tracks.filter((t) => !existingIds.has(t.id));
    } catch (e) {
      console.error('[Audynox] Autoplay fetch failed:', e);
      return [];
    }
  }, []);

  const handleTrackEnd = useCallback(() => {
    stopProgressTracking();

    // Save to recently played
    const current = currentTrackRef.current;
    if (current) {
      try {
        const recent = JSON.parse(localStorage.getItem('yt_recently_played') || '[]');
        const filtered = recent.filter((t: any) => t.id !== current.id);
        filtered.unshift(current);
        localStorage.setItem('yt_recently_played', JSON.stringify(filtered.slice(0, 50)));
      } catch {}
    }

    // Repeat track mode
    if (repeatModeRef.current === 2) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        startProgressTracking();
      }
      return;
    }

    // Next track in queue
    if (queueIndexRef.current < queueRef.current.length - 1) {
      queueIndexRef.current += 1;
      const nextTrack = queueRef.current[queueIndexRef.current];
      if (nextTrack) {
        playTrack(nextTrack);
      }
    } else if (repeatModeRef.current === 1) {
      // Repeat context: go back to start
      queueIndexRef.current = 0;
      const firstTrack = queueRef.current[0];
      if (firstTrack) {
        playTrack(firstTrack);
      }
    } else {
      // Queue exhausted — autoplay related tracks
      console.log('[Audynox] Queue ended, autoplay fetching more tracks...');
      fetchAutoplayTracks().then((newTracks) => {
        if (newTracks.length > 0) {
          // Append to queue and play next
          queueRef.current = [...queueRef.current, ...newTracks];
          queueIndexRef.current += 1;
          const nextTrack = queueRef.current[queueIndexRef.current];
          if (nextTrack) {
            console.log('[Audynox] Autoplay:', nextTrack.name);
            setState((prev) => ({ ...prev, queue: queueRef.current }));
            playTrack(nextTrack);
          }
        } else {
          // Truly no more tracks
          setState((prev) => ({ ...prev, isPlaying: false }));
          document.title = 'Audynox';
          if (onStateChange) {
            onStateChange(buildPlaybackState({ paused: true, position: 0, duration: 0 }));
          }
        }
      });
    }
  }, [playTrack, onStateChange, startProgressTracking, stopProgressTracking, buildPlaybackState, fetchAutoplayTracks]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      stopProgressTracking();
      setState((prev) => ({ ...prev, isPlaying: false }));
      dispatchState({ isPlaying: false });
    }
  }, [stopProgressTracking, dispatchState]);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio.play().then(() => {
        setState((prev) => ({ ...prev, isPlaying: true }));
        startProgressTracking();
      }).catch(() => {});
    }
  }, [startProgressTracking]);

  const nextTrackFn = useCallback(() => {
    if (shuffleRef.current) {
      const randomIdx = Math.floor(Math.random() * queueRef.current.length);
      queueIndexRef.current = randomIdx;
    } else if (queueIndexRef.current < queueRef.current.length - 1) {
      queueIndexRef.current += 1;
    } else if (repeatModeRef.current === 1) {
      queueIndexRef.current = 0;
    } else {
      return;
    }
    const nextTrack = queueRef.current[queueIndexRef.current];
    if (nextTrack) {
      playTrack(nextTrack);
    }
  }, [playTrack]);

  const previousTrackFn = useCallback(() => {
    const audio = audioRef.current;
    // If more than 3 seconds in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queueIndexRef.current > 0) {
      queueIndexRef.current -= 1;
      const prevTrack = queueRef.current[queueIndexRef.current];
      if (prevTrack) {
        playTrack(prevTrack);
      }
    }
  }, [playTrack]);

  const seekTo = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = ms / 1000;
      setState((prev) => ({ ...prev, progress: ms }));
    }
  }, []);

  const setVolume = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, percent / 100));
      setState((prev) => ({ ...prev, volume: percent }));
    }
  }, []);

  const setShuffle = useCallback((enabled: boolean) => {
    shuffleRef.current = enabled;
    setState((prev) => ({ ...prev, shuffle: enabled }));
  }, []);

  const setRepeatMode = useCallback((mode: 'off' | 'context' | 'track') => {
    const modeMap = { off: 0, context: 1, track: 2 } as const;
    const modeNum = modeMap[mode];
    repeatModeRef.current = modeNum;
    setState((prev) => ({ ...prev, repeatMode: modeNum }));
  }, []);

  const addToQueue = useCallback((track: Track) => {
    queueRef.current = [...queueRef.current, track];
    setState((prev) => ({ ...prev, queue: queueRef.current }));
  }, []);

  // Play method that handles the startPlayback API shape
  const play = useCallback(
    (body?: any) => {
      if (!body || Object.keys(body).length === 0) {
        // Resume
        resume();
        return;
      }
      // body may contain { context_uri, uris, offset }
      // For now, just resume if no specific track
      resume();
    },
    [resume]
  );

  return {
    state,
    audioRef,
    playTrack,
    pause,
    resume,
    play,
    next: nextTrackFn,
    previous: previousTrackFn,
    seekTo,
    setVolume,
    setShuffle,
    setRepeatMode,
    addToQueue,
  };
}

// Map our Track to the shape that components expect from Spotify.PlaybackState.track_window.current_track
function mapTrackToSpotifyFormat(track: Track) {
  return {
    id: track.id,
    name: track.name,
    uri: track.uri,
    type: track.type,
    artists: (track.artists || []).map((a) => ({
      name: a.name,
      uri: a.uri || `youtube:artist:${a.id}`,
    })),
    album: {
      name: track.album?.name || '',
      uri: track.album?.uri || '',
      images: (track.album?.images || []).map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      })),
    },
    duration_ms: track.duration_ms || 0,
    is_playable: true,
  };
}
