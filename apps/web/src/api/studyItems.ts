import type {
  CreateVocabularyItemInput,
  StudyItemDetail,
  StudyItemListFilters,
  StudyItemSummary,
  UpdateStudyItemInput,
  VocabularyItemSummary
} from "@scenego/shared";
import { apiRequest } from "./http.js";

export function listStudyItems(token: string, filters: StudyItemListFilters = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === null) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return apiRequest<{ items: StudyItemSummary[] }>(
    `/api/v1/study-items${query ? `?${query}` : ""}`,
    { token }
  );
}

export function getStudyItem(token: string, itemId: string) {
  return apiRequest<{ item: StudyItemDetail }>(`/api/v1/study-items/${itemId}`, { token });
}

export function updateStudyItem(token: string, itemId: string, input: UpdateStudyItemInput) {
  return apiRequest<{ item: StudyItemDetail }>(`/api/v1/study-items/${itemId}`, {
    method: "PATCH",
    token,
    json: input
  });
}

export function deleteStudyItem(token: string, itemId: string) {
  return apiRequest<void>(`/api/v1/study-items/${itemId}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });
}

export function updateStudyItemNote(token: string, itemId: string, note: string) {
  return apiRequest<{ item: StudyItemDetail }>(`/api/v1/study-items/${itemId}/note`, {
    method: "PATCH",
    token,
    json: { note }
  });
}

export function addStudyItemVocabulary(
  token: string,
  itemId: string,
  input: Pick<CreateVocabularyItemInput, "word" | "meaning" | "language" | "note" | "sourceText" | "masteryStatus">
) {
  return apiRequest<{ item: VocabularyItemSummary }>(`/api/v1/study-items/${itemId}/vocabulary`, {
    method: "POST",
    token,
    json: input
  });
}
