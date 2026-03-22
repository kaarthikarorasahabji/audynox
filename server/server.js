require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { execFile } = require('child_process');
const YouTube = require('youtube-sr').default;

const app = express();
const PORT = process.env.PORT || 7860;
const JIOSAAVN_API = 'https://saavn.sumit.co/api';

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'capacitor://localhost',
      'http://localhost',
      'https://kaarthikdassarora-audynox.static.hf.space',
      'https://kaarthikdassarora-audynox.hf.space',
    ],
  })
);
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory cache – 10 minute TTL
// ---------------------------------------------------------------------------
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

// ---------------------------------------------------------------------------
// Helper: map JioSaavn song → Track-compatible shape
// ---------------------------------------------------------------------------
function mapJioSaavnSongToTrack(song) {
  const images = (song.image || []).map((img) => ({
    url: img.url || img.link || '',
    width: img.quality === '500x500' ? 500 : img.quality === '150x150' ? 150 : 50,
    height: img.quality === '500x500' ? 500 : img.quality === '150x150' ? 150 : 50,
  }));
  // Use the highest quality image
  const bestImage = images.length > 0 ? images[images.length - 1] : { url: '', width: 0, height: 0 };

  const artists = (song.artists?.primary || song.artists?.all || []).map((a) => ({
    id: a.id || '',
    name: a.name || '',
    type: 'artist',
    href: '',
    uri: `jiosaavn:artist:${a.id || ''}`,
    external_urls: { spotify: '' },
  }));

  // If no structured artists, fall back to the artist string
  if (artists.length === 0 && song.artist) {
    artists.push({
      id: '',
      name: song.artist,
      type: 'artist',
      href: '',
      uri: 'jiosaavn:artist:unknown',
      external_urls: { spotify: '' },
    });
  }

  const albumData = song.album || {};

  // Extract download URLs
  const downloadUrl = song.downloadUrl || [];

  return {
    id: song.id || '',
    videoId: null,
    name: song.name || song.title || '',
    artists,
    album: {
      id: albumData.id || song.id || '',
      name: albumData.name || song.album?.name || song.name || '',
      album_type: 'single',
      artists: [],
      available_markets: [],
      external_urls: { spotify: '' },
      href: '',
      images: images.length > 0 ? images : [bestImage],
      release_date: song.releaseDate || song.year || '',
      release_date_precision: 'day',
      total_tracks: 1,
      type: 'album',
      uri: `jiosaavn:album:${albumData.id || song.id || ''}`,
    },
    available_markets: [],
    disc_number: 1,
    duration_ms: (song.duration || 0) * 1000,
    explicit: song.explicitContent === 1 || song.explicitContent === true,
    external_ids: { isrc: '' },
    external_urls: { spotify: '' },
    href: '',
    is_local: false,
    is_playable: true,
    popularity: 0,
    preview_url: '',
    track_number: 1,
    type: 'track',
    uri: `jiosaavn:track:${song.id || ''}`,
    downloadUrl,
  };
}

