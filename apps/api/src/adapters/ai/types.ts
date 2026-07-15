import type {
  AiTextAnalysisRequest,
  AiTextAnalysisResult,
  AiSentenceAnalysisRequest,
  AiSentenceAnalysisResult,
  AiQuizGenerationRequest,
  AiQuizGenerationResult,
  AiConversationClassificationRequest,
  AiConversationClassificationResult
} from "@scenego/shared";

export interface AiProvider {
  analyzeSentence(request: AiSentenceAnalysisRequest): Promise<AiSentenceAnalysisResult>;
  analyzeText(request: AiTextAnalysisRequest, callbacks?: AiStreamCallbacks): Promise<AiTextAnalysisResult>;
  classifyConversation(
    request: AiConversationClassificationRequest,
    callbacks?: AiStreamCallbacks
  ): Promise<AiConversationClassificationResult>;
  generateQuiz(request: AiQuizGenerationRequest): Promise<AiQuizGenerationResult>;
}

export interface AiStreamCallbacks {
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
}

export interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  enableThinking?: boolean;
  thinkingBudget?: number;
  responseFormat?: "json_object";
  maxTokens?: number;
  classificationMaxTokens?: number;
  analysisMaxTokens?: number;
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
