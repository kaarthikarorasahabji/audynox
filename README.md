---
title: Audynox
emoji: 🎵
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">

# 🎵 Audynox

### A Full-Featured Music Streaming App — Powered by JioSaavn & YouTube

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Audynox-1DB954?style=for-the-badge)](https://kaarthikdassarora-audynox.hf.space/)
[![API](https://img.shields.io/badge/🔌_API-Audynox_API-blue?style=for-the-badge)](https://kaarthikdassarora-audynox-api.hf.space/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Redux](https://img.shields.io/badge/Redux_Toolkit-593d88?style=flat-square&logo=redux&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

<br/>

> **No Spotify account required.** Audynox streams music via JioSaavn (320kbps) with YouTube fallback — millions of songs, completely free.

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎵 **High-Quality Streaming** | Stream songs up to 320kbps via JioSaavn |
| 🔍 **Smart Search** | Search songs, artists, and albums in real time |
| 👤 **Artist Pages** | View top tracks, albums, singles, and similar artists |
| 💿 **Album Views** | Full album details with complete track listings |
| 📂 **Browse by Genre** | Discover music across Pop, Rock, Hip Hop, K-Pop, Lo-Fi, and more |
| ❤️ **Liked Songs** | Save your favorites locally |
| 📃 **Playlists** | Create and manage custom playlists |
| 🎯 **Recommendations** | Get song suggestions based on what you listen to |
| 🔥 **Trending** | Discover trending tracks on the home page |
| 🎨 **Splash Animation** | Beautiful animated intro with developer credits |
| 📱 **Responsive** | Works on desktop and mobile |
| 🌍 **Multi-language** | i18n support |

---

## 🖼️ Screenshots

<div align="center">
<table>
  <tr>
    <td><img src="images/Home.png" alt="Home" width="280"/></td>
    <td><img src="images/search.png" alt="Search" width="280"/></td>
    <td><img src="images/playlist.png" alt="Playlist" width="280"/></td>
  </tr>
  <tr>
    <td align="center"><b>Home</b></td>
    <td align="center"><b>Search</b></td>
    <td align="center"><b>Playlist</b></td>
  </tr>
  <tr>
    <td><img src="images/artist.png" alt="Artist" width="280"/></td>
    <td><img src="images/Album.png" alt="Album" width="280"/></td>
    <td><img src="images/Profile.png" alt="Profile" width="280"/></td>
  </tr>
  <tr>
    <td align="center"><b>Artist</b></td>
    <td align="center"><b>Album</b></td>
    <td align="center"><b>Profile</b></td>
  </tr>
</table>
</div>

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Redux Toolkit, Ant Design, SCSS
- **Backend:** Node.js, Express, JioSaavn API, youtube-sr, yt-dlp
- **Deployment:** Docker + Hugging Face Spaces

---

## 🔌 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/search?q=&maxResults=20` | Search songs |
| `GET /api/trending?maxResults=20` | Trending songs |
| `GET /api/track/:id` | Track metadata |
| `GET /api/song-url/:songId` | Direct audio URL (320kbps) |
| `GET /api/artist/:id` | Artist details |
| `GET /api/artist/:id/top-tracks` | Artist top tracks |
| `GET /api/artist/:id/albums` | Artist albums & singles |
| `GET /api/artist/:id/related` | Similar artists |
| `GET /api/album/:id` | Album details with tracks |
| `GET /api/playlist/:id` | Playlist with tracks |
| `GET /api/new-releases` | New album releases |
| `GET /api/featured-playlists` | Featured playlists |
| `GET /api/categories` | Music categories |
| `GET /api/category/:id/playlists` | Category playlists |
| `GET /api/recommendations` | Song recommendations |
| `GET /api/suggestions/:songId` | Related songs |
| `GET /api/health` | Health check |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/kaarthikarorasahabji/audynox.git
cd audynox

# Install dependencies
npm install

# Start frontend dev server
npm start

# Start backend (in another terminal)
cd server
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker

```bash
docker build -t audynox .
docker run -p 7860:7860 audynox
```

---

## 📁 Project Structure

```
audynox/
├── src/
│   ├── components/     # UI components (SplashScreen, Layout, Player, etc.)
│   ├── pages/          # Route pages (Home, Search, Playlist, Artist, Album)
│   ├── services/       # JioSaavn/YouTube API services
│   ├── store/          # Redux Toolkit slices & state management
│   ├── hooks/          # Custom React hooks
│   ├── interfaces/     # TypeScript type definitions
│   └── i18n/           # Internationalization
├── server/             # Express backend (JioSaavn proxy + YouTube fallback)
├── public/             # Static assets
├── docker/             # Nginx config
└── Dockerfile          # Production container
```

---

## 🌐 Deployment

Deployed on **Hugging Face Spaces** using Docker:

- **App:** [https://kaarthikdassarora-audynox.hf.space](https://kaarthikdassarora-audynox.hf.space/)
- **API:** [https://kaarthikdassarora-audynox-api.hf.space](https://kaarthikdassarora-audynox-api.hf.space/)

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Developed by [Kaarthik Dass Arora](https://github.com/kaarthikarorasahabji)**

</div>
