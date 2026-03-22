import axios from '../axios';

export const querySearch = async (params: {
  q: string;
  type: string;
  market?: string;
  limit?: number;
  offset?: number;
}) => {
  return axios.get('/search', { params });
};
