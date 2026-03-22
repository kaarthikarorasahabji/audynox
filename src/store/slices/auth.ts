import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Interfaces
import type { User } from '../../interfaces/user';

const initialState: { token?: string; playerLoaded: boolean; user?: User; requesting: boolean } = {
  user: undefined,
  requesting: false,
  playerLoaded: false,
  token: undefined,
};

// Auto-login: create a local user (no Spotify OAuth required)
export const initAuth = createAsyncThunk<{ token?: string; loaded: boolean }>(
  'auth/initAuth',
  async () => {
    // Create a local user for YouTube mode — no external auth needed
    return { token: 'youtube-local', loaded: true };
  }
);

export const loginToSpotify = createAsyncThunk<{ token?: string; loaded: boolean }>(
  'auth/loginToSpotify',
  async () => {
    // In YouTube mode, login is always successful
    return { token: 'youtube-local', loaded: true };
  }
);

export const fetchUser = createAsyncThunk('auth/fetchUser', async () => {
  // Return a local user profile
  return {
    id: 'local-user',
    display_name: 'You',
    email: '',
    images: [],
    product: 'free',
    type: 'user',
    uri: 'local:user:you',
    followers: { total: 0 },
    country: '',
    external_urls: { spotify: '' },
  } as unknown as User;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRequesting(state, action: PayloadAction<{ requesting: boolean }>) {
      state.requesting = action.payload.requesting;
    },
    setToken(state, action: PayloadAction<{ token?: string }>) {
      state.token = action.payload.token;
    },
    setPlayerLoaded(state, action: PayloadAction<{ playerLoaded: boolean }>) {
      state.playerLoaded = action.payload.playerLoaded;
    },
    logout(state) {
      state.token = undefined;
      state.user = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginToSpotify.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.requesting = false;
    });
    builder.addCase(initAuth.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.requesting = false;
      // Auto-set a local user
      if (!state.user) {
        state.user = {
          id: 'local-user',
          display_name: 'You',
          email: '',
          images: [],
          product: 'free',
          type: 'user',
          uri: 'local:user:you',
          followers: { total: 0 },
          country: '',
          external_urls: { spotify: '' },
        } as unknown as User;
      }
    });
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.requesting = false;
    });
  },
});

export const authActions = { ...authSlice.actions, loginToSpotify, initAuth, fetchUser };

export default authSlice.reducer;
