import type {
  CreateVocabularyItemInput,
  UpdateVocabularyItemInput,
  VocabularyItemSummary
} from "@scenego/shared";
import { apiRequest } from "./http.js";

export function listVocabulary(token: string) {
  return apiRequest<{ items: VocabularyItemSummary[] }>("/api/v1/vocabulary", { token });
}

export function createVocabularyItem(token: string, input: CreateVocabularyItemInput) {
  return apiRequest<{ item: VocabularyItemSummary }>("/api/v1/vocabulary", {
    method: "POST",
    token,
    json: input
  });
}

export function updateVocabularyItem(token: string, itemId: string, input: UpdateVocabularyItemInput) {
  return apiRequest<{ item: VocabularyItemSummary }>(`/api/v1/vocabulary/${itemId}`, {
    method: "PATCH",
    token,
    json: input
  });
}

export function deleteVocabularyItem(token: string, itemId: string) {
  return apiRequest<void>(`/api/v1/vocabulary/${itemId}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });
}
