import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// YouTube API
import { searchTracks } from '../../services/youtubeApi';

// Interfaces
import type { Album } from '../../interfaces/albums';
import type { Artist } from '../../interfaces/artist';
import type { Playlist } from '../../interfaces/playlists';
import type { Track, TrackWithSave } from '../../interfaces/track';
import { RootState } from '../store';

type Item = Playlist | Album | Track | Artist;

export type SearchSection = 'ALL' | 'ARTISTS' | 'TRACKS' | 'ALBUMS' | 'PLAYLISTS';

const initialState: {
  top: Item | null;
  songs: TrackWithSave[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  loading: boolean;
  section: SearchSection;
  songsTotal: number;
} = {
  playlists: [],
  songs: [],
  artists: [],
  albums: [],
  top: null,
  loading: true,
  section: 'ALL',
  songsTotal: 0,
};

// Extract unique artists from tracks
function extractArtists(tracks: Track[]): Artist[] {
  const seen = new Set<string>();
  const artists: Artist[] = [];
  for (const track of tracks) {
    for (const a of track.artists || []) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        artists.push({
          id: a.id,
          name: a.name,
          type: 'artist',
          uri: a.uri || `youtube:artist:${a.id}`,
          images: track.album?.images || [],
          genres: [],
          followers: { total: 0 },
          popularity: 0,
          href: '',
          external_urls: { spotify: '' },
        } as unknown as Artist);
      }
    }
  }
  return artists;
}

// Extract unique albums from tracks
function extractAlbums(tracks: Track[]): Album[] {
  const seen = new Set<string>();
  const albums: Album[] = [];
  for (const track of tracks) {
    if (track.album && !seen.has(track.album.id)) {
      seen.add(track.album.id);
      albums.push(track.album);
    }
  }
  return albums;
}

const fetchArtists = createAsyncThunk<Artist[], string>('search/fetchArtists', async (query) => {
  const tracks = await searchTracks(query, 20);
  return extractArtists(tracks);
});

const fetchAlbums = createAsyncThunk<Album[], string>('search/fetchAlbums', async (query) => {
  const tracks = await searchTracks(query, 20);
  return extractAlbums(tracks);
});

const fetchPlaylists = createAsyncThunk<Playlist[], string>(
  'search/fetchPlaylists',
  async (_query) => {
    // YouTube doesn't have playlists in the same way, return empty
    return [];
  }
);

const fetchSongs = createAsyncThunk<[TrackWithSave[], number], string>(
  'search/fetchSongs',
  async (query) => {
    const tracks = await searchTracks(query, 50);
    const items: TrackWithSave[] = tracks.map((track) => ({
      ...track,
      saved: false,
    }));
    return [items, items.length];
  }
);

const fetchMoreSongs = createAsyncThunk<TrackWithSave[], string>(
  'search/fetchMoreSongs',
  async (query, { getState }) => {
    const state = getState() as RootState;
    const { songs } = state.search;
    // YouTube API doesn't support offset pagination well, just search with more results
    const tracks = await searchTracks(query, songs.length + 50);
    return tracks.slice(songs.length).map((track) => ({
      ...track,
      saved: false,
    }));
  }
);

export const fetchSearch = createAsyncThunk<
  [Item, [TrackWithSave[], number], Artist[], Album[], Playlist[]],
  string
>('search/fetchSearch', async (query) => {
  const tracks = await searchTracks(query, 20);

  const tracksWithSaves: TrackWithSave[] = tracks.map((track) => ({
    ...track,
    saved: false,
  }));

  const artists = extractArtists(tracks);
  const albums = extractAlbums(tracks);

  // Use the first artist or track as top item
  const topItem: Item = artists[0] || tracks[0] || null;

  return [topItem, [tracksWithSaves, tracksWithSaves.length], artists, albums, []];
});

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSection(state, action: PayloadAction<SearchSection>) {
      state.section = action.payload;
    },
    setSavedStateForTrack(
      state,
      action: PayloadAction<{
        id: string;
        saved: boolean;
      }>
    ) {
      const track = state.songs.find((t) => t.id === action.payload.id);
      if (track) {
        track.saved = action.payload.saved;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchSearch.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchSearch.fulfilled, (state, action) => {
      state.top = action.payload[0];

      state.songs = action.payload[1][0];
      state.songsTotal = action.payload[1][1];

      state.artists = action.payload[2];
      state.albums = action.payload[3];
      state.playlists = action.payload[4];
      state.loading = false;
    });
    builder.addCase(fetchSearch.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(fetchArtists.fulfilled, (state, action) => {
      state.artists = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchAlbums.fulfilled, (state, action) => {
      state.albums = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchPlaylists.fulfilled, (state, action) => {
      state.playlists = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchSongs.fulfilled, (state, action) => {
      state.songs = action.payload[0];
      state.songsTotal = action.payload[1];
      state.loading = false;
    });
    builder.addCase(fetchMoreSongs.fulfilled, (state, action) => {
      state.songs = [...state.songs, ...action.payload];
      state.loading = false;
    });
  },
});

export const searchActions = {
  fetchSearch,
  fetchArtists,
  fetchAlbums,
  fetchPlaylists,
  fetchMoreSongs,
  fetchSongs,
  ...searchSlice.actions,
};

export default searchSlice.reducer;
