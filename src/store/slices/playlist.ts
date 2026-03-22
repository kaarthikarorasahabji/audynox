import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Services
import { playlistService } from '../../services/playlists';
import { userService } from '../../services/users';

// Interfaces
import type { RootState } from '../store';
import type { User } from '../../interfaces/user';
import type { Track } from '../../interfaces/track';
import type { Playlist, PlaylistItem, PlaylistItemWithSaved } from '../../interfaces/playlists';

const initialState: {
  user: User | null;
  recommedations: Track[];
  tracks: PlaylistItemWithSaved[];
  playlist: Playlist | null;

  loading: boolean;
  canEdit: boolean;
  following: boolean;

  order: string;
  view: 'LIST' | 'COMPACT';
} = {
  user: null,
  tracks: [],
  playlist: null,
  recommedations: [],

  loading: true,
  canEdit: false,
  following: false,

  order: 'ALL',
  view: 'LIST',
};

export const fetchPlaylist = createAsyncThunk<
  [Playlist, PlaylistItemWithSaved[], boolean, boolean, User, Track[]],
  string
>('playlist/fetchPlaylist', async (id, { getState }) => {
  const { auth } = getState() as RootState;
  const { user } = auth;

  const [playlistResp, itemsResp] = await Promise.all([
    playlistService.getPlaylist(id),
    playlistService.getPlaylistItems(id),
  ]);

  const playlist = playlistResp.data as Playlist;
  const items = itemsResp.data.items as PlaylistItem[];

  // Check if user follows this playlist
  let following = false;
  try {
    const followResp = await userService.checkFollowedPlaylist(id);
    following = followResp.data[0] || false;
  } catch {
    // ignore
  }

  const canEdit = user?.id === playlist.owner?.id;

  // Check saved status of tracks
  const trackIds = items.filter((i) => i.track?.id).map((i) => i.track.id);
  let savedStatuses: boolean[] = [];
  if (trackIds.length > 0) {
    try {
      // Spotify API limits to 50 IDs at a time
      const batches: string[][] = [];
      for (let i = 0; i < trackIds.length; i += 50) {
        batches.push(trackIds.slice(i, i + 50));
      }
      const results = await Promise.all(batches.map((ids) => userService.checkSavedTracks(ids)));
      savedStatuses = results.flatMap((r) => r.data);
    } catch {
      savedStatuses = trackIds.map(() => false);
    }
  }

  const owner: User = playlist.owner || ({
    id: 'unknown',
    display_name: 'Unknown',
    type: 'user',
  } as any);

  const itemsWithSave: PlaylistItemWithSaved[] = items.map((item, i) => ({
    ...item,
    saved: savedStatuses[i] || false,
  }));

  // Fetch recommendations based on playlist tracks
  let recommendations: Track[] = [];
  try {
    const seedTracks = trackIds.slice(0, 5).join(',');
    if (seedTracks) {
      const recResp = await playlistService.getRecommendations({ seed_tracks: seedTracks, limit: 10 });
      recommendations = recResp.data.tracks || [];
    }
  } catch {
    // ignore
  }

  return [playlist, itemsWithSave, following, canEdit, owner, recommendations];
});

export const refreshTracks = createAsyncThunk<PlaylistItemWithSaved[], string>(
  'playlist/refreshTracks',
  async (id) => {
    try {
      const { data } = await playlistService.getPlaylistItems(id);
      const trackIds = data.items.filter((i: any) => i.track?.id).map((i: any) => i.track.id);

      let savedStatuses: boolean[] = [];
      if (trackIds.length > 0) {
        try {
          const batches: string[][] = [];
          for (let i = 0; i < trackIds.length; i += 50) {
            batches.push(trackIds.slice(i, i + 50));
          }
          const results = await Promise.all(batches.map((ids) => userService.checkSavedTracks(ids)));
          savedStatuses = results.flatMap((r) => r.data);
        } catch {
          savedStatuses = trackIds.map(() => false);
        }
      }

      return data.items.map((item: any, i: number) => ({
        ...item,
        saved: savedStatuses[i] || false,
      }));
    } catch (error) {
      console.log(error);
      return [];
    }
  }
);

