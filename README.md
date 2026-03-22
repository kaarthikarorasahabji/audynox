---
title: Audynox
emoji: 🎧
colorFrom: green
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">

# 🎧 Audynox

### A Modern Music Streaming Experience — Powered by YouTube

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Audynox-1DB954?style=for-the-badge)](https://kaarthikdassarora-audynox.hf.space/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Redux](https://img.shields.io/badge/Redux_Toolkit-593d88?style=flat-square&logo=redux&logoColor=white)
![YouTube](https://img.shields.io/badge/YouTube_API-FF0000?style=flat-square&logo=youtube&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

<br/>

> **No Spotify Premium required.** Audynox streams music directly from YouTube, giving everyone access to millions of songs — completely free.

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎵 **Free Music Playback** | Stream any song via YouTube — no subscriptions needed |
| 🔍 **Smart Search** | Search songs, artists, and albums in real time |
| ❤️ **Liked Songs** | Save your favorites locally and access them anytime |
| 📃 **Playlists** | Create, edit, and manage custom playlists |
| 🎨 **Sleek UI** | Spotify-inspired dark interface with smooth animations |
| 🌍 **Multi-language** | Internationalization support via i18n |
| 📱 **Responsive** | Works seamlessly on desktop and mobile |
| 🏠 **Trending Music** | Discover trending tracks right on the home page |

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

- **Frontend:** React 18, TypeScript, Redux Toolkit
- **Styling:** Ant Design, SCSS, CSS Modules
- **Music:** YouTube IFrame API + Invidious API for search/metadata
- **Backend:** Express.js proxy server
- **Deployment:** Docker + Hugging Face Spaces

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/kaarthikarorasahabji/audynox.git
cd audynox

# Install dependencies
npm install

# Start development server
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
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages (Home, Search, Playlist, Artist, Album)
│   ├── services/       # YouTube API & local storage services
│   ├── store/          # Redux Toolkit slices & state management
│   ├── hooks/          # Custom React hooks
│   ├── interfaces/     # TypeScript type definitions
│   └── i18n/           # Internationalization
├── server/             # Express backend proxy
├── public/             # Static assets
├── docker/             # Docker configuration
└── Dockerfile          # Production container
```

---

## 🌐 Deployment

Audynox is deployed on **Hugging Face Spaces** using Docker SDK:

🔗 **Live:** [https://kaarthikdassarora-audynox.hf.space](https://kaarthikdassarora-audynox.hf.space/)

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Made with ❤️ by [Kaarthik Dass Arora](https://github.com/kaarthikarorasahabji)**

</div>
