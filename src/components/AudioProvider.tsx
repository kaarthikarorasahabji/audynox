// This file is no longer used. Audio playback is handled by Spotify Web Playback SDK.
// Kept for reference only.

import { FC, memo } from 'react';

interface AudioProviderProps {
  children: React.ReactNode;
}

const AudioProvider: FC<AudioProviderProps> = memo(({ children }) => {
  return <>{children}</>;
});

export default AudioProvider;
