import type { Track } from '../interfaces/track';

/**
 * Global player bridge — a singleton that stores YouTube player function
 * references so that non-React code (playerService, Redux thunks, keyboard
 * handlers) can control playback without going through a React context.
 */

export interface PlayerBridge {
  playTrack: (track: Track, context?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  play: (body?: any) => void;
  next: () => void;
  previous: () => void;
  seekTo: (ms: number) => void;
  setVolume: (percent: number) => void;
  setShuffle: (enabled: boolean) => void;
  setRepeatMode: (mode: 'off' | 'context' | 'track') => void;
  addToQueue: (track: Track) => void;
  getState: () => any;
}

let bridge: PlayerBridge | null = null;

export function registerPlayerBridge(b: PlayerBridge) {
  bridge = b;
}

export function getPlayerBridge(): PlayerBridge | null {
  return bridge;
}

// ---------------------------------------------------------------------------
// Track Registry — components register Track objects so that playerService can
// resolve URIs (e.g. "youtube:track:xxx") back to full Track objects.
// ---------------------------------------------------------------------------

const tracksByUri = new Map<string, Track>();
const tracksByContextUri = new Map<string, Track[]>();

export function registerTrack(track: Track) {
  if (track.uri) {
    tracksByUri.set(track.uri, track);
  }
  // Also index by id
  if (track.id) {
    tracksByUri.set(`youtube:track:${track.id}`, track);
    tracksByUri.set(track.id, track);
  }
}

export function registerTracksForContext(contextUri: string, tracks: Track[]) {
  tracksByContextUri.set(contextUri, tracks);
  tracks.forEach(registerTrack);
}

export function resolveTrackByUri(uri: string): Track | undefined {
  return tracksByUri.get(uri);
}

export function resolveTracksByContextUri(contextUri: string): Track[] | undefined {
  return tracksByContextUri.get(contextUri);
}
