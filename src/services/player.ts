import { getPlayerBridge, resolveTrackByUri, resolveTracksByContextUri } from '../utils/playerBridge';
import type { Track } from '../interfaces/track';
import type { Pagination } from '../interfaces/api';
import type { PlayHistoryObject } from '../interfaces/player';

const fetchPlaybackState = async () => {
  const bridge = getPlayerBridge();
  return bridge?.getState() ?? null;
};

const transferPlayback = async (_deviceId: string) => {
  // No-op for YouTube — single device
};

const getAvailableDevices = async () => {
  return {
    devices: [
      {
        id: 'youtube-local',
        is_active: true,
        name: 'This Browser',
        type: 'Computer' as const,
        volume_percent: 100,
        is_private_session: false,
        is_restricted: false,
        supports_volume: true,
      },
    ],
  };
};

const startPlayback = async (
  body: { context_uri?: string; uris?: string[]; offset?: { position: number } } = {},
  _deviceId?: string
) => {
  const bridge = getPlayerBridge();
  if (!bridge) return;

  if (!body || Object.keys(body).length === 0) {
    // Resume current playback
    bridge.resume();
    return;
  }

  // Resolve URIs to Track objects and play
  if (body.uris && body.uris.length > 0) {
    const tracks: Track[] = [];
    for (const uri of body.uris) {
      const track = resolveTrackByUri(uri);
      if (track) tracks.push(track);
    }
    if (tracks.length > 0) {
      const offset = body.offset?.position || 0;
      const startTrack = tracks[offset] || tracks[0];
      bridge.playTrack(startTrack, tracks);
      return;
    }
  }

  // Resolve context URI to tracks
  if (body.context_uri) {
    const tracks = resolveTracksByContextUri(body.context_uri);
    if (tracks && tracks.length > 0) {
      const offset = body.offset?.position || 0;
      const startTrack = tracks[offset] || tracks[0];
      bridge.playTrack(startTrack, tracks);
      return;
    }
  }

  // Fallback: just resume
  bridge.resume();
};

const pausePlayback = async () => {
  const bridge = getPlayerBridge();
  bridge?.pause();
};

const nextTrack = async () => {
  const bridge = getPlayerBridge();
  bridge?.next();
};

const previousTrack = async () => {
  const bridge = getPlayerBridge();
  bridge?.previous();
};

const seekToPosition = async (position_ms: number) => {
  const bridge = getPlayerBridge();
  bridge?.seekTo(position_ms);
};

const setRepeatMode = async (state: 'track' | 'context' | 'off') => {
  const bridge = getPlayerBridge();
  bridge?.setRepeatMode(state);
};

const setVolume = async (volume_percent: number) => {
  const bridge = getPlayerBridge();
  bridge?.setVolume(volume_percent);
};

const toggleShuffle = async (state: boolean) => {
  const bridge = getPlayerBridge();
  bridge?.setShuffle(state);
};

const addToQueue = async (uri: string) => {
  const bridge = getPlayerBridge();
  if (!bridge) return;
  const track = resolveTrackByUri(uri);
  if (track) bridge.addToQueue(track);
};

const getRecentlyPlayed = async (
  _params: { limit?: number; after?: number; before?: number }
): Promise<Pagination<PlayHistoryObject>> => {
  // Return recently played from localStorage
  try {
    const recent = JSON.parse(localStorage.getItem('yt_recently_played') || '[]');
    const items: PlayHistoryObject[] = recent.map((track: any) => ({
      track,
      played_at: new Date().toISOString(),
      context: { type: 'playlist', uri: '', href: '', external_urls: { spotify: '' } },
    }));
    return {
      href: '',
      items,
      limit: items.length,
      offset: 0,
      next: null,
      previous: null,
      total: items.length,
    };
  } catch {
    return {
      href: '',
      items: [],
      limit: 0,
      offset: 0,
      next: null,
      previous: null,
      total: 0,
    };
  }
};

export const playerService = {
  addToQueue,
  fetchPlaybackState,
  transferPlayback,
  startPlayback,
  pausePlayback,
  nextTrack,
  previousTrack,
  setRepeatMode,
  setVolume,
  toggleShuffle,
  seekToPosition,
  getRecentlyPlayed,
  getAvailableDevices,
};
