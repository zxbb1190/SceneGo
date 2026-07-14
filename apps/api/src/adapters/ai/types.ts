import type {
  AiTextAnalysisRequest,
  AiTextAnalysisResult,
  AiSentenceAnalysisRequest,
  AiSentenceAnalysisResult,
  AiQuizGenerationRequest,
  AiQuizGenerationResult
} from "@scenego/shared";

export interface AiProvider {
  analyzeSentence(request: AiSentenceAnalysisRequest): Promise<AiSentenceAnalysisResult>;
  analyzeText(request: AiTextAnalysisRequest): Promise<AiTextAnalysisResult>;
  generateQuiz(request: AiQuizGenerationRequest): Promise<AiQuizGenerationResult>;
}

export interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  enableThinking?: boolean;
  responseFormat?: "json_object";
  maxTokens?: number;
  requestTimeoutMs?: number;
}

export class AiProviderNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AiProviderNotConfiguredError";
  }
}

export class AiProviderInvalidResponseError extends Error {
  readonly details?: unknown;

  constructor(message = "AI provider returned invalid structured JSON", details?: unknown) {
    super(message);
    this.name = "AiProviderInvalidResponseError";
    this.details = details;
  }
}
