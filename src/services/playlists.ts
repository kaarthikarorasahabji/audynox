import axios from '../axios';

const getPlaylist = async (playlistId: string) => {
  return axios.get(`/playlists/${playlistId}`);
};

const getPlaylistItems = async (
  playlistId: string,
  params: { limit?: number; offset?: number; fields?: string } = { limit: 50 }
) => {
  return axios.get(`/playlists/${playlistId}/tracks`, { params });
};

const getMyPlaylists = async (params: { limit?: number; offset?: number } = {}) => {
  return axios.get('/me/playlists', { params });
};

const getFeaturedPlaylists = async (params: { limit?: number; locale?: string } = {}) => {
  return axios.get('/browse/featured-playlists', { params });
};

const addPlaylistItems = async (
  playlistId: string,
  uris: string[],
  _snapshot_id: string
) => {
  return axios.post(`/playlists/${playlistId}/tracks`, { uris });
};

const removePlaylistItems = async (
  playlistId: string,
  uris: string[],
  snapshot_id: string
) => {
  return axios.delete(`/playlists/${playlistId}/tracks`, {
    data: { tracks: uris.map((uri) => ({ uri })), snapshot_id },
  });
};

const reorderPlaylistItems = async (
  playlistId: string,
  _uris: string[],
  rangeStart: number,
  insertBefore: number,
  rangeLength: number,
  snapshotId: string
) => {
  return axios.put(`/playlists/${playlistId}/tracks`, {
    range_start: rangeStart,
    insert_before: insertBefore,
    range_length: rangeLength,
    snapshot_id: snapshotId,
  });
};

const changePlaylistDetails = async (
  playlistId: string,
  data: { name?: string; public?: boolean; collaborative?: boolean; description?: string }
) => {
  return axios.put(`/playlists/${playlistId}`, data);
};

const changePlaylistImage = async (playlistId: string, _image: string, content: string) => {
  return axios.put(`/playlists/${playlistId}/images`, content, {
    headers: { 'Content-Type': 'image/jpeg' },
  });
};

const createPlaylist = async (
  userId: string,
  data: { name: string; public?: boolean; collaborative?: boolean; description?: string }
) => {
  return axios.post(`/users/${userId}/playlists`, data);
};

const getRecommendations = async (params: {
  seed_artists?: string;
  seed_genres?: string;
  limit?: number;
  seed_tracks?: string;
}) => {
  return axios.get('/recommendations', { params });
};

const getPlaylists = async (
  userId: string,
  params: { limit?: number; offset?: number }
) => {
  return axios.get(`/users/${userId}/playlists`, { params });
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
