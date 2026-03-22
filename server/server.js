require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 7860;
const YT_API_KEY = process.env.YT_API_KEY || 'AIzaSyARfdd8i0s8Az-weM2gohTBx4Pr6SiGiSo';
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// ---------------------------------------------------------------------------
// Spotify token cache (Client Credentials flow)
// ---------------------------------------------------------------------------
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
  try {
    const resp = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        },
      }
    );
    spotifyToken = resp.data.access_token;
    spotifyTokenExpiry = Date.now() + (resp.data.expires_in - 60) * 1000;
    return spotifyToken;
  } catch (err) {
    console.error('Spotify token error:', err.response?.data || err.message);
    return null;
  }
}

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
// In-memory cache – 30 minute TTL
// ---------------------------------------------------------------------------
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
// Helper: parse ISO 8601 duration to milliseconds
// ---------------------------------------------------------------------------
function parseDuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return (h * 3600 + m * 60 + s) * 1000;
}

// ---------------------------------------------------------------------------
// Helper: map YouTube video item → Track-compatible shape
// ---------------------------------------------------------------------------
function mapVideoToTrack(video) {
  const snippet = video.snippet || {};
  const contentDetails = video.contentDetails || {};
  const videoId = typeof video.id === 'object' ? video.id.videoId : video.id;
  const thumbnail =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    '';

  return {
    id: videoId,
    videoId: videoId,
    name: snippet.title || '',
    artists: [
      {
        id: snippet.channelId || '',
        name: snippet.channelTitle || '',
        type: 'artist',
        href: '',
        uri: `youtube:artist:${snippet.channelId || ''}`,
        external_urls: { spotify: '' },
      },
    ],
    album: {
      id: videoId,
      name: snippet.title || '',
      album_type: 'single',
      artists: [],
      available_markets: [],
      external_urls: { spotify: '' },
      href: '',
      images: [{ url: thumbnail, width: 480, height: 360 }],
      release_date: snippet.publishedAt ? snippet.publishedAt.split('T')[0] : '',
      release_date_precision: 'day',
      total_tracks: 1,
      type: 'album',
      uri: `youtube:album:${videoId}`,
    },
    available_markets: [],
    disc_number: 1,
    duration_ms: parseDuration(contentDetails.duration),
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
  };
}

