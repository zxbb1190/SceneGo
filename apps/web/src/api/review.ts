import type {
  AnswerQuizInput,
  GenerateQuizInput,
  GenerateQuizResponse,
  LearningReport,
  MistakesResponse,
  ReviewTodayResponse,
  SubmitReviewAttemptInput,
  SubmitReviewAttemptResponse
} from "@scenego/shared";
import { apiRequest } from "./http.js";

export function getTodayReview(token: string) {
  return apiRequest<ReviewTodayResponse>("/api/v1/review/today", { token });
}

export function submitReviewAttempt(token: string, taskId: string, input: SubmitReviewAttemptInput) {
  return apiRequest<SubmitReviewAttemptResponse>(`/api/v1/review/tasks/${taskId}/attempts`, {
    method: "POST",
    token,
    json: input
  });
}

export function generateQuiz(token: string, input: GenerateQuizInput) {
  return apiRequest<GenerateQuizResponse>("/api/v1/review/quiz", {
    method: "POST",
    token,
    json: input
  });
}

export function answerQuiz(token: string, quizItemId: string, input: AnswerQuizInput) {
  return apiRequest<SubmitReviewAttemptResponse>(`/api/v1/review/quiz/${quizItemId}/answer`, {
    method: "POST",
    token,
    json: input
  });
}

export function listMistakes(token: string) {
  return apiRequest<MistakesResponse>("/api/v1/review/mistakes", { token });
}

export function getLearningReport(token: string) {
  return apiRequest<{ report: LearningReport }>("/api/v1/review/report", { token });
}
