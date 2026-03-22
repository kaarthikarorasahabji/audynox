import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Interfaces
import type { Track } from '../../interfaces/track';
import type { Episode } from '../../interfaces/episode';

export interface QueueState {
  queue: (Track | Episode)[];
}

const initialState: QueueState = {
  queue: [],
};

export const fetchQueue = createAsyncThunk('queue/fetchQueue', async () => {
  // In YouTube mode, queue is managed by the player hook
  // Return empty — the Queue UI reads from the player state
  return [] as (Track | Episode)[];
});

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setQueue(state, action) {
      state.queue = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchQueue.fulfilled, (state, action) => {
      state.queue = action.payload;
    });
  },
});

export const queueActions = {
  fetchQueue,
  ...queueSlice.actions,
};

export default queueSlice.reducer;
