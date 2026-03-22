import axios from '../backendAxios';
import type { Track } from '../interfaces/track';
import type { Artist } from '../interfaces/artist';
import type { Album } from '../interfaces/albums';
import type { Playlist, PlaylistItem } from '../interfaces/playlists';
import type { Pagination } from '../interfaces/api';

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const searchTracks = async (
  query: string,
  maxResults = 20
): Promise<Track[]> => {
  const response = await axios.get<Track[]>('/api/search', {
    params: { q: query, maxResults },
  });
  return response.data;
};

// ---------------------------------------------------------------------------
// Stream URL (lazy — only called on play)
// ---------------------------------------------------------------------------

export const getStreamUrl = async (
  videoId: string
): Promise<{ url: string; duration: number; title: string; thumbnail: string }> => {
  const response = await axios.get(`/api/stream-url/${videoId}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Single track metadata
// ---------------------------------------------------------------------------

export const getTrack = async (videoId: string): Promise<Track> => {
  const response = await axios.get<Track>(`/api/track/${videoId}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Playlist
// ---------------------------------------------------------------------------

export const getPlaylist = async (
  playlistId: string
): Promise<{ playlist: Playlist; tracks: (PlaylistItem & { saved: boolean })[] }> => {
  const response = await axios.get(`/api/playlist/${playlistId}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Trending music
// ---------------------------------------------------------------------------

export const getTrending = async (maxResults = 20): Promise<Track[]> => {
  const response = await axios.get<Track[]>('/api/trending', {
    params: { maxResults },
  });
  return response.data;
};

// ---------------------------------------------------------------------------
// Channel (artist)
// ---------------------------------------------------------------------------

export const getChannel = async (
  channelId: string
): Promise<{ artist: Artist; topTracks: Track[] }> => {
  const response = await axios.get(`/api/channel/${channelId}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const getCategories = async (): Promise<Pagination<{ id: string; name: string; icons: { url: string; width: number; height: number }[]; href: string }>> => {
  const response = await axios.get('/api/categories');
  return response.data.categories;
};

// ---------------------------------------------------------------------------
// Helper: wrap tracks as Pagination
// ---------------------------------------------------------------------------

export function wrapAsPagination<T>(items: T[], total?: number): Pagination<T> {
  return {
    href: '',
    items,
    limit: items.length,
    offset: 0,
    next: null,
    previous: null,
    total: total ?? items.length,
  };
}

// ---------------------------------------------------------------------------
// Helper: wrap tracks as playlist items
// ---------------------------------------------------------------------------

export function tracksToPlaylistItems(tracks: Track[]): (PlaylistItem & { saved: boolean })[] {
  return tracks.map((track) => ({
    added_at: new Date().toISOString(),
    added_by: { id: 'local', display_name: 'You', type: 'user' } as any,
    is_local: false,
    primary_color: '',
    track,
    saved: false,
  }));
}

export const youtubeApi = {
  searchTracks,
  getStreamUrl,
  getTrack,
  getPlaylist,
  getTrending,
  getChannel,
  getCategories,
  wrapAsPagination,
  tracksToPlaylistItems,
};
