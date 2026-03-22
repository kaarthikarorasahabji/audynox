import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// YouTube API
import { searchTracks, getTrending, wrapAsPagination, tracksToPlaylistItems } from '../../services/youtubeApi';

// Interfaces
import type { Track } from '../../interfaces/track';
import type { Album } from '../../interfaces/albums';
import type { Artist } from '../../interfaces/artist';
import type { Playlist } from '../../interfaces/playlists';

const initialState: {
  topTracks: Track[];
  newReleases: Album[];
  madeForYou: Playlist[];
  featurePlaylists: Playlist[];
  rankings: Playlist[];
  trending: Playlist[];
  recentlyPlayed: (Track | Artist | Album)[];
  section: 'ALL' | 'MUSIC' | 'PODCAST';
} = {
  trending: [],
  rankings: [],
  topTracks: [],
  section: 'ALL',
  madeForYou: [],
  newReleases: [],
  recentlyPlayed: [],
  featurePlaylists: [],
};

// Helper: wrap YouTube tracks as a mock Playlist for display
function tracksToPlaylist(tracks: Track[], name: string, id: string): Playlist {
  return {
    id,
    name,
    description: '',
    href: '',
    uri: `youtube:playlist:${id}`,
    type: 'playlist',
    collaborative: false,
    public: true,
    images: tracks[0]?.album?.images || [],
    owner: { id: 'youtube', display_name: 'YouTube Music', type: 'user' } as any,
    tracks: { total: tracks.length, href: '' },
    snapshot_id: '',
    external_urls: { spotify: '' },
    primary_color: '',
  } as unknown as Playlist;
}

export const fetchTrending = createAsyncThunk('home/fetchTrending', async () => {
  try {
    const tracks = await getTrending(20);
    // Create mock playlists from trending tracks (groups of 5)
    const playlists: Playlist[] = [];
    for (let i = 0; i < tracks.length; i += 5) {
      const group = tracks.slice(i, i + 5);
      if (group.length > 0) {
        playlists.push(tracksToPlaylist(group, `Trending ${Math.floor(i / 5) + 1}`, `trending-${i}`));
      }
    }
    return playlists;
  } catch {
    return [];
  }
});

export const fetchTopTracks = createAsyncThunk('home/fetchTopTracks', async () => {
  try {
    const tracks = await getTrending(10);
    return tracks;
  } catch {
    return [];
  }
});

export const fetchNewReleases = createAsyncThunk('home/fetchNewReleases', async () => {
  try {
    const tracks = await searchTracks('new music 2025', 10);
    // Convert tracks to Album-like objects for display
    const albums: Album[] = tracks.map((t) => t.album).filter(Boolean);
    const seen = new Set<string>();
    return albums.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  } catch {
    return [];
  }
});

export const fetchMadeForYou = createAsyncThunk('home/fetchMadeForYou', async () => {
  try {
    const tracks = await searchTracks('popular music mix', 10);
    return [tracksToPlaylist(tracks, 'Your Mix', 'made-for-you-1')];
  } catch {
    return [];
  }
});

export const fetchRanking = createAsyncThunk('home/fetchRanking', async () => {
  try {
    const tracks = await getTrending(10);
    return [tracksToPlaylist(tracks, 'Top Charts', 'ranking-1')];
  } catch {
    return [];
  }
});

export const fetchRecentlyPlayed = createAsyncThunk('home/fetchRecentlyPlayed', async () => {
  try {
    const recent = JSON.parse(localStorage.getItem('yt_recently_played') || '[]');
    return recent.slice(0, 20) as (Track | Artist | Album)[];
  } catch {
    return [] as (Track | Artist | Album)[];
  }
});

export const fecthFeaturedPlaylists = createAsyncThunk(
  'home/fecthFeaturedPlaylists',
  async () => {
    try {
      const tracks = await getTrending(20);
      const playlists: Playlist[] = [];
      for (let i = 0; i < tracks.length; i += 5) {
        const group = tracks.slice(i, i + 5);
        if (group.length > 0) {
          playlists.push(tracksToPlaylist(group, `Featured ${Math.floor(i / 5) + 1}`, `featured-${i}`));
        }
      }
      return playlists;
    } catch {
      return [];
    }
  }
);

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setSection(state, action: PayloadAction<'ALL' | 'MUSIC' | 'PODCAST'>) {
      state.section = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNewReleases.fulfilled, (state, action) => {
      state.newReleases = action.payload as any as any[];
    });
    builder.addCase(fetchTopTracks.fulfilled, (state, action) => {
      state.topTracks = action.payload;
    });
    builder.addCase(fecthFeaturedPlaylists.fulfilled, (state, action) => {
      state.featurePlaylists = action.payload;
    });
    builder.addCase(fetchMadeForYou.fulfilled, (state, action) => {
      state.madeForYou = action.payload;
    });
    builder.addCase(fetchRecentlyPlayed.fulfilled, (state, action) => {
      state.recentlyPlayed = action.payload;
    });
    builder.addCase(fetchRanking.fulfilled, (state, action) => {
      state.rankings = action.payload;
    });
    builder.addCase(fetchTrending.fulfilled, (state, action) => {
      state.trending = action.payload;
    });
  },
});

export const homeActions = {
  ...homeSlice.actions,
  fetchRanking,
  fetchTrending,
  fetchTopTracks,
  fetchMadeForYou,
  fetchNewReleases,
  fetchRecentlyPlayed,
  fecthFeaturedPlaylists,
};

export default homeSlice.reducer;
