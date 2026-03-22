import axios from '../backendAxios';

export const querySearch = async (params: {
  q: string;
  type: string;
  market?: string;
  limit?: number;
  offset?: number;
}) => {
  const resp = await axios.get('/api/search', {
    params: { q: params.q, maxResults: params.limit || 20 },
  });
  // Wrap in Spotify-compatible shape
  const tracks = resp.data || [];
  return {
    data: {
      tracks: {
        items: tracks,
        total: tracks.length,
        limit: params.limit || 20,
        offset: params.offset || 0,
        next: null,
        previous: null,
      },
    },
  };
};
