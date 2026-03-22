import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Services
import { categoriesService } from '../../services/categories';

// Interfaces
import type { Playlist } from '../../interfaces/playlists';
import type { Category } from '../../interfaces/categories';

const initialState: {
  category: Category | null;
  playlists: Playlist[];
  loading: boolean;
} = {
  category: null,
  playlists: [],
  loading: true,
};

export const fetchGenre = createAsyncThunk<[Category, Playlist[]], string>(
  'genre/fetchGenre',
  async (id) => {
    const [categoryResp, playlistsResp] = await Promise.all([
      categoriesService.fetchCategory(id),
      categoriesService.fetchCategoryPlaylists(id, { limit: 50 }),
    ]);

    const category = categoryResp.data as Category;
    const playlists = playlistsResp.data.playlists?.items || [];

    return [category, playlists];
  }
);

const genreSlice = createSlice({
  name: 'genre',
  initialState,
  reducers: {
    setGenre: (state, action) => {
      state.category = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchGenre.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchGenre.fulfilled, (state, action) => {
      state.category = action.payload[0];
      state.playlists = action.payload[1];
      state.loading = false;
    });
  },
});

export const genreActions = {
  fetchGenre,
  ...genreSlice.actions,
};

export default genreSlice.reducer;
