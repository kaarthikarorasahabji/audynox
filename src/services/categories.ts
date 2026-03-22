import axios from '../axios';

const fetchCategories = async (params: { limit?: number; offset?: number } = {}) => {
  return axios.get('/browse/categories', { params });
};

const fetchCategoryPlaylists = async (
  categoryId: string,
  params: { limit?: number; offset?: number } = {}
) => {
  return axios.get(`/browse/categories/${categoryId}/playlists`, { params });
};

const fetchCategory = async (categoryId: string) => {
  return axios.get(`/browse/categories/${categoryId}`);
};

export const categoriesService = {
  fetchCategories,
  fetchCategoryPlaylists,
  fetchCategory,
};
