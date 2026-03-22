import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Services
import { albumsService } from '../../services/albums';
import { artistService } from '../../services/artist';
import { userService } from '../../services/users';

// Interfaces
import type { Album, AlbumFullObject } from '../../interfaces/albums';
import type { Artist } from '../../interfaces/artist';
import type { Track, TrackWithSave } from '../../interfaces/track';

const initialState: {
  artist: Artist | null;
  tracks: TrackWithSave[];
  album: AlbumFullObject | null;

  otherAlbums: Album[];

  loading: boolean;
  following: boolean;

  order: string;
  view: 'LIST' | 'COMPACT';
} = {
  tracks: [],
  album: null,
  artist: null,
  otherAlbums: [],

  loading: true,
  following: false,

  order: 'ALL',
  view: 'LIST',
};

export const fetchAlbum = createAsyncThunk<
  [AlbumFullObject, TrackWithSave[], boolean, Artist, Album[]],
  string
>('album/fetchAlbum', async (id) => {
  const albumResp = await albumsService.fetchAlbum(id);
  const album = albumResp.data as AlbumFullObject;

  const tracksResp = await albumsService.fetchAlbumTracks(id, { limit: 50 });
  const items = tracksResp.data.items as Track[];

  // Check saved status via Spotify API
  let savedStatuses: boolean[] = [];
  if (items.length > 0) {
    try {
      const ids = items.map((t) => t.id);
      const batches: string[][] = [];
      for (let i = 0; i < ids.length; i += 50) {
        batches.push(ids.slice(i, i + 50));
      }
      const results = await Promise.all(batches.map((b) => userService.checkSavedTracks(b)));
      savedStatuses = results.flatMap((r) => r.data);
    } catch {
      savedStatuses = items.map(() => false);
    }
  }

  const itemsWithSave: TrackWithSave[] = items.map((item, i) => ({
    ...item,
    saved: savedStatuses[i] || false,
  }));

  // Get artist info
  let artist: Artist = {
    id: album.artists?.[0]?.id || '',
    name: album.artists?.[0]?.name || '',
    type: 'artist',
    href: '',
    uri: `spotify:artist:${album.artists?.[0]?.id || ''}`,
    external_urls: { spotify: '' },
    followers: { href: '', total: 0 },
    genres: [],
    images: album.images || [],
    popularity: 0,
  };

  try {
    if (album.artists?.[0]?.id) {
      const artistResp = await artistService.fetchArtist(album.artists[0].id);
      artist = artistResp.data;
    }
  } catch {
    // Use fallback artist
  }

  // Get other albums by this artist
  let otherAlbums: Album[] = [];
  try {
    if (album.artists?.[0]?.id) {
      const otherResp = await artistService.fetchArtistAlbums(album.artists[0].id, {
        include_groups: 'album,single',
        limit: 10,
      });
      otherAlbums = otherResp.data.items.filter((a: Album) => a.id !== id);
    }
  } catch {
    // ignore
  }

  return [album, itemsWithSave, false, artist, otherAlbums];
});

const albumSlice = createSlice({
  name: 'album',
  initialState,
  reducers: {
    setFollowing(state, action: PayloadAction<{ following: boolean }>) {
      state.following = action.payload.following;
    },
    setAlbum(state, action: PayloadAction<{ album: AlbumFullObject | null }>) {
      state.album = action.payload.album;
      if (!action.payload.album) {
        state.tracks = [];
        state.following = false;
        state.loading = true;
        state.artist = null;
        state.view = 'LIST';
      }
    },
    setView(state, action: PayloadAction<{ view: 'LIST' | 'COMPACT' }>) {
      state.view = action.payload.view;
    },
    setOrder(state, action: PayloadAction<{ order: string }>) {
      state.order = action.payload.order;
    },
    updateTrackLikeState(state, action: PayloadAction<{ id: string; saved: boolean }>) {
      const index = state.tracks.findIndex((track) => track.id === action.payload.id);
      if (index !== -1) {
        state.tracks[index].saved = action.payload.saved;
      }
    },
    resetOrder(state, action: PayloadAction<{ order?: string }>) {
      state.order = action.payload.order || 'ALL';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAlbum.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchAlbum.fulfilled, (state, action) => {
      state.album = action.payload[0];
      state.tracks = action.payload[1];
      state.artist = action.payload[3];
      state.following = action.payload[2];
      state.otherAlbums = action.payload[4];
      state.loading = false;
    });
  },
});

export const albumActions = {
  fetchAlbum,
  ...albumSlice.actions,
};

export default albumSlice.reducer;
