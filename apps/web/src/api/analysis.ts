import type { AnalyzeSentenceApiResponse } from "@scenego/shared";
import { apiRequest } from "./http.js";

export interface AnalyzeSentenceInput {
  projectId: string;
  subtitleLineId?: string;
  text?: string;
  language?: string;
  contextBefore?: string;
  contextAfter?: string;
}

export function analyzeSentence(token: string, input: AnalyzeSentenceInput) {
  return apiRequest<AnalyzeSentenceApiResponse>("/api/v1/analysis/sentence", {
    method: "POST",
    token,
    json: input
  });
}

