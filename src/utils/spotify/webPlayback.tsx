import { FC, memo, useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '../../store/store';
import { spotifyActions } from '../../store/slices/spotify';
import { authActions } from '../../store/slices/auth';
import { INITIAL_VOLUME } from '../../constants/spotify';

export interface WebPlaybackProps {
  children?: any;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

const WebPlayback: FC<WebPlaybackProps> = memo(({ children }) => {
  const dispatch = useAppDispatch();
  const playerRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Load the Spotify Web Playback SDK script
  useEffect(() => {
    if (document.getElementById('spotify-player-sdk')) {
      if (window.Spotify) setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-player-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      setSdkReady(true);
    };
  }, []);

  const getToken = useCallback(() => {
    return localStorage.getItem('spotify_access_token') || '';
  }, []);

  // Initialize player once SDK is ready
  useEffect(() => {
    if (!sdkReady || !window.Spotify) return;

    const token = getToken();
    if (!token) return;

    const player = new window.Spotify.Player({
      name: 'Audynox Web Player',
      getOAuthToken: (cb: (token: string) => void) => {
        const t = localStorage.getItem('spotify_access_token') || '';
        cb(t);
      },
      volume: INITIAL_VOLUME,
    });

    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.warn('Spotify Player Init Error:', message);
      // Still mark player as loaded so the app works without playback
      dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.warn('Spotify Auth Error:', message);
      dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      // This fires for non-Premium users — SDK playback won't work but app should still function
      console.warn('Spotify Account Error (Premium required for playback):', message);
      dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
    });

    player.addListener('playback_error', ({ message }: { message: string }) => {
      console.warn('Spotify Playback Error:', message);
    });

    player.addListener('player_state_changed', (state: any) => {
      if (state) {
        dispatch(spotifyActions.setState({ state }));
      }
    });

    player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify Player Ready, device_id:', device_id);
      dispatch(spotifyActions.setDeviceId({ deviceId: device_id }));
      dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
    });

    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify Player Not Ready, device_id:', device_id);
      dispatch(spotifyActions.setDeviceId({ deviceId: null }));
    });

    player.connect().then((success: boolean) => {
      if (success) {
        console.log('Spotify Player connected');
      } else {
        // Connection failed (non-Premium) — still let the app work
        console.warn('Spotify Player connection failed (Premium may be required)');
        dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
      }
    });

    playerRef.current = player;
    dispatch(spotifyActions.setPlayer({ player }));

    return () => {
      player.disconnect();
      playerRef.current = null;
    };
  }, [sdkReady, dispatch, getToken]);

  // Fallback: if SDK doesn't fire ready/error within 5s, mark player as loaded anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
    }, 5000);
    return () => clearTimeout(timeout);
  }, [dispatch]);

  return <>{children}</>;
});

export default WebPlayback;
