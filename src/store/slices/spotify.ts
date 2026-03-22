import type { RootState } from '../store';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Interfaces
import { Device } from '../../interfaces/devices';

const initialState: {
  liked: boolean;
  deviceId: string | null;
  activeDevice: string | null;
  activeDeviceType: Device['type'];
  state: any | null;
  player: any | null;
  devices: Device[];
} = {
  state: null,
  deviceId: null,
  activeDevice: null,
  liked: false,
  player: null,
  devices: [],
  activeDeviceType: 'Computer',
};

export const setState = createAsyncThunk<
  any | null,
  { state: any | null }
>('spotify/setState', async ({ state: playbackState }, { getState, dispatch }) => {
  if (!playbackState) return null;

  const rootState = getState() as RootState;
  const currentSong = playbackState.track_window?.current_track;
  const prevSong = rootState.spotify.state?.track_window?.current_track;

  if (currentSong?.id && currentSong.id !== prevSong?.id) {
    const playing = !playbackState.paused;
    if (currentSong && playing) {
      document.title = `${currentSong.name} • ${currentSong.artists?.[0]?.name || 'Unknown'}`;
    } else {
      document.title = 'Audynox';
    }
    if (currentSong) {
      dispatch(fetchLikedSong(currentSong.id));
    }
  }

  return playbackState;
});

export const fetchLikedSong = createAsyncThunk<boolean, string>(
  'spotify/fetchLikedSong',
  async (id) => {
    try {
      // Check liked songs from localStorage
      const liked = JSON.parse(localStorage.getItem('yt_liked_songs') || '[]');
      return liked.includes(id);
    } catch {
      return false;
    }
  }
);

export const fetchDevices = createAsyncThunk<Device[]>('spotify/fetchDevices', async () => {
  // Return local device only in YouTube mode
  return [
    {
      id: 'youtube-local',
      is_active: true,
      is_private_session: false,
      is_restricted: false,
      name: 'This Browser',
      type: 'Computer' as const,
      volume_percent: 100,
      supports_volume: true,
    },
  ] as Device[];
});

const spotifySlice = createSlice({
  name: 'spotify',
  initialState,
  reducers: {
    setLiked(state, action: PayloadAction<{ liked: boolean }>) {
      state.liked = action.payload.liked;
    },
    setDeviceId(state, action: PayloadAction<{ deviceId: string | null }>) {
      state.deviceId = action.payload.deviceId;
    },
    setPlayer(state, action: PayloadAction<{ player: any | null }>) {
      state.player = action.payload.player;
    },
    setActiveDevice(
      state,
      action: PayloadAction<{ activeDevice: string | null; type?: Device['type'] }>
    ) {
      state.activeDevice = action.payload.activeDevice;
      state.activeDeviceType = action.payload.type || 'Computer';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setState.fulfilled, (state, action) => {
      state.state = action.payload;
    });
    builder.addCase(fetchLikedSong.fulfilled, (state, action) => {
      state.liked = action.payload;
    });
    builder.addCase(fetchDevices.fulfilled, (state, action) => {
      state.devices = action.payload;
    });
  },
});

export const getCurrentDevice = (state: RootState) => {
  return state.spotify.devices.find((device) => device.is_active);
};

export const isActiveOnOtherDevice = (state: RootState) => {
  const currentDevice = state.spotify.devices.find((device) => device.is_active);
  return currentDevice ? currentDevice.id !== state.spotify.deviceId : false;
};

export const getOtherDevices = (state: RootState) => {
  return state.spotify.devices.filter((device) => !device.is_active);
};

export const spotifyActions = { ...spotifySlice.actions, setState, fetchDevices };

export default spotifySlice.reducer;
