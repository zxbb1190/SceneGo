import { create } from "zustand";

export interface LocalVideoReference {
  objectUrl: string;
  fileName: string;
}

export interface LocalMediaStore {
  videosByProjectId: Record<string, LocalVideoReference>;
  setProjectVideo: (projectId: string, file: File) => void;
  clearProjectVideo: (projectId: string) => void;
  clearAllProjectVideos: () => void;
}

export const useLocalMediaStore = create<LocalMediaStore>((set, get) => ({
  videosByProjectId: {},
  setProjectVideo: (projectId, file) => {
    const existing = get().videosByProjectId[projectId];
    if (existing) {
      URL.revokeObjectURL(existing.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    set((state) => ({
      videosByProjectId: {
        ...state.videosByProjectId,
        [projectId]: {
          objectUrl,
          fileName: file.name
        }
      }
    }));
  },
  clearProjectVideo: (projectId) => {
    const existing = get().videosByProjectId[projectId];
    if (existing) {
      URL.revokeObjectURL(existing.objectUrl);
    }

    set((state) => {
      const nextVideos = { ...state.videosByProjectId };
      delete nextVideos[projectId];

      return { videosByProjectId: nextVideos };
    });
  },
  clearAllProjectVideos: () => {
    for (const video of Object.values(get().videosByProjectId)) {
      URL.revokeObjectURL(video.objectUrl);
    }

    set({ videosByProjectId: {} });
  }
}));