export const getNextTracks = createAsyncThunk<PlaylistItemWithSaved[]>(
  'playlist/getNextTracks',
  async (_params, { getState }) => {
    const { playlist, tracks } = (getState() as RootState).playlist;

    const { data } = await playlistService.getPlaylistItems(playlist!.id, {
      offset: tracks.length,
      limit: 50,
    });

    const trackIds = data.items.filter((i: any) => i.track?.id).map((i: any) => i.track.id);
    let savedStatuses: boolean[] = [];
    if (trackIds.length > 0) {
      try {
        const batches: string[][] = [];
        for (let i = 0; i < trackIds.length; i += 50) {
          batches.push(trackIds.slice(i, i + 50));
        }
        const results = await Promise.all(batches.map((ids) => userService.checkSavedTracks(ids)));
        savedStatuses = results.flatMap((r) => r.data);
      } catch {
        savedStatuses = trackIds.map(() => false);
      }
    }

    return data.items.map((item: any, i: number) => ({
      ...item,
      saved: savedStatuses[i] || false,
    }));
  }
);

export const refreshPlaylist = createAsyncThunk<Playlist, string>(
  'playlist/refreshPlaylist',
  async (id) => {
    const { data } = await playlistService.getPlaylist(id);
    return data;
  }
);

const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    setPlaylist(state, action: PayloadAction<{ playlist: Playlist | null }>) {
      state.playlist = action.payload.playlist;
      if (!action.payload.playlist) {
        state.tracks = [];
        state.following = false;
        state.canEdit = false;
        state.user = null;
        state.loading = true;
        state.view = 'LIST';
      }
    },
    removeTrack(state, action: PayloadAction<{ id: string }>) {
      state.tracks = state.tracks.filter((track) => track.track.id !== action.payload.id);
    },
    setTrackLikeState(state, action: PayloadAction<{ id: string; saved: boolean }>) {
      state.tracks = state.tracks.map((track) =>
        track.track.id === action.payload.id ? { ...track, saved: action.payload.saved } : track
      );
    },
    setView(state, action: PayloadAction<{ view: 'LIST' | 'COMPACT' }>) {
      state.view = action.payload.view;
    },
    setOrder(state, action: PayloadAction<{ order: string }>) {
      state.order = action.payload.order;
    },
    reorderTracks(state, action: PayloadAction<{ from: number; to: number }>) {
      const tracks = [...state.tracks];
      const [track] = tracks.splice(action.payload.from, 1);
      tracks.splice(action.payload.to, 0, track);
      state.tracks = tracks;
    },
    resetOrder(state, action: PayloadAction<{ order?: string }>) {
      state.order = action.payload.order || 'ALL';
    },
    removeTrackFromRecommendations(state, action: PayloadAction<{ id: string }>) {
      state.recommedations = state.recommedations.filter((track) => track.id !== action.payload.id);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPlaylist.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchPlaylist.fulfilled, (state, action) => {
      state.playlist = action.payload[0];
      state.tracks = action.payload[1];
      state.following = action.payload[2];
      state.canEdit = action.payload[3];
      state.user = action.payload[4];
      state.recommedations = action.payload[5];
      state.loading = false;
    });
    builder.addCase(refreshTracks.fulfilled, (state, action) => {
      state.tracks = action.payload;
    });
    builder.addCase(refreshPlaylist.fulfilled, (state, action: PayloadAction<Playlist>) => {
      state.playlist = action.payload;
    });
    builder.addCase(getNextTracks.fulfilled, (state, action) => {
      state.tracks = [...state.tracks, ...action.payload];
    });
  },
});

export const playlistActions = {
  fetchPlaylist,
  refreshTracks,
  getNextTracks,
  refreshPlaylist,
  ...playlistSlice.actions,
};

export default playlistSlice.reducer;
