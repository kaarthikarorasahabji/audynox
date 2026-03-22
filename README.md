<div align="center">

# 🎵 Audynox

### A Full-Featured Music Streaming App
**Powered by JioSaavn & YouTube**

*No Spotify account required. No ads. Ever.*

[![Live Demo](https://img.shields.io/badge/Live_Demo-FF6B6B?style=for-the-badge&logo=vercel&logoColor=white)](https://kaarthikdassarora-audynox.hf.space)
[![API](https://img.shields.io/badge/API-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://kaarthikdassarora-audynox-api.hf.space)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

---

> *"Spotify kept ruining my gym sessions with ads. So I built my own music app in 1 day."*
> — **Kaarthik Dass Arora**

</div>

---

## ✨ Features

| Feature | Description |
|:---|:---|
| 🎵 **High-Quality Streaming** | Stream songs up to **320kbps** via JioSaavn |
| 🔍 **Smart Search** | Search songs, artists, and albums in real time |
| 👤 **Artist Pages** | View top tracks, albums, singles, and similar artists |
| 💿 **Album Views** | Full album details with complete track listings |
| 📂 **Browse by Genre** | Discover music across Pop, Rock, Hip Hop, K-Pop, Lo-Fi & more |
| ❤️ **Liked Songs** | Save your favorites locally |
| 📃 **Playlists** | Create and manage custom playlists |
| 🎯 **Recommendations** | Get song suggestions based on what you listen to |
| 🔥 **Trending** | Discover trending tracks on the home page |
| 🎨 **Splash Animation** | Beautiful animated intro with developer credits |
| 📱 **Responsive** | Works perfectly on desktop and mobile |
| 🌍 **Multi-language** | i18n support |

---

## 🛠️ Tech Stack

**Frontend**

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat-square&logo=redux&logoColor=white)
![Ant Design](https://img.shields.io/badge/Ant_Design-0170FE?style=flat-square&logo=antdesign&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=flat-square&logo=sass&logoColor=white)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![JioSaavn](https://img.shields.io/badge/JioSaavn_API-0057A3?style=flat-square&logo=jiosaavn&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-FF0000?style=flat-square&logo=youtube&logoColor=white)

**Deployment**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Hugging Face](https://img.shields.io/badge/Hugging_Face-FFD21E?style=flat-square&logo=huggingface&logoColor=black)

---

## 🔌 API Endpoints

| Endpoint | Description |
|:---|:---|
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

### Local Development

```bash
# Clone the repository
git clone https://github.com/kaarthikarorasahabji/audynox.git
cd audynox

# Install frontend dependencies
npm install

# Start frontend dev server
npm start

# Start backend (in another terminal)
cd server
npm install
npm start
```

Open **http://localhost:3000** in your browser. 🎉

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

| Service | URL |
|:---|:---|
| 🎵 App | [kaarthikdassarora-audynox.hf.space](https://kaarthikdassarora-audynox.hf.space) |
| ⚡ API | [kaarthikdassarora-audynox-api.hf.space](https://kaarthikdassarora-audynox-api.hf.space) |

---

## 📝 License

This project is licensed under the **MIT License**.

```
MIT License
Copyright (c) 2026 Kaarthik Dass Arora
```

---

<div align="center">

**Built with ❤️ and frustration by [Kaarthik Dass Arora](https://github.com/kaarthikarorasahabji)**

[![GitHub](https://img.shields.io/badge/GitHub-kaarthikarorasahabji-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kaarthikarorasahabji)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-kaarthikdassarora-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/kaarthikdassarora/)

*⭐ Star this repo if you find it useful!*

</div>
