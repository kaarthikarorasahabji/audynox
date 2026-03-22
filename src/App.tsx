/* eslint-disable react-hooks/exhaustive-deps */
import './styles/App.scss';

// Utils
import i18next from 'i18next';
import React, { FC, Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Splash Screen
import SplashScreen from './components/SplashScreen/SplashScreen';

// Components
import { ConfigProvider } from 'antd';
import { AppLayout } from './components/Layout';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

// Redux
import { Provider } from 'react-redux';
import { uiActions } from './store/slices/ui';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store, useAppDispatch, useAppSelector } from './store/store';

// YouTube Player Bridge
import YouTubePlayerBridge from './utils/youtube/YouTubePlayerBridge';

// Auth
import { initAuth } from './store/slices/auth';

// Player bridge
import { getPlayerBridge } from './utils/playerBridge';

// Pages
import SearchContainer from './pages/Search/Container';
import { Spinner } from './components/spinner/spinner';

// Error Boundary to prevent blank pages on runtime crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('Page crash caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <button
            style={{ marginTop: 16, padding: '8px 24px', cursor: 'pointer' }}
            onClick={() => {
              this.setState({ hasError: false });
              window.history.back();
            }}
          >
            Go Back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Home = lazy(() => import('./pages/Home'));
const Page404 = lazy(() => import('./pages/404'));
const AlbumView = lazy(() => import('./pages/Album'));
const GenrePage = lazy(() => import('./pages/Genre'));
const BrowsePage = lazy(() => import('./pages/Browse'));
const ArtistPage = lazy(() => import('./pages/Artist'));
const PlaylistView = lazy(() => import('./pages/Playlist'));
const ArtistDiscographyPage = lazy(() => import('./pages/Discography'));

const Profile = lazy(() => import('./pages/User/Home'));
const ProfileTracks = lazy(() => import('./pages/User/Songs'));
const ProfileArtists = lazy(() => import('./pages/User/Artists'));
const ProfilePlaylists = lazy(() => import('./pages/User/Playlists'));

const SearchPage = lazy(() => import('./pages/Search/Home'));
const SearchTracks = lazy(() => import('./pages/Search/Songs'));
const LikedSongsPage = lazy(() => import('./pages/LikedSongs'));
const SearchAlbums = lazy(() => import('./pages/Search/Albums'));
const SearchPlaylist = lazy(() => import('./pages/Search/Playlists'));
const SearchPageArtists = lazy(() => import('./pages/Search/Artists'));
const RecentlySearched = lazy(() => import('./pages/Search/RecentlySearched'));

window.addEventListener('resize', () => {
  const vh = window.innerWidth;
  if (vh < 950) {
    store.dispatch(uiActions.collapseLibrary());
  }
});

const RoutesComponent = memo(() => {
  const location = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const user = useAppSelector((state) => !!state.auth.user);

  useEffect(() => {
    if (container.current) {
      container.current.scrollTop = 0;
    }
  }, [location, container]);

  const routes = useMemo(
    () =>
      [
        { path: '', element: <Home container={container} />, public: true },
        { path: '/collection/tracks', element: <LikedSongsPage container={container} />, public: true },
        {
          public: true,
          path: '/playlist/:playlistId',
          element: <PlaylistView container={container} />,
        },
        { path: '/album/:albumId', element: <AlbumView container={container} />, public: true },
        {
          path: '/artist/:artistId/discography',
          element: <ArtistDiscographyPage container={container} />,
          public: true,
        },
        { public: true, path: '/artist/:artistId', element: <ArtistPage container={container} /> },
        { path: '/users/:userId/artists', element: <ProfileArtists container={container} />, public: true },
        { path: '/users/:userId/playlists', element: <ProfilePlaylists container={container} />, public: true },
        { path: '/users/:userId/tracks', element: <ProfileTracks container={container} />, public: true },
        { path: '/users/:userId', element: <Profile container={container} />, public: true },
        { public: true, path: '/genre/:genreId', element: <GenrePage /> },
        { public: true, path: '/search', element: <BrowsePage /> },
        { path: '/recent-searches', element: <RecentlySearched />, public: true },
        {
          public: true,
          path: '/search/:search',
          element: <SearchContainer container={container} />,
          children: [
            {
              path: 'artists',
              element: <SearchPageArtists container={container} />,
            },
            {
              path: 'albums',
              element: <SearchAlbums container={container} />,
            },
            {
              path: 'playlists',
              element: <SearchPlaylist container={container} />,
            },
            {
              path: 'tracks',
              element: <SearchTracks container={container} />,
            },
            {
              path: '',
              element: <SearchPage container={container} />,
            },
          ],
        },
        { path: '*', element: <Page404 /> },
      ].filter((r) => (user ? true : r.public)),
    [container, user]
  );

  return (
    <div
      className='Main-section'
      ref={container}
      style={{
        height: user ? undefined : `calc(100vh - 50px)`,
      }}
    >
      <div
        style={{
          minHeight: user ? 'calc(100vh - 230px)' : 'calc(100vh - 100px)',
          width: '100%',
        }}
      >
        <ErrorBoundary>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<Suspense>{route.element}</Suspense>}
              >
                {route?.children
                  ? route.children.map((child) => (
                      <Route
                        key={child.path}
                        path={child.path}
                        element={<Suspense>{child.element}</Suspense>}
                      />
                    ))
                  : undefined}
              </Route>
            ))}
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
});

const RootComponent = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => !!state.auth.user);
  const language = useAppSelector((state) => state.language.language);
  const playing = useAppSelector((state) => !state.spotify.state?.paused);

  // Initialize auth on mount (check for stored token or OAuth callback)
  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    i18next.changeLanguage(language);
  }, [language]);

  const handleSpaceBar = useCallback(
    (e: KeyboardEvent) => {
      // @ts-ignore
      if (e.target?.tagName?.toUpperCase() === 'INPUT') return;
      if (playing === undefined) return;
      e.stopPropagation();
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();
        const bridge = getPlayerBridge();
        if (bridge) {
          !playing ? bridge.resume() : bridge.pause();
        }
      }
    },
    [playing]
  );

  useEffect(() => {
    if (!user) return;
    document.addEventListener('keydown', handleSpaceBar);
    return () => {
      document.removeEventListener('keydown', handleSpaceBar);
    };
  }, [user, handleSpaceBar]);

  useEffect(() => {
    if (!user) return;
    const handleContextMenu = (e: any) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('keydown', handleContextMenu);
    };
  }, [user]);

  return (
    <Router>
      <AppLayout>
        <RoutesComponent />
      </AppLayout>
    </Router>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ConfigProvider theme={{ token: { fontFamily: 'SpotifyMixUI' } }}>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <YouTubePlayerBridge>
            <RootComponent />
          </YouTubePlayerBridge>
        </PersistGate>
      </Provider>
    </ConfigProvider>
  );
}

export default App;