// ---------------------------------------------------------------------------
// Helper: map youtube-sr Video → Track-compatible shape (fallback)
// ---------------------------------------------------------------------------
function mapYouTubeSrVideoToTrack(video) {
  const thumbnail =
    video.thumbnail?.url ||
    (video.thumbnails && video.thumbnails.length > 0 ? video.thumbnails[video.thumbnails.length - 1].url : '') ||
    '';
  const videoId = video.id || '';

  return {
    id: videoId,
    videoId: videoId,
    name: video.title || '',
    artists: [
      {
        id: video.channel?.id || '',
        name: video.channel?.name || '',
        type: 'artist',
        href: '',
        uri: `youtube:artist:${video.channel?.id || ''}`,
        external_urls: { spotify: '' },
      },
    ],
    album: {
      id: videoId,
      name: video.title || '',
      album_type: 'single',
      artists: [],
      available_markets: [],
      external_urls: { spotify: '' },
      href: '',
      images: [{ url: thumbnail, width: 480, height: 360 }],
      release_date: video.uploadedAt || '',
      release_date_precision: 'day',
      total_tracks: 1,
      type: 'album',
      uri: `youtube:album:${videoId}`,
    },
    available_markets: [],
    disc_number: 1,
    duration_ms: video.duration || 0,
    explicit: false,
    external_ids: { isrc: '' },
    external_urls: { spotify: '' },
    href: '',
    is_local: false,
    is_playable: true,
    popularity: 0,
    preview_url: '',
    track_number: 1,
    type: 'track',
    uri: `youtube:track:${videoId}`,
    downloadUrl: null,
  };
}

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ---------------------------------------------------------------------------
// GET /api/search?q=&maxResults=20
// Primary: JioSaavn, Fallback: youtube-sr
// ---------------------------------------------------------------------------
app.get('/api/search', async (req, res) => {
  try {
    const { q, maxResults = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

    const cacheKey = `search:${q}:${maxResults}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    let result = [];

    // Try JioSaavn first
    try {
      const resp = await axios.get(`${JIOSAAVN_API}/search/songs`, {
        params: { query: q, limit: Number(maxResults) },
        timeout: 8000,
      });

      const songs = resp.data?.data?.results || resp.data?.results || [];
      if (songs.length > 0) {
        result = songs.map(mapJioSaavnSongToTrack);
      }
    } catch (e) {
      console.warn('JioSaavn search failed, trying youtube-sr fallback:', e.message);
    }

    // Fallback to youtube-sr if JioSaavn returned no results
    if (result.length === 0) {
      try {
        const videos = await YouTube.search(String(q), {
          type: 'video',
          limit: Number(maxResults),
        });
        result = videos.map(mapYouTubeSrVideoToTrack);
      } catch (e) {
        console.error('youtube-sr fallback also failed:', e.message);
      }
    }

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/trending?maxResults=20
// ---------------------------------------------------------------------------
app.get('/api/trending', async (req, res) => {
  try {
    const { maxResults = 20 } = req.query;
    const cacheKey = `trending:${maxResults}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    let result = [];

    // Use JioSaavn search for trending songs
    try {
      const resp = await axios.get(`${JIOSAAVN_API}/search/songs`, {
        params: { query: 'trending punjabi songs', limit: Number(maxResults) },
        timeout: 8000,
      });
      const songs = resp.data?.data?.results || resp.data?.results || [];
      result = songs.map(mapJioSaavnSongToTrack);
    } catch (e) {
      console.warn('JioSaavn trending failed:', e.message);
    }

    // Fallback
    if (result.length === 0) {
      try {
        const videos = await YouTube.search('trending punjabi songs 2026', {
          type: 'video',
          limit: Number(maxResults),
        });
        result = videos.map(mapYouTubeSrVideoToTrack);
      } catch (e) {
        console.error('youtube-sr trending fallback failed:', e.message);
      }
    }

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Trending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stream-url/:videoId — kept for YouTube fallback
// ---------------------------------------------------------------------------
app.get('/api/stream-url/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const cacheKey = `stream:${videoId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const result = await new Promise((resolve, reject) => {
      execFile(
        'python',
        ['-m', 'yt_dlp', '-f', 'bestaudio[vcodec=none]/bestaudio', '--dump-json', '--no-playlist', url],
        { timeout: 30000 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          try {
            const json = JSON.parse(stdout);
            resolve({
              url: json.url,
              duration: (json.duration || 0) * 1000,
              title: json.title || '',
              thumbnail: json.thumbnail || '',
            });
          } catch (parseErr) {
            reject(new Error('Failed to parse yt-dlp output'));
          }
        }
      );
    });

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Stream URL error:', err.message);
    res.status(502).json({ error: 'Failed to extract stream URL', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/track/:id
// JioSaavn IDs (alphanumeric, ~8 chars) or YouTube videoId (11 chars)
// ---------------------------------------------------------------------------
app.get('/api/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `track:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Heuristic: YouTube videoIds are exactly 11 chars with base64-like characters
    const isYouTubeId = /^[a-zA-Z0-9_-]{11}$/.test(id);

    if (!isYouTubeId) {
      // Try JioSaavn first
      try {
        const resp = await axios.get(`${JIOSAAVN_API}/songs/${id}`, { timeout: 8000 });
        const songs = resp.data?.data || [resp.data];
        if (songs.length > 0 && songs[0]?.id) {
          const result = mapJioSaavnSongToTrack(songs[0]);
          setCached(cacheKey, result);
          return res.json(result);
        }
      } catch (e) {
        console.warn('JioSaavn track fetch failed:', e.message);
      }
    }

    // Fallback: YouTube via yt-dlp metadata
    const url = `https://www.youtube.com/watch?v=${id}`;
    const result = await new Promise((resolve, reject) => {
      execFile(
        'python',
        ['-m', 'yt_dlp', '--dump-json', '--no-playlist', url],
        { timeout: 30000 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          try {
            const json = JSON.parse(stdout);
            resolve({
              id: json.id,
              videoId: json.id,
              name: json.title || '',
              artists: [
                {
                  id: json.channel_id || '',
                  name: json.channel || json.uploader || '',
                  type: 'artist',
                  href: '',
                  uri: `youtube:artist:${json.channel_id || ''}`,
                  external_urls: { spotify: '' },
                },
              ],
              album: {
                id: json.id,
                name: json.title || '',
                album_type: 'single',
                artists: [],
                available_markets: [],
                external_urls: { spotify: '' },
                href: '',
                images: [{ url: json.thumbnail || '', width: 480, height: 360 }],
                release_date: json.upload_date || '',
                release_date_precision: 'day',
                total_tracks: 1,
                type: 'album',
                uri: `youtube:album:${json.id}`,
              },
              available_markets: [],
              disc_number: 1,
              duration_ms: (json.duration || 0) * 1000,
              explicit: false,
              external_ids: { isrc: '' },
              external_urls: { spotify: '' },
              href: '',
              is_local: false,
              is_playable: true,
              popularity: 0,
              preview_url: '',
              track_number: 1,
              type: 'track',
              uri: `youtube:track:${json.id}`,
              downloadUrl: null,
            });
          } catch (parseErr) {
            reject(new Error('Failed to parse yt-dlp output'));
          }
        }
      );
    });

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Track error:', err.message);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/playlist/:playlistId
// ---------------------------------------------------------------------------
app.get('/api/playlist/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const cacheKey = `playlist:${playlistId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Try JioSaavn playlist
    try {
      const resp = await axios.get(`${JIOSAAVN_API}/playlists`, {
        params: { id: playlistId },
        timeout: 10000,
      });

      const plData = resp.data?.data || resp.data;
      if (plData && plData.songs && plData.songs.length > 0) {
        const tracks = plData.songs.map(mapJioSaavnSongToTrack);
        const images = (plData.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));

        const result = {
          playlist: {
            id: playlistId,
            name: plData.name || '',
            description: plData.description || '',
            collaborative: false,
            public: true,
            snapshot_id: '',
            href: '',
            type: 'playlist',
            uri: `jiosaavn:playlist:${playlistId}`,
            external_urls: { spotify: '' },
            followers: { href: '', total: plData.followerCount || 0 },
            images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
            owner: {
              id: 'jiosaavn',
              display_name: plData.subtitle || 'JioSaavn',
              type: 'user',
            },
            tracks: { href: '', total: tracks.length },
          },
          tracks: tracks.map((track) => ({
            added_at: new Date().toISOString(),
            added_by: { id: 'jiosaavn', display_name: 'JioSaavn', type: 'user' },
            is_local: false,
            primary_color: '',
            track,
            saved: false,
          })),
        };

        setCached(cacheKey, result);
        return res.json(result);
      }
    } catch (e) {
      console.warn('JioSaavn playlist failed:', e.message);
    }

    res.status(404).json({ error: 'Playlist not found' });
  } catch (err) {
    console.error('Playlist error:', err.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/channel/:channelId (artist)
// ---------------------------------------------------------------------------
app.get('/api/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const cacheKey = `channel:${channelId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Try JioSaavn artist
    try {
      const resp = await axios.get(`${JIOSAAVN_API}/artists/${channelId}`, {
        timeout: 8000,
      });

      const artistData = resp.data?.data || resp.data;
      if (artistData && artistData.name) {
        const images = (artistData.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));

        const topSongs = (artistData.topSongs || []).map(mapJioSaavnSongToTrack);

        const result = {
          artist: {
            id: channelId,
            name: artistData.name || '',
            type: 'artist',
            href: '',
            uri: `jiosaavn:artist:${channelId}`,
            external_urls: { spotify: '' },
            followers: { href: '', total: artistData.followerCount || 0 },
            genres: [],
            images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
            popularity: 0,
          },
          topTracks: topSongs,
        };

        setCached(cacheKey, result);
        return res.json(result);
      }
    } catch (e) {
      console.warn('JioSaavn artist failed:', e.message);
    }

    // Fallback: youtube-sr search for artist content
    try {
      const videos = await YouTube.search(channelId + ' songs', {
        type: 'video',
        limit: 20,
      });

      const topTracks = videos.map(mapYouTubeSrVideoToTrack);

      const result = {
        artist: {
          id: channelId,
          name: channelId,
          type: 'artist',
          href: '',
          uri: `youtube:artist:${channelId}`,
          external_urls: { spotify: '' },
          followers: { href: '', total: 0 },
          genres: [],
          images: topTracks[0]?.album?.images || [{ url: '', width: 0, height: 0 }],
          popularity: 0,
        },
        topTracks,
      };

      setCached(cacheKey, result);
      res.json(result);
    } catch (e) {
      console.error('youtube-sr artist fallback failed:', e.message);
      res.status(404).json({ error: 'Artist not found' });
    }
  } catch (err) {
    console.error('Channel error:', err.message);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suggestions/:songId — related songs from JioSaavn
// ---------------------------------------------------------------------------
app.get('/api/suggestions/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const cacheKey = `suggestions:${songId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/songs/${songId}/suggestions`, {
        timeout: 8000,
      });
      const songs = resp.data?.data || resp.data || [];
      const result = (Array.isArray(songs) ? songs : []).map(mapJioSaavnSongToTrack);
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn suggestions failed:', e.message);
    }

    res.json([]);
  } catch (err) {
    console.error('Suggestions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/song-url/:songId — get best quality download URL from JioSaavn
// ---------------------------------------------------------------------------
app.get('/api/song-url/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    const cacheKey = `songurl:${songId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const resp = await axios.get(`${JIOSAAVN_API}/songs/${songId}`, { timeout: 8000 });
    const songs = resp.data?.data || [resp.data];
    const song = songs[0];

    if (!song || !song.downloadUrl || song.downloadUrl.length === 0) {
      return res.status(404).json({ error: 'No download URL available' });
    }

    // Pick the best quality (last entry is typically highest quality — 320kbps)
    const urls = song.downloadUrl;
    const best = urls[urls.length - 1];

    const result = {
      url: best.url || best.link || '',
      quality: best.quality || '320kbps',
      allQualities: urls,
    };

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Song URL error:', err.message);
    res.status(500).json({ error: 'Failed to get song URL' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/artist/:id — full artist details
// ---------------------------------------------------------------------------
app.get('/api/artist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `artist:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/artists/${id}`, { timeout: 8000 });
      const a = resp.data?.data || resp.data;
      if (a && a.name) {
        const images = (a.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : img.quality === '150x150' ? 150 : 50,
          height: img.quality === '500x500' ? 500 : img.quality === '150x150' ? 150 : 50,
        }));
        const result = {
          id: a.id || id,
          name: a.name || '',
          type: 'artist',
          href: '',
          uri: `jiosaavn:artist:${a.id || id}`,
          external_urls: { spotify: '' },
          followers: { href: '', total: a.followerCount || a.fanCount || 0 },
          genres: [],
          images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
          popularity: 0,
          bio: a.bio || a.dominantLanguage || '',
        };
        setCached(cacheKey, result);
        return res.json(result);
      }
    } catch (e) {
      console.warn('JioSaavn artist detail failed:', e.message);
    }

    // Fallback: search YouTube for the artist
    try {
      const videos = await YouTube.search(id + ' official', { type: 'video', limit: 1 });
      const v = videos[0];
      const result = {
        id,
        name: v?.channel?.name || id,
        type: 'artist',
        href: '',
        uri: `youtube:artist:${id}`,
        external_urls: { spotify: '' },
        followers: { href: '', total: 0 },
        genres: [],
        images: v?.thumbnail ? [{ url: v.thumbnail.url, width: 480, height: 360 }] : [],
        popularity: 0,
      };
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('YouTube artist fallback failed:', e.message);
    }

    res.status(404).json({ error: 'Artist not found' });
  } catch (err) {
    console.error('Artist detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch artist' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/artist/:id/top-tracks — artist top tracks
// ---------------------------------------------------------------------------
app.get('/api/artist/:id/top-tracks', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `artist-top:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/artists/${id}`, { timeout: 8000 });
      const a = resp.data?.data || resp.data;
      const tracks = (a?.topSongs || []).map(mapJioSaavnSongToTrack);
      setCached(cacheKey, { tracks });
      return res.json({ tracks });
    } catch (e) {
      console.warn('JioSaavn artist top tracks failed:', e.message);
    }

    // Fallback
    try {
      const videos = await YouTube.search(id + ' songs', { type: 'video', limit: 20 });
      const tracks = videos.map(mapYouTubeSrVideoToTrack);
      setCached(cacheKey, { tracks });
      return res.json({ tracks });
    } catch (e) {
      console.warn('YouTube top tracks fallback failed:', e.message);
    }

    res.json({ tracks: [] });
  } catch (err) {
    console.error('Artist top tracks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/artist/:id/albums — artist albums/singles/compilations
// ---------------------------------------------------------------------------
app.get('/api/artist/:id/albums', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `artist-albums:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/artists/${id}`, { timeout: 8000 });
      const a = resp.data?.data || resp.data;

      const mapAlbum = (alb) => {
        const imgs = (alb.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));
        return {
          id: alb.id || '',
          name: alb.name || alb.title || '',
          album_type: alb.type === 'single' ? 'single' : 'album',
          artists: [{ id: a.id || id, name: a.name || '', type: 'artist' }],
          available_markets: [],
          external_urls: { spotify: '' },
          href: '',
          images: imgs.length > 0 ? imgs : [{ url: '', width: 0, height: 0 }],
          release_date: alb.year || alb.releaseDate || '',
          release_date_precision: 'year',
          total_tracks: alb.songCount || 1,
          type: 'album',
          uri: `jiosaavn:album:${alb.id || ''}`,
        };
      };

      const topAlbums = (a?.topAlbums || []).map(mapAlbum);
      const singles = (a?.singles || []).map(mapAlbum);

      const result = {
        albums: topAlbums,
        singles,
        appearsOn: [],
        compilations: [],
      };

      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn artist albums failed:', e.message);
    }

    res.json({ albums: [], singles: [], appearsOn: [], compilations: [] });
  } catch (err) {
    console.error('Artist albums error:', err.message);
    res.status(500).json({ error: 'Failed to fetch artist albums' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/artist/:id/related — similar artists
// ---------------------------------------------------------------------------
app.get('/api/artist/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `artist-related:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/artists/${id}`, { timeout: 8000 });
      const a = resp.data?.data || resp.data;
      const similar = (a?.similarArtists || []).map((sa) => {
        const imgs = (sa.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));
        return {
          id: sa.id || '',
          name: sa.name || '',
          type: 'artist',
          href: '',
          uri: `jiosaavn:artist:${sa.id || ''}`,
          external_urls: { spotify: '' },
          followers: { href: '', total: 0 },
          genres: [],
          images: imgs.length > 0 ? imgs : [{ url: '', width: 0, height: 0 }],
          popularity: 0,
        };
      });
      setCached(cacheKey, { artists: similar });
      return res.json({ artists: similar });
    } catch (e) {
      console.warn('JioSaavn similar artists failed:', e.message);
    }

    res.json({ artists: [] });
  } catch (err) {
    console.error('Related artists error:', err.message);
    res.status(500).json({ error: 'Failed to fetch related artists' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/album/:id — album details
// ---------------------------------------------------------------------------
app.get('/api/album/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `album:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/albums`, {
        params: { id },
        timeout: 8000,
      });
      const alb = resp.data?.data || resp.data;
      if (alb && (alb.name || alb.title)) {
        const images = (alb.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : img.quality === '150x150' ? 150 : 50,
          height: img.quality === '500x500' ? 500 : img.quality === '150x150' ? 150 : 50,
        }));
        const artists = (alb.artists?.primary || alb.artists?.all || []).map((ar) => ({
          id: ar.id || '',
          name: ar.name || '',
          type: 'artist',
          href: '',
          uri: `jiosaavn:artist:${ar.id || ''}`,
          external_urls: { spotify: '' },
        }));
        const tracks = (alb.songs || []).map(mapJioSaavnSongToTrack);

        const result = {
          id: alb.id || id,
          name: alb.name || alb.title || '',
          album_type: alb.type || 'album',
          artists,
          available_markets: [],
          copyrights: [],
          external_ids: {},
          external_urls: { spotify: '' },
          genres: [],
          href: '',
          images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
          label: alb.label || '',
          popularity: 0,
          release_date: alb.year || alb.releaseDate || '',
          release_date_precision: 'year',
          total_tracks: tracks.length,
          type: 'album',
          uri: `jiosaavn:album:${alb.id || id}`,
          tracks: {
            href: '',
            items: tracks,
            limit: tracks.length,
            offset: 0,
            total: tracks.length,
            next: null,
            previous: null,
          },
        };

        setCached(cacheKey, result);
        return res.json(result);
      }
    } catch (e) {
      console.warn('JioSaavn album fetch failed:', e.message);
    }

    res.status(404).json({ error: 'Album not found' });
  } catch (err) {
    console.error('Album detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/album/:id/tracks — album tracks
// ---------------------------------------------------------------------------
app.get('/api/album/:id/tracks', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `album-tracks:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/albums`, {
        params: { id },
        timeout: 8000,
      });
      const alb = resp.data?.data || resp.data;
      const tracks = (alb?.songs || []).map(mapJioSaavnSongToTrack);
      const result = {
        href: '',
        items: tracks,
        limit: tracks.length,
        offset: 0,
        total: tracks.length,
        next: null,
        previous: null,
      };
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn album tracks failed:', e.message);
    }

    res.json({ href: '', items: [], limit: 0, offset: 0, total: 0, next: null, previous: null });
  } catch (err) {
    console.error('Album tracks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch album tracks' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/new-releases — new album releases (JioSaavn trending albums)
// ---------------------------------------------------------------------------
app.get('/api/new-releases', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const cacheKey = `new-releases:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/search/albums`, {
        params: { query: 'new releases 2026', limit: Number(limit) },
        timeout: 8000,
      });
      const albums = (resp.data?.data?.results || resp.data?.results || []).map((alb) => {
        const images = (alb.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));
        const artists = (alb.artists?.primary || alb.artists?.all || []).map((ar) => ({
          id: ar.id || '', name: ar.name || '', type: 'artist',
        }));
        return {
          id: alb.id || '',
          name: alb.name || alb.title || '',
          album_type: 'album',
          artists,
          images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
          release_date: alb.year || '',
          total_tracks: alb.songCount || 0,
          type: 'album',
          uri: `jiosaavn:album:${alb.id || ''}`,
          external_urls: { spotify: '' },
          href: '',
        };
      });
      const result = { albums: { items: albums, total: albums.length } };
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn new releases failed:', e.message);
    }

    res.json({ albums: { items: [], total: 0 } });
  } catch (err) {
    console.error('New releases error:', err.message);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/featured-playlists — featured/editorial playlists
// ---------------------------------------------------------------------------
app.get('/api/featured-playlists', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const cacheKey = `featured-playlists:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/search/playlists`, {
        params: { query: 'top playlists hindi punjabi', limit: Number(limit) },
        timeout: 8000,
      });
      const playlists = (resp.data?.data?.results || resp.data?.results || []).map((pl) => {
        const images = (pl.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));
        return {
          id: pl.id || '',
          name: pl.name || pl.title || '',
          description: pl.description || '',
          collaborative: false,
          public: true,
          snapshot_id: '',
          href: '',
          type: 'playlist',
          uri: `jiosaavn:playlist:${pl.id || ''}`,
          external_urls: { spotify: '' },
          followers: { href: '', total: pl.followerCount || 0 },
          images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
          owner: { id: 'jiosaavn', display_name: pl.subtitle || 'JioSaavn', type: 'user' },
          tracks: { href: '', total: pl.songCount || 0 },
        };
      });
      const result = { playlists: { items: playlists, total: playlists.length } };
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn featured playlists failed:', e.message);
    }

    res.json({ playlists: { items: [], total: 0 } });
  } catch (err) {
    console.error('Featured playlists error:', err.message);
    res.status(500).json({ error: 'Failed to fetch featured playlists' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/category/:id/playlists — playlists for a genre category
// ---------------------------------------------------------------------------
app.get('/api/category/:id/playlists', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;
    const cacheKey = `cat-playlists:${id}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
      const resp = await axios.get(`${JIOSAAVN_API}/search/playlists`, {
        params: { query: `${id} songs playlist`, limit: Number(limit) },
        timeout: 8000,
      });
      const playlists = (resp.data?.data?.results || resp.data?.results || []).map((pl) => {
        const images = (pl.image || []).map((img) => ({
          url: img.url || img.link || '',
          width: img.quality === '500x500' ? 500 : 150,
          height: img.quality === '500x500' ? 500 : 150,
        }));
        return {
          id: pl.id || '',
          name: pl.name || pl.title || '',
          description: pl.description || '',
          collaborative: false,
          public: true,
          snapshot_id: '',
          href: '',
          type: 'playlist',
          uri: `jiosaavn:playlist:${pl.id || ''}`,
          external_urls: { spotify: '' },
          followers: { href: '', total: pl.followerCount || 0 },
          images: images.length > 0 ? images : [{ url: '', width: 0, height: 0 }],
          owner: { id: 'jiosaavn', display_name: pl.subtitle || 'JioSaavn', type: 'user' },
          tracks: { href: '', total: pl.songCount || 0 },
        };
      });
      const result = { playlists: { items: playlists, total: playlists.length } };
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn category playlists failed:', e.message);
    }

    res.json({ playlists: { items: [], total: 0 } });
  } catch (err) {
    console.error('Category playlists error:', err.message);
    res.status(500).json({ error: 'Failed to fetch category playlists' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/recommendations — song recommendations based on seed tracks
// ---------------------------------------------------------------------------
app.get('/api/recommendations', async (req, res) => {
  try {
    const { seed_tracks = '', limit = 10 } = req.query;
    const seeds = String(seed_tracks).split(',').filter(Boolean);
    if (seeds.length === 0) return res.json({ tracks: [] });

    const cacheKey = `recs:${seeds.join(',')}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Use suggestions for the first seed track
    try {
      const resp = await axios.get(`${JIOSAAVN_API}/songs/${seeds[0]}/suggestions`, { timeout: 8000 });
      const songs = resp.data?.data || resp.data || [];
      const tracks = (Array.isArray(songs) ? songs : []).slice(0, Number(limit)).map(mapJioSaavnSongToTrack);
      const result = { tracks };
      setCached(cacheKey, result);
      return res.json(result);
    } catch (e) {
      console.warn('JioSaavn recommendations failed:', e.message);
    }

    res.json({ tracks: [] });
  } catch (err) {
    console.error('Recommendations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/categories
// ---------------------------------------------------------------------------
app.get('/api/categories', (_req, res) => {
  const categories = [
    { id: 'pop', name: 'Pop', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'rock', name: 'Rock', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'hiphop', name: 'Hip Hop', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'rnb', name: 'R&B', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'electronic', name: 'Electronic', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'classical', name: 'Classical', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'jazz', name: 'Jazz', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'country', name: 'Country', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'latin', name: 'Latin', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'kpop', name: 'K-Pop', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'indie', name: 'Indie', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'metal', name: 'Metal', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'lofi', name: 'Lo-Fi', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'reggaeton', name: 'Reggaeton', icons: [{ url: '', width: 274, height: 274 }], href: '' },
    { id: 'ambient', name: 'Ambient', icons: [{ url: '', width: 274, height: 274 }], href: '' },
  ];
  res.json({ categories: { items: categories, total: categories.length, limit: 50, offset: 0, href: '', next: null, previous: null } });
});

// ---------------------------------------------------------------------------
// GET /api/audio/:videoId — proxy the audio stream (YouTube fallback)
// ---------------------------------------------------------------------------
app.get('/api/audio/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    // Get stream URL (uses cache if available)
    const cacheKey = `stream:${videoId}`;
    let streamData = getCached(cacheKey);

    if (!streamData) {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      streamData = await new Promise((resolve, reject) => {
        execFile(
          'python',
          ['-m', 'yt_dlp', '-f', 'bestaudio[vcodec=none]/bestaudio', '--dump-json', '--no-playlist', url],
          { timeout: 30000 },
          (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            try {
              const json = JSON.parse(stdout);
              resolve({
                url: json.url,
                duration: (json.duration || 0) * 1000,
                title: json.title || '',
                thumbnail: json.thumbnail || '',
              });
            } catch (parseErr) {
              reject(new Error('Failed to parse yt-dlp output'));
            }
          }
        );
      });
      setCached(cacheKey, streamData);
    }

    // Pipe the audio stream through our server
    const range = req.headers.range;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.youtube.com/',
    };
    if (range) headers['Range'] = range;

    const audioResp = await axios.get(streamData.url, {
      responseType: 'stream',
      headers,
      timeout: 30000,
    });

    // Forward relevant headers
    res.setHeader('Content-Type', audioResp.headers['content-type'] || 'audio/webm');
    if (audioResp.headers['content-length']) res.setHeader('Content-Length', audioResp.headers['content-length']);
    if (audioResp.headers['content-range']) res.setHeader('Content-Range', audioResp.headers['content-range']);
    if (audioResp.headers['accept-ranges']) res.setHeader('Accept-Ranges', audioResp.headers['accept-ranges']);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(audioResp.status);

    audioResp.data.pipe(res);
  } catch (err) {
    console.error('Audio proxy error:', err.message);
    res.status(502).json({ error: 'Failed to stream audio' });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Audynox server running on port ${PORT}`);
});
