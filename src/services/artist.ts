import axios from '../backendAxios';

const fetchArtist = async (id: string) => {
  return axios.get(`/api/artist/${id}`);
};

const fetchArtists = async (ids: string[]) => {
  // Fetch multiple artists in parallel
  const results = await Promise.all(ids.map((id) => axios.get(`/api/artist/${id}`)));
  return { data: results.map((r) => r.data) };
};

const fetchArtistAlbums = async (
  id: string,
  _params: {
    limit?: number;
    offset?: number;
    include_groups?: string;
    market?: string;
  } = {}
) => {
  const resp = await axios.get(`/api/artist/${id}/albums`);
  // Return in Spotify-compatible shape based on include_groups
  const group = _params.include_groups || 'album';
  let items: any[] = [];
  if (group.includes('album')) items = items.concat(resp.data.albums || []);
  if (group.includes('single')) items = items.concat(resp.data.singles || []);
  if (group.includes('appears_on')) items = items.concat(resp.data.appearsOn || []);
  if (group.includes('compilation')) items = items.concat(resp.data.compilations || []);
  return { data: { items } };
};

const fetchArtistTopTracks = async (id: string) => {
  return axios.get(`/api/artist/${id}/top-tracks`);
};

const fetchSimilarArtists = async (id: string) => {
  return axios.get(`/api/artist/${id}/related`);
};

export const artistService = {
  fetchArtist,
  fetchArtists,
  fetchArtistAlbums,
  fetchArtistTopTracks,
  fetchSimilarArtists,
};
