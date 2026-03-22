// YouTube mode: user data is stored locally in localStorage

const fetchTopTracks = async (_params: { limit?: number; timeRange?: string }) => {
  // In YouTube mode, return empty — Home page uses YouTube API directly
  return { data: { items: [] } };
};

const fetchTopArtists = async (_params: { limit?: number; timeRange?: string }) => {
  return { data: { items: [] } };
};

const fetchFollowedArtists = async (_params: { limit?: number; offset?: number } = {}) => {
  return { data: { artists: { items: [] } } };
};

const fetchQueue = async () => {
  return { data: { queue: [] } };
};

const checkSavedTracks = async (ids: string[]) => {
  try {
    const liked = JSON.parse(localStorage.getItem('yt_liked_songs') || '[]');
    return { data: ids.map((id) => liked.includes(id)) };
  } catch {
    return { data: ids.map(() => false) };
  }
};

const saveTracks = async (ids: string[]) => {
  try {
    const liked = JSON.parse(localStorage.getItem('yt_liked_songs') || '[]');
    const updated = Array.from(new Set([...liked, ...ids]));
    localStorage.setItem('yt_liked_songs', JSON.stringify(updated));
  } catch {}
};

const deleteTracks = async (ids: string[]) => {
  try {
    const liked = JSON.parse(localStorage.getItem('yt_liked_songs') || '[]');
    const updated = liked.filter((id: string) => !ids.includes(id));
    localStorage.setItem('yt_liked_songs', JSON.stringify(updated));
  } catch {}
};

const checkFollowedPlaylist = async (_playlistId: string) => {
  return { data: [false] };
};

const checkFollowingArtists = async (ids: string[]) => {
  return { data: ids.map(() => false) };
};

const checkFollowingUsers = async (ids: string[]) => {
  return { data: ids.map(() => false) };
};

const getUser = async (id: string) => {
  return {
    data: {
      id,
      display_name: 'You',
      images: [],
      type: 'user',
      uri: `local:user:${id}`,
      followers: { href: null, total: 0 },
      external_urls: { spotify: '' },
    } as any,
  };
};

const unfollowPlaylist = async (_playlistId: string) => {};
const followPlaylist = async (_playlistId: string) => {};
const followArtists = async (_ids: string[]) => {};
const unfollowArtists = async (_ids: string[]) => {};
const followUsers = async (_ids: string[]) => {};
const unfollowUsers = async (_ids: string[]) => {};

const getSavedTracks = async (_params: { limit?: number; offset?: number } = {}) => {
  try {
    const likedIds = JSON.parse(localStorage.getItem('yt_liked_songs') || '[]');
    const allTracks = JSON.parse(localStorage.getItem('yt_liked_tracks_data') || '[]');
    return {
      data: {
        items: allTracks.map((track: any) => ({
          added_at: new Date().toISOString(),
          track,
        })),
        total: likedIds.length,
        limit: 50,
        offset: 0,
        next: null,
        previous: null,
      },
    };
  } catch {
    return { data: { items: [], total: 0, limit: 50, offset: 0, next: null, previous: null } };
  }
};

export const userService = {
  getUser,
  saveTracks,
  fetchQueue,
  deleteTracks,
  getSavedTracks,
  fetchTopArtists,
  fetchTopTracks,
  checkSavedTracks,
  followPlaylist,
  checkFollowingUsers,
  followUsers,
  unfollowUsers,
  fetchFollowedArtists,
  checkFollowedPlaylist,
  unfollowPlaylist,
  checkFollowingArtists,
  followArtists,
  unfollowArtists,
};
