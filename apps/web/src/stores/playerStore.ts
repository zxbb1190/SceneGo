import { create } from "zustand";

export interface PlayerPlaybackState {
  currentTime: number;
  duration: number;
  isPaused: boolean;
  currentSubtitleLineId?: string;
}

export interface PlayerStore extends PlayerPlaybackState {
  setPlaybackState: (state: Partial<PlayerPlaybackState>) => void;
  setCurrentSubtitleLineId: (subtitleLineId?: string) => void;
  reset: () => void;
}

const initialState: PlayerPlaybackState = {
  currentTime: 0,
  duration: 0,
  isPaused: true
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  ...initialState,
  setPlaybackState: (state) => set(state),
  setCurrentSubtitleLineId: (currentSubtitleLineId) => set({ currentSubtitleLineId }),
  reset: () => set(initialState)
}));