// ---------------------------------------------------------------------------
// Helper: map YouTube playlist item → Track-compatible shape
// ---------------------------------------------------------------------------
function mapPlaylistItemToTrack(item) {
  const snippet = item.snippet || {};
  const videoId = snippet.resourceId?.videoId || '';
  const thumbnail =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    '';

  return {
    id: videoId,
    videoId: videoId,
    name: snippet.title || '',
    artists: [
      {
        id: snippet.channelId || '',
        name: snippet.channelTitle || '',
        type: 'artist',
        href: '',
        uri: `youtube:artist:${snippet.channelId || ''}`,
        external_urls: { spotify: '' },
      },
    ],
    album: {
      id: videoId,
      name: snippet.title || '',
      album_type: 'single',
      artists: [],
      available_markets: [],
      external_urls: { spotify: '' },
      href: '',
      images: [{ url: thumbnail, width: 480, height: 360 }],
      release_date: snippet.publishedAt ? snippet.publishedAt.split('T')[0] : '',
      release_date_precision: 'day',
      total_tracks: 1,
      type: 'album',
      uri: `youtube:album:${videoId}`,
    },
    available_markets: [],
    disc_number: 1,
    duration_ms: 0,
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
// ---------------------------------------------------------------------------
app.get('/api/search', async (req, res) => {
  try {
    const { q, maxResults = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

    const cacheKey = `search:${q}:${maxResults}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Step 1: search for video IDs
    const searchResp = await axios.get(`${YT_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q,
        type: 'video',
        videoCategoryId: '10',
        regionCode: 'IN',
        maxResults: Number(maxResults),
        key: YT_API_KEY,
      },
    });

    const videoIds = searchResp.data.items
      .map((item) => item.id.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      const result = [];
      setCached(cacheKey, result);
      return res.json(result);
    }

    // Step 2: get full video details (for duration)
    const detailsResp = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails',
        id: videoIds.join(','),
        key: YT_API_KEY,
      },
    });

    const result = detailsResp.data.items.map(mapVideoToTrack);
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Search error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stream-url/:videoId
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
// GET /api/track/:videoId
// ---------------------------------------------------------------------------
app.get('/api/track/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const cacheKey = `track:${videoId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const resp = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YT_API_KEY,
      },
    });

    if (!resp.data.items || resp.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const result = mapVideoToTrack(resp.data.items[0]);
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Track error:', err.response?.data || err.message);
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

    // Get playlist metadata
    const playlistResp = await axios.get(`${YT_API_BASE}/playlists`, {
      params: {
        part: 'snippet,contentDetails',
        id: playlistId,
        key: YT_API_KEY,
      },
    });

    const playlistData = playlistResp.data.items?.[0];
    if (!playlistData) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Get all playlist items with pagination
    const allItems = [];
    let nextPageToken = null;

    do {
      const itemsResp = await axios.get(`${YT_API_BASE}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: 50,
          pageToken: nextPageToken || undefined,
          key: YT_API_KEY,
        },
      });

      allItems.push(...itemsResp.data.items);
      nextPageToken = itemsResp.data.nextPageToken;
    } while (nextPageToken);

    // Get video durations for all items
    const videoIds = allItems
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    const tracks = [];
    // Fetch details in batches of 50
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const detailsResp = await axios.get(`${YT_API_BASE}/videos`, {
        params: {
          part: 'snippet,contentDetails',
          id: batch.join(','),
          key: YT_API_KEY,
        },
      });
      tracks.push(...detailsResp.data.items.map(mapVideoToTrack));
    }

    const pSnippet = playlistData.snippet || {};
    const thumbnail =
      pSnippet.thumbnails?.high?.url ||
      pSnippet.thumbnails?.medium?.url ||
      pSnippet.thumbnails?.default?.url ||
      '';

    const result = {
      playlist: {
        id: playlistId,
        name: pSnippet.title || '',
        description: pSnippet.description || '',
        collaborative: false,
        public: true,
        snapshot_id: '',
        href: '',
        type: 'playlist',
        uri: `youtube:playlist:${playlistId}`,
        external_urls: { spotify: '' },
        followers: { href: '', total: 0 },
        images: [{ url: thumbnail, width: 480, height: 360 }],
        owner: {
          id: pSnippet.channelId || '',
          display_name: pSnippet.channelTitle || '',
          type: 'user',
        },
        tracks: { href: '', total: tracks.length },
      },
      tracks: tracks.map((track, index) => ({
        added_at: allItems[index]?.snippet?.publishedAt || new Date().toISOString(),
        added_by: {
          id: pSnippet.channelId || '',
          display_name: pSnippet.channelTitle || '',
          type: 'user',
        },
        is_local: false,
        primary_color: '',
        track,
        saved: false,
      })),
    };

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Playlist error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/trending
// ---------------------------------------------------------------------------
app.get('/api/trending', async (req, res) => {
  try {
    const { maxResults = 20 } = req.query;
    const cacheKey = `trending:${maxResults}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const resp = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails',
        chart: 'mostPopular',
        videoCategoryId: '10',
        regionCode: 'IN',
        maxResults: Number(maxResults),
        key: YT_API_KEY,
      },
    });

    const result = resp.data.items.map(mapVideoToTrack);
    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Trending error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/channel/:channelId
