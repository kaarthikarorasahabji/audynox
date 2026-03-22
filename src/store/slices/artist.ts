import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Services
import { artistService } from '../../services/artist';
import { userService } from '../../services/users';

// Interfaces
import type { Album } from '../../interfaces/albums';
import type { Artist } from '../../interfaces/artist';
import type { Track, TrackWithSave } from '../../interfaces/track';

const initialState: {
  albums: Album[];
  singles: Album[];
  appearsOn: Album[];
  compilations: Album[];

  otherArtists: Artist[];

  artist: Artist | null;
  topTracks: TrackWithSave[];

  loading: boolean;
  following: boolean;
} = {
  topTracks: [],
  albums: [],
  artist: null,
  otherArtists: [],

  loading: true,
  following: false,
  singles: [],
  appearsOn: [],
  compilations: [],
};

export const fetchArtist = createAsyncThunk<[Artist, boolean, TrackWithSave[], Album[][]], string>(
  'artist/fetchArtist',
  async (id) => {
    const [artistResp, topTracksResp, followingResp] = await Promise.all([
      artistService.fetchArtist(id),
      artistService.fetchArtistTopTracks(id),
      userService.checkFollowingArtists([id]).catch(() => ({ data: [false] })),
    ]);

    const artist = artistResp.data as Artist;
    const topTracks = topTracksResp.data.tracks as Track[];
    const following = followingResp.data[0] || false;

    // Check saved status
    let savedStatuses: boolean[] = [];
    if (topTracks.length > 0) {
      try {
        const ids = topTracks.map((t) => t.id);
        const savedResp = await userService.checkSavedTracks(ids);
        savedStatuses = savedResp.data;
      } catch {
        savedStatuses = topTracks.map(() => false);
      }
    }

    const itemsWithSave: TrackWithSave[] = topTracks.map((item, i) => ({
      ...item,
      saved: savedStatuses[i] || false,
    }));

    // Fetch albums by category
    const [albumsResp, singlesResp, appearsOnResp, compilationsResp] = await Promise.all([
      artistService.fetchArtistAlbums(id, { include_groups: 'album', limit: 50 }).catch(() => ({ data: { items: [] } })),
      artistService.fetchArtistAlbums(id, { include_groups: 'single', limit: 50 }).catch(() => ({ data: { items: [] } })),
      artistService.fetchArtistAlbums(id, { include_groups: 'appears_on', limit: 50 }).catch(() => ({ data: { items: [] } })),
      artistService.fetchArtistAlbums(id, { include_groups: 'compilation', limit: 50 }).catch(() => ({ data: { items: [] } })),
    ]);

    return [
      artist,
      following,
      itemsWithSave,
      [albumsResp.data.items, singlesResp.data.items, appearsOnResp.data.items, compilationsResp.data.items],
    ];
  }
);

const fetchOtherArtists = createAsyncThunk<Artist[], string>(
  'artist/fetchOtherArtists',
  async (id) => {
    try {
      const response = await artistService.fetchSimilarArtists(id);
      return response.data.artists as Artist[];
    } catch {
      return [];
    }
  }
);

const artistSlice = createSlice({
  name: 'artist',
  initialState,
  reducers: {
    setFollowing(state, action: PayloadAction<{ following: boolean }>) {
      state.following = action.payload.following;
    },
    setArtist(state, action: PayloadAction<{ artist: Artist | null }>) {
      state.artist = action.payload.artist;
      if (!action.payload.artist) {
        state.albums = [];
        state.singles = [];
        state.appearsOn = [];
        state.compilations = [];
        state.topTracks = [];
        state.following = false;
        state.loading = true;
        state.artist = null;
        state.otherArtists = [];
      }
    },
    setTopSongLikeState(state, action: PayloadAction<{ id: string; saved: boolean }>) {
      state.topTracks = state.topTracks.map((track) =>
        track.id === action.payload.id ? { ...track, saved: action.payload.saved } : track
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchArtist.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchArtist.fulfilled, (state, action) => {
      state.artist = action.payload[0];
      state.following = action.payload[1];
      state.topTracks = action.payload[2];
      state.albums = action.payload[3][0];
      state.singles = action.payload[3][1];
      state.appearsOn = action.payload[3][2];
      state.compilations = action.payload[3][3];
      state.loading = false;
    });
    builder.addCase(fetchOtherArtists.fulfilled, (state, action) => {
      state.otherArtists = action.payload;
    });
  },
});

export const artistActions = {
  fetchArtist,
  fetchOtherArtists,
  ...artistSlice.actions,
};

export default artistSlice.reducer;
