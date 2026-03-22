---
title: Audynox Music Server
emoji: 🎵
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
---

# Audynox Music Server

Backend server for the Audynox music app. Uses JioSaavn API as primary source and youtube-sr + yt-dlp as YouTube fallback.

## Endpoints

- `GET /api/search?q=&maxResults=20` — Search songs (JioSaavn primary, youtube-sr fallback)
- `GET /api/trending?maxResults=20` — Get trending songs
- `GET /api/track/:id` — Get track metadata (JioSaavn or YouTube)
- `GET /api/playlist/:playlistId` — Get playlist with all tracks
- `GET /api/channel/:channelId` — Get artist info and top tracks
- `GET /api/suggestions/:songId` — Get related song suggestions
- `GET /api/song-url/:songId` — Get best quality download URL
- `GET /api/stream-url/:videoId` — Extract YouTube audio stream URL via yt-dlp
- `GET /api/audio/:videoId` — Proxy YouTube audio stream
- `GET /api/categories` — Get music genre categories
- `GET /api/health` — Health check