// ---------------------------------------------------------------------------
app.get('/api/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const cacheKey = `channel:${channelId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [channelResp, videosResp] = await Promise.all([
      axios.get(`${YT_API_BASE}/channels`, {
        params: {
          part: 'snippet,statistics,brandingSettings',
          id: channelId,
          key: YT_API_KEY,
        },
      }),
      axios.get(`${YT_API_BASE}/search`, {
        params: {
          part: 'snippet',
          channelId,
          type: 'video',
          order: 'viewCount',
          maxResults: 20,
          key: YT_API_KEY,
        },
      }),
    ]);

    const channel = channelResp.data.items?.[0];
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const cSnippet = channel.snippet || {};
    const stats = channel.statistics || {};
    const thumbnail =
      cSnippet.thumbnails?.high?.url ||
      cSnippet.thumbnails?.medium?.url ||
      cSnippet.thumbnails?.default?.url ||
      '';

    // Get video details for duration
    const videoIds = videosResp.data.items
      .map((item) => item.id.videoId)
      .filter(Boolean);

    let topTracks = [];
    if (videoIds.length > 0) {
      const detailsResp = await axios.get(`${YT_API_BASE}/videos`, {
        params: {
          part: 'snippet,contentDetails',
          id: videoIds.join(','),
          key: YT_API_KEY,
        },
      });
      topTracks = detailsResp.data.items.map(mapVideoToTrack);
    }

    const result = {
      artist: {
        id: channelId,
        name: cSnippet.title || '',
        type: 'artist',
        href: '',
        uri: `youtube:artist:${channelId}`,
        external_urls: { spotify: '' },
        followers: { href: '', total: parseInt(stats.subscriberCount || '0', 10) },
        genres: [],
        images: [{ url: thumbnail, width: 800, height: 800 }],
        popularity: 0,
      },
      topTracks,
    };

    setCached(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Channel error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch channel' });
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
// GET /api/audio/:videoId — proxy the audio stream to avoid CORS issues
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
// GET /api/spotify/search?q=song+name+artist — search Spotify for a track
// Returns preview_url for fallback playback
// ---------------------------------------------------------------------------
app.get('/api/spotify/search', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing q' });

    const token = await getSpotifyToken();
    if (!token) return res.status(503).json({ error: 'Spotify auth failed' });

    const cacheKey = `sp_search:${q}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const resp = await axios.get('https://api.spotify.com/v1/search', {
      params: { q, type: 'track', market: 'IN', limit: Number(limit) },
      headers: { Authorization: `Bearer ${token}` },
    });

    const tracks = (resp.data.tracks?.items || []).map((t) => ({
      id: t.id,
      name: t.name,
      uri: t.uri,
      preview_url: t.preview_url,
      duration_ms: t.duration_ms,
      artists: t.artists.map((a) => ({ id: a.id, name: a.name, uri: a.uri })),
      album: {
        id: t.album.id,
        name: t.album.name,
        images: t.album.images,
        uri: t.album.uri,
      },
    }));

    setCached(cacheKey, tracks, 10 * 60 * 1000);
    res.json(tracks);
  } catch (err) {
    console.error('Spotify search error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Spotify search failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spotify/token — get Spotify auth token for Web Playback SDK
// (Client Credentials — note: Web Playback SDK needs user auth, this is for search only)
// ---------------------------------------------------------------------------
app.get('/api/spotify/token', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    if (!token) return res.status(503).json({ error: 'Failed to get token' });
    res.json({ access_token: token });
  } catch (err) {
    res.status(500).json({ error: 'Token fetch failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/spotify/preview/:trackId — proxy Spotify 30s preview to avoid CORS
// ---------------------------------------------------------------------------
app.get('/api/spotify/preview/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    const token = await getSpotifyToken();
    if (!token) return res.status(503).json({ error: 'Spotify auth failed' });

    // Get track details for preview_url
    const cacheKey = `sp_preview:${trackId}`;
    let previewUrl = getCached(cacheKey);

    if (!previewUrl) {
      const resp = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { market: 'IN' },
      });
      previewUrl = resp.data.preview_url;
      if (previewUrl) setCached(cacheKey, previewUrl, 30 * 60 * 1000);
    }

    if (!previewUrl) {
      return res.status(404).json({ error: 'No preview available for this track' });
    }

    // Proxy the preview audio
    const audioResp = await axios.get(previewUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', audioResp.headers['content-type'] || 'audio/mpeg');
    if (audioResp.headers['content-length']) res.setHeader('Content-Length', audioResp.headers['content-length']);
    res.setHeader('Access-Control-Allow-Origin', '*');
    audioResp.data.pipe(res);
  } catch (err) {
    console.error('Spotify preview error:', err.message);
    res.status(502).json({ error: 'Preview fetch failed' });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Audynox server running on port ${PORT}`);
});
