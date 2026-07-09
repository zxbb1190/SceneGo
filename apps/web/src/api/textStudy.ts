import type { AnalyzeTextApiResponse, AnalyzeTextInput } from "@scenego/shared";
import { apiRequest } from "./http.js";

export function analyzeText(token: string, input: AnalyzeTextInput) {
  return apiRequest<AnalyzeTextApiResponse>("/api/text/analyze", {
    method: "POST",
    token,
    json: input
  });
}
