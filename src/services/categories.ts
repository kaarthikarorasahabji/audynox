import axios from '../backendAxios';

const fetchCategories = async (_params: { limit?: number; offset?: number } = {}) => {
  return axios.get('/api/categories');
};

const fetchCategoryPlaylists = async (
  categoryId: string,
  params: { limit?: number; offset?: number } = {}
) => {
  return axios.get(`/api/category/${categoryId}/playlists`, { params });
};

const fetchCategory = async (categoryId: string) => {
  // Categories are static on the backend, return a constructed object
  const categoriesResp = await axios.get('/api/categories');
  const cat = categoriesResp.data.categories.items.find((c: any) => c.id === categoryId);
  return { data: cat || { id: categoryId, name: categoryId, icons: [], href: '' } };
};

export const categoriesService = {
  fetchCategories,
  fetchCategoryPlaylists,
  fetchCategory,
};
