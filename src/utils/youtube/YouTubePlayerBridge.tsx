import { FC, memo, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '../../store/store';
import { spotifyActions } from '../../store/slices/spotify';
import { authActions } from '../../store/slices/auth';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';
import { registerPlayerBridge } from '../playerBridge';

export interface YouTubePlayerBridgeProps {
  children?: any;
}

const YouTubePlayerBridge: FC<YouTubePlayerBridgeProps> = memo(({ children }) => {
  const dispatch = useAppDispatch();
  const stateRef = useRef<any>(null);

  const onStateChange = useCallback(
    (state: any) => {
      stateRef.current = state;
      dispatch(spotifyActions.setState({ state }));
    },
    [dispatch]
  );

  const player = useYouTubePlayer(onStateChange);

  // Register the global player bridge so playerService can call it
  useEffect(() => {
    registerPlayerBridge({
      playTrack: player.playTrack,
      pause: player.pause,
      resume: player.resume,
      play: player.play,
      next: player.next,
      previous: player.previous,
      seekTo: player.seekTo,
      setVolume: player.setVolume,
      setShuffle: player.setShuffle,
      setRepeatMode: player.setRepeatMode,
      addToQueue: player.addToQueue,
      getState: () => stateRef.current,
    });
  }, [player]);

  // Mark player as loaded immediately (no SDK to wait for)
  useEffect(() => {
    dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
    dispatch(spotifyActions.setDeviceId({ deviceId: 'youtube-local' }));
  }, [dispatch]);

  // Setup MediaSession API for background play and lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => player.resume());
    navigator.mediaSession.setActionHandler('pause', () => player.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => player.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => player.next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) {
        player.seekTo(details.seekTime * 1000);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [player]);

  // Update MediaSession metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const track = player.state.currentTrack;
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.name || '',
        artwork: (track.album?.images || []).map((img) => ({
          src: img.url,
          sizes: `${img.width || 300}x${img.height || 300}`,
          type: 'image/jpeg',
        })),
      });
    }
  }, [player.state.currentTrack]);

  // Update MediaSession playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = player.state.isPlaying ? 'playing' : 'paused';
  }, [player.state.isPlaying]);

  return <>{children}</>;
});

export default YouTubePlayerBridge;
