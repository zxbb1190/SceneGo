import type {
  AiSentenceAnalysisRequest,
  AiSentenceAnalysisResult,
  AiQuizGenerationRequest,
  AiQuizGenerationResult,
  AiTextAnalysisRequest,
  AiTextAnalysisResult
} from "@scenego/shared";
import {
  quizQuestionJsonSchema,
  sentenceAnalysisJsonSchema,
  textAnalysisJsonSchema,
  type QuizQuestionJsonSchema,
  type SentenceAnalysisJsonSchema,
  type TextAnalysisJsonSchema
} from "./analysisSchema.js";
import {
  AiProviderInvalidResponseError,
  type AiProvider,
  type OpenAiCompatibleProviderOptions
} from "./types.js";

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const SENTENCE_ANALYSIS_SYSTEM_PROMPT =
  'Return compact valid JSON only. Shape: {"originalText":"","language":"","translation":"","tokens":[{"text":"","lemma":"","partOfSpeech":"","meaning":"","note":""}],"grammar":[{"title":"","explanation":"","examples":[""]}],"usageNotes":[""],"similarExpressions":[""]}. Use Simplified Chinese for meanings. Limits: tokens<=20, grammar<=4, usageNotes<=4, similarExpressions<=6. No markdown.';

const TEXT_ANALYSIS_SYSTEM_PROMPT =
  'Return compact valid JSON only. Shape: {"originalText":"","normalizedText":"","language":"","itemType":"word|phrase|sentence|paragraph|mixed","translation":"","summary":"","chunks":[{"text":"","meaning":"","note":""}],"vocabulary":[{"word":"","lemma":"","partOfSpeech":"","meaning":"","example":"","note":""}],"grammar":[{"title":"","explanation":"","examples":[""]}],"naturalUsage":[""],"similarExpressions":[""],"examples":[""],"memoryTips":[""]}. Use Simplified Chinese for meanings. Limits: chunks<=8, vocabulary<=12, grammar<=6, naturalUsage<=6, similarExpressions<=6, examples<=6, memoryTips<=6. Keep each explanation short. No markdown.';

const QUIZ_GENERATION_SYSTEM_PROMPT =
  'Return compact valid JSON only. Shape: {"questionType":"multiple_choice|fill_blank|short_answer","prompt":"","choices":[""],"answer":"","explanation":""}. Generate one practical language-learning exercise from the supplied source. Prefer multiple_choice with exactly 4 choices when possible. Use Simplified Chinese for explanations. No markdown.';

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly enableThinking?: boolean;
  private readonly responseFormat?: "json_object";
  private readonly maxTokens?: number;
  private readonly requestTimeoutMs?: number;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.enableThinking = options.enableThinking;
    this.responseFormat = options.responseFormat;
    this.maxTokens = options.maxTokens;
    this.requestTimeoutMs = options.requestTimeoutMs;
  }

  async analyzeSentence(request: AiSentenceAnalysisRequest): Promise<AiSentenceAnalysisResult> {
    const completion = await this.createChatCompletion([
      {
        role: "system",
        content: SENTENCE_ANALYSIS_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          language: request.language,
          text: request.text,
          contextBefore: request.contextBefore,
          contextAfter: request.contextAfter
        })
      }
    ]);
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty response");
    }

    const analysis = parseProviderStructuredResponse(content, parseAnalysisJson);

    return {
      cacheKey: {
        projectId: request.projectId,
        subtitleLineId: request.subtitleLineId,
        language: request.language
      },
      modelName: completion.model ?? this.model,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      },
      analysis
    };
  }

  async analyzeText(request: AiTextAnalysisRequest): Promise<AiTextAnalysisResult> {
    const completion = await this.createChatCompletion([
      {
        role: "system",
        content: TEXT_ANALYSIS_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          language: request.language,
          itemType: request.itemType,
          text: request.text,
          normalizedText: request.normalizedText,
          sourceNote: request.sourceNote,
          tags: request.tags
        })
      }
    ]);
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty response");
    }

    const analysis = parseProviderStructuredResponse(content, parseTextAnalysisJson);

    return {
      cacheKey: {
        studyItemId: request.studyItemId,
        language: request.language
      },
      modelName: completion.model ?? this.model,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      },
      analysis: {
        ...analysis,
        originalText: request.text,
        normalizedText: request.normalizedText,
        language: request.language,
        itemType: request.itemType
      }
    };
  }

  async generateQuiz(request: AiQuizGenerationRequest): Promise<AiQuizGenerationResult> {
    const completion = await this.createChatCompletion([
      {
        role: "system",
        content: QUIZ_GENERATION_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          sourceType: request.sourceType,
          language: request.language,
          text: request.text,
          meaning: request.meaning,
          context: request.context
        })
      }
    ]);
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty response");
    }

    const quiz = parseProviderStructuredResponse(content, parseQuizJson);

    return {
      modelName: completion.model ?? this.model,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      },
      quiz
    };
  }

  private async createChatCompletion(
    messages: Array<{ role: "system" | "user"; content: string }>
  ): Promise<ChatCompletionResponse> {
    const abortController = new AbortController();
    const timeout = this.requestTimeoutMs
      ? setTimeout(() => abortController.abort(), this.requestTimeoutMs)
      : undefined;
    const providerOptions = {
      ...(this.enableThinking === undefined ? {} : { enable_thinking: this.enableThinking }),
      ...(this.responseFormat === undefined ? {} : { response_format: { type: this.responseFormat } }),
      ...(this.maxTokens === undefined ? {} : { max_tokens: this.maxTokens })
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        signal: abortController.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          ...providerOptions,
          messages
        })
      });

      if (!response.ok) {
        throw new Error(`AI provider request failed: ${response.status}`);
      }

      return (await response.json()) as ChatCompletionResponse;
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new Error("AI provider request timed out");
      }

      throw error;
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

export function parseAnalysisJson(content: string): SentenceAnalysisJsonSchema {
  const parsed = parseJsonContent(content);

  return sentenceAnalysisJsonSchema.parse(parsed);
}

export function parseTextAnalysisJson(content: string): TextAnalysisJsonSchema {
  const parsed = parseJsonContent(content);

  return textAnalysisJsonSchema.parse(parsed);
}

export function parseQuizJson(content: string): QuizQuestionJsonSchema {
  const parsed = parseJsonContent(content);

  return quizQuestionJsonSchema.parse(parsed);
}

function parseProviderStructuredResponse<T>(content: string, parser: (content: string) => T): T {
  try {
    return parser(content);
  } catch (error) {
    throw new AiProviderInvalidResponseError("AI provider returned invalid structured JSON", {
      reason: error instanceof Error ? error.message : "Unknown structured JSON parse error",
      contentLength: content.length
    });
  }
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(withoutFence) as unknown;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = (error as { cause?: { code?: unknown } }).cause;
  return error.name === "AbortError" || cause?.code === "UND_ERR_HEADERS_TIMEOUT";
}
