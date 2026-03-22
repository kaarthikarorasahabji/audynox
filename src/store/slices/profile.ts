import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Interface
import type { RootState } from '../store';
import type { User } from '../../interfaces/user';
import type { Track, TrackWithSave } from '../../interfaces/track';
import type { Artist } from '../../interfaces/artist';
import type { Playlist } from '../../interfaces/playlists';

// Services
import { userService } from '../../services/users';
import { playlistService } from '../../services/playlists';

const initialState: {
  user: User | null;
  artists: Artist[];
  following: boolean;
  playlists: Playlist[];
  songs: TrackWithSave[];
} = {
  songs: [],
  user: null,
  artists: [],
  playlists: [],
  following: false,
};

const fetchMyArtists = createAsyncThunk<Artist[], void>(
  'profile/fetchMyArtists',
  async () => {
    try {
      const response = await userService.fetchFollowedArtists({ limit: 50 });
      return response.data.artists?.items || [];
    } catch {
      return [];
    }
  }
);

const fetchPlaylists = createAsyncThunk<Playlist[], string>(
  'profile/fetchMyPlaylists',
  async (userId) => {
    try {
      const response = await playlistService.getPlaylists(userId, { limit: 50 });
      return response.data.items as Playlist[];
    } catch {
      return [];
    }
  }
);

const fetchMyTracks = createAsyncThunk<TrackWithSave[], void>(
  'profile/fetchMyTracks',
  async () => {
    try {
      const response = await userService.getSavedTracks({ limit: 50 });
      const items = response.data.items;
      const trackIds = items.map((item: any) => item.track.id);

      let savedStatuses: boolean[] = [];
      if (trackIds.length > 0) {
        try {
          const savedResp = await userService.checkSavedTracks(trackIds);
          savedStatuses = savedResp.data;
        } catch {
          savedStatuses = trackIds.map(() => true);
        }
      }

      return items.map((item: any, i: number) => ({
        ...item.track,
        saved: savedStatuses[i] ?? true,
      })) as TrackWithSave[];
    } catch {
      return [];
    }
  }
);

const fetchCurrentUserData = createAsyncThunk<[Artist[], TrackWithSave[]], void>(
  'profile/fetchCurrentUserData',
  async (_, api) => {
    const artists = await fetchMyArtists()(api.dispatch, api.getState, api.extra).unwrap();
    const tracks = await fetchMyTracks()(api.dispatch, api.getState, api.extra).unwrap();
    return [artists.slice(0, 10), tracks.slice(0, 10)];
  }
);

const fetchUser = createAsyncThunk<[User, Playlist[], boolean], string>(
  'profile/fetchUser',
  async (id, api) => {
    const { auth } = api.getState() as RootState;
    const currentUser = auth.user;

    if (currentUser && currentUser.id === id) {
      api.dispatch(fetchCurrentUserData());
    }

    let userData: User;
    try {
      const response = await userService.getUser(id);
      userData = response.data;
    } catch {
      userData = {
        id,
        display_name: currentUser?.id === id ? currentUser?.display_name : 'User',
        type: 'user',
      };
    }

    let playlists: Playlist[] = [];
    try {
      const response = await playlistService.getPlaylists(id, { limit: 50 });
      playlists = response.data.items;
    } catch {
      // ignore
    }

    let following = false;
    if (currentUser && currentUser.id !== id) {
      try {
        const response = await userService.checkFollowingUsers([id]);
        following = response.data[0] || false;
      } catch {
        // ignore
      }
    }

    return [userData, playlists, following];
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    removeUser: (state) => {
      state.user = null;
      state.following = false;
      state.playlists = [];
      state.artists = [];
      state.songs = [];
    },
    setLinkedStateForTrack: (state, action) => {
      state.songs = state.songs.map((track) => {
        if (track.id === action.payload.id) {
          return {
            ...track,
            saved: action.payload.saved,
          };
        }
        return track;
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      state.user = action.payload[0];
      state.playlists = action.payload[1];
      state.following = action.payload[2];
    });
    builder.addCase(fetchMyArtists.fulfilled, (state, action) => {
      state.artists = action.payload;
    });
    builder.addCase(fetchCurrentUserData.fulfilled, (state, action) => {
      state.artists = action.payload[0];
      state.songs = action.payload[1];
    });
    builder.addCase(fetchPlaylists.fulfilled, (state, action) => {
      state.playlists = action.payload.filter((p) => p.public);
    });
    builder.addCase(fetchMyTracks.fulfilled, (state, action) => {
      state.songs = action.payload;
    });
  },
});

export const profileActions = {
  fetchUser,
  fetchPlaylists,
  fetchMyArtists,
  fetchMyTracks,
  ...profileSlice.actions,
};

export default profileSlice.reducer;
