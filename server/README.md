---
title: YouTube Music Server
emoji: 🎵
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
---

# YouTube Music Server

Backend server for the YouTube Music app. Proxies YouTube Data API v3 calls and extracts audio-only stream URLs via yt-dlp.

## Endpoints

- `GET /api/search?q=&maxResults=20` — Search YouTube music videos
- `GET /api/stream-url/:videoId` — Extract audio stream URL via yt-dlp
- `GET /api/track/:videoId` — Get video metadata
- `GET /api/playlist/:playlistId` — Get playlist with all tracks
- `GET /api/trending` — Get trending music videos
- `GET /api/channel/:channelId` — Get channel info and top tracks
- `GET /api/categories` — Get music genre categories
- `GET /api/health` — Health check
