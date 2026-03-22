import axios from '../axios';

const fetchArtist = async (id: string) => {
  return axios.get(`/artists/${id}`);
};

const fetchArtists = async (ids: string[]) => {
  return axios.get('/artists', { params: { ids: ids.join(',') } });
};

const fetchArtistAlbums = async (
  id: string,
  params: {
    limit?: number;
    offset?: number;
    include_groups?: string;
    market?: string;
  } = {}
) => {
  return axios.get(`/artists/${id}/albums`, { params });
};

const fetchArtistTopTracks = async (id: string) => {
  return axios.get(`/artists/${id}/top-tracks`, { params: { market: 'US' } });
};

const fetchSimilarArtists = async (id: string) => {
  return axios.get(`/artists/${id}/related-artists`);
};

export const artistService = {
  fetchArtist,
  fetchArtists,
  fetchArtistAlbums,
  fetchArtistTopTracks,
  fetchSimilarArtists,
};
