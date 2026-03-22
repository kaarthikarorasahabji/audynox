import axios from '../backendAxios';

const fetchNewRelases = async (_params: { limit?: number; offset?: number } = {}) => {
  return axios.get('/api/new-releases', { params: { limit: _params.limit || 20 } });
};

const fetchAlbum = async (id: string) => {
  return axios.get(`/api/album/${id}`);
};

const fetchAlbums = async (ids: string[]) => {
  const results = await Promise.all(ids.map((id) => axios.get(`/api/album/${id}`)));
  return { data: { albums: results.map((r) => r.data) } };
};

const fetchAlbumTracks = async (id: string, _params: { limit?: number; offset?: number } = {}) => {
  return axios.get(`/api/album/${id}/tracks`);
};

const fetchSavedAlbums = async (_params: { limit?: number; offset?: number } = {}) => {
  // Saved albums are stored locally in localStorage
  try {
    const albums = JSON.parse(localStorage.getItem('yt_saved_albums') || '[]');
    return { data: { items: albums.map((album: any) => ({ album })), total: albums.length } };
  } catch {
    return { data: { items: [], total: 0 } };
  }
};

const saveAlbums = async (ids: string[]) => {
  try {
    const saved = JSON.parse(localStorage.getItem('yt_saved_album_ids') || '[]');
    const updated = Array.from(new Set([...saved, ...ids]));
    localStorage.setItem('yt_saved_album_ids', JSON.stringify(updated));
  } catch {}
};

const deleteAlbums = async (ids: string[]) => {
  try {
    const saved = JSON.parse(localStorage.getItem('yt_saved_album_ids') || '[]');
    const updated = saved.filter((id: string) => !ids.includes(id));
    localStorage.setItem('yt_saved_album_ids', JSON.stringify(updated));
  } catch {}
};

export const albumsService = {
  fetchAlbum,
  fetchAlbums,
  fetchNewRelases,
  fetchSavedAlbums,
  fetchAlbumTracks,
  saveAlbums,
  deleteAlbums,
};
