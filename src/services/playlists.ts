import axios from '../backendAxios';

const getPlaylist = async (playlistId: string) => {
  const resp = await axios.get(`/api/playlist/${playlistId}`);
  // Return playlist in Spotify-compatible shape
  return { data: resp.data.playlist || resp.data };
};

const getPlaylistItems = async (
  playlistId: string,
  params: { limit?: number; offset?: number; fields?: string } = { limit: 50 }
) => {
  const resp = await axios.get(`/api/playlist/${playlistId}`);
  const tracks = resp.data.tracks || [];
  const offset = params.offset || 0;
  const limit = params.limit || 50;
  const sliced = tracks.slice(offset, offset + limit);
  return {
    data: {
      items: sliced,
      total: tracks.length,
      limit,
      offset,
      next: offset + limit < tracks.length ? 'more' : null,
      previous: null,
    },
  };
};

const getMyPlaylists = async (_params: { limit?: number; offset?: number } = {}) => {
  // Local playlists stored in localStorage
  try {
    const playlists = JSON.parse(localStorage.getItem('yt_my_playlists') || '[]');
    return { data: { items: playlists, total: playlists.length } };
  } catch {
    return { data: { items: [], total: 0 } };
  }
};

const getFeaturedPlaylists = async (params: { limit?: number; locale?: string } = {}) => {
  return axios.get('/api/featured-playlists', { params: { limit: params.limit || 20 } });
};

const addPlaylistItems = async (
  playlistId: string,
  uris: string[],
  _snapshot_id: string
) => {
  // Local playlist management
  try {
    const playlists = JSON.parse(localStorage.getItem('yt_my_playlists') || '[]');
    const pl = playlists.find((p: any) => p.id === playlistId);
    if (pl) {
      pl.trackUris = [...(pl.trackUris || []), ...uris];
      localStorage.setItem('yt_my_playlists', JSON.stringify(playlists));
    }
  } catch {}
  return { data: { snapshot_id: '' } };
};

const removePlaylistItems = async (
  playlistId: string,
  uris: string[],
  _snapshot_id: string
) => {
  try {
    const playlists = JSON.parse(localStorage.getItem('yt_my_playlists') || '[]');
    const pl = playlists.find((p: any) => p.id === playlistId);
    if (pl) {
      pl.trackUris = (pl.trackUris || []).filter((u: string) => !uris.includes(u));
      localStorage.setItem('yt_my_playlists', JSON.stringify(playlists));
    }
  } catch {}
  return { data: { snapshot_id: '' } };
};

const reorderPlaylistItems = async (
  _playlistId: string,
  _uris: string[],
  _rangeStart: number,
  _insertBefore: number,
  _rangeLength: number,
  _snapshotId: string
) => {
  return { data: { snapshot_id: '' } };
};

const changePlaylistDetails = async (
  _playlistId: string,
  _data: { name?: string; public?: boolean; collaborative?: boolean; description?: string }
) => {
  return { data: {} };
};

const changePlaylistImage = async (_playlistId: string, _image: string, _content: string) => {
  return { data: {} };
};

const createPlaylist = async (
  _userId: string,
  data: { name: string; public?: boolean; collaborative?: boolean; description?: string }
): Promise<{ data: any }> => {
  try {
    const playlists = JSON.parse(localStorage.getItem('yt_my_playlists') || '[]');
    const ts = Date.now();
    const newPlaylist = {
      id: `local-${ts}`,
      name: data.name,
      description: data.description || '',
      collaborative: data.collaborative || false,
      public: data.public ?? true,
      snapshot_id: '',
      href: '',
      type: 'playlist' as const,
      uri: `local:playlist:local-${ts}`,
      external_urls: { spotify: '' },
      followers: { href: '', total: 0 },
      images: [] as any[],
      owner: { id: 'local-user', display_name: 'You', type: 'user' },
      tracks: { href: '', total: 0 },
      trackUris: [] as string[],
    };
    playlists.push(newPlaylist);
    localStorage.setItem('yt_my_playlists', JSON.stringify(playlists));
    return { data: newPlaylist };
  } catch {
    return { data: { id: '', snapshot_id: '' } };
  }
};

const getRecommendations = async (params: {
  seed_artists?: string;
  seed_genres?: string;
  limit?: number;
  seed_tracks?: string;
}) => {
  return axios.get('/api/recommendations', { params });
};

const getPlaylists = async (
  _userId: string,
  _params: { limit?: number; offset?: number }
) => {
  // Return local playlists for the user
  try {
    const playlists = JSON.parse(localStorage.getItem('yt_my_playlists') || '[]');
    return { data: { items: playlists, total: playlists.length } };
  } catch {
    return { data: { items: [], total: 0 } };
  }
};

export const playlistService = {
  getPlaylist,
  getPlaylists,
  getMyPlaylists,
  createPlaylist,
  getPlaylistItems,
  addPlaylistItems,
  getRecommendations,
  changePlaylistImage,
  removePlaylistItems,
  getFeaturedPlaylists,
  reorderPlaylistItems,
  changePlaylistDetails,
};
