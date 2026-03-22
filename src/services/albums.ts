import axios from '../axios';

const fetchNewRelases = async (params: { limit?: number; offset?: number } = {}) => {
  return axios.get('/browse/new-releases', { params });
};

const fetchAlbum = async (id: string) => {
  return axios.get(`/albums/${id}`);
};

const fetchAlbums = async (ids: string[]) => {
  return axios.get('/albums', { params: { ids: ids.join(',') } });
};

const fetchAlbumTracks = async (id: string, params: { limit?: number; offset?: number } = {}) => {
  return axios.get(`/albums/${id}/tracks`, { params });
};

const fetchSavedAlbums = async (params: { limit?: number; offset?: number } = {}) => {
  return axios.get('/me/albums', { params });
};

const saveAlbums = async (ids: string[]) => {
  return axios.put('/me/albums', { ids });
};

const deleteAlbums = async (ids: string[]) => {
  return axios.delete('/me/albums', { data: { ids } });
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
