import type {
  FavoriteSentenceSummary,
  SentenceProgressSummary,
  SentenceProgressStatus,
  UpsertSentenceProgressInput
} from "@scenego/shared";
import { apiRequest } from "./http.js";

export interface UpdateSentenceProgressInput {
  status?: SentenceProgressStatus;
  listenCountIncrement?: number;
  isFavorite?: boolean;
  note?: string | null;
}

export function listFavoriteSentences(token: string) {
  return apiRequest<{ sentences: FavoriteSentenceSummary[] }>("/api/v1/sentences/favorites", { token });
}

export function listProjectSentenceProgress(token: string, projectId: string) {
  return apiRequest<{ progresses: SentenceProgressSummary[] }>(
    `/api/v1/sentences/progress?projectId=${encodeURIComponent(projectId)}`,
    { token }
  );
}

export function upsertSentenceProgress(token: string, input: UpsertSentenceProgressInput) {
  return apiRequest<{ progress: SentenceProgressSummary }>("/api/v1/sentences/progress", {
    method: "POST",
    token,
    json: input
  });
}

export function updateSentenceProgress(token: string, progressId: string, input: UpdateSentenceProgressInput) {
  return apiRequest<{ progress: SentenceProgressSummary }>(`/api/v1/sentences/progress/${progressId}`, {
    method: "PATCH",
    token,
    json: input
  });
}
