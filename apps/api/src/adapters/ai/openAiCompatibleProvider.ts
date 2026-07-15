import type {
  AiSentenceAnalysisRequest,
  AiSentenceAnalysisResult,
  AiQuizGenerationRequest,
  AiQuizGenerationResult,
  AiTextAnalysisRequest,
  AiTextAnalysisResult,
  AiConversationClassificationRequest,
  AiConversationClassificationResult
} from "@scenego/shared";
import {
  conversationClassificationJsonSchema,
  quizQuestionJsonSchema,
  sentenceAnalysisJsonSchema,
  textAnalysisJsonSchema,
  type ConversationClassificationJsonSchema,
  type QuizQuestionJsonSchema,
  type SentenceAnalysisJsonSchema,
  type TextAnalysisJsonSchema
} from "./analysisSchema.js";
import {
  AiProviderInvalidResponseError,
  type AiProvider,
  type AiStreamCallbacks,
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

interface ChatCompletionChunk {
  id?: string;
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
      thinking?: string | null;
    };
  }>;
  usage?: ChatCompletionResponse["usage"];
}

const SENTENCE_ANALYSIS_SYSTEM_PROMPT =
  'Return compact valid JSON only. Shape: {"originalText":"","language":"","translation":"","tokens":[{"text":"","lemma":"","partOfSpeech":"","meaning":"","note":""}],"grammar":[{"title":"","explanation":"","examples":[""]}],"usageNotes":[""],"similarExpressions":[""]}. Use Simplified Chinese for meanings. Limits: tokens<=20, grammar<=4, usageNotes<=4, similarExpressions<=6. No markdown.';

const TEXT_ANALYSIS_SYSTEM_PROMPT =
  'Return compact valid JSON only. Shape: {"originalText":"","normalizedText":"","language":"","itemType":"word|phrase|sentence|paragraph|mixed","translation":"","summary":"","chunks":[{"text":"","meaning":"","note":""}],"vocabulary":[{"word":"","lemma":"","partOfSpeech":"","meaning":"","example":"","note":""}],"grammar":[{"title":"","explanation":"","examples":[""]}],"naturalUsage":[""],"similarExpressions":[""],"examples":[""],"memoryTips":[""]}. Use Simplified Chinese for meanings. Limits: chunks<=6, vocabulary<=8, grammar<=4, naturalUsage<=4, similarExpressions<=4, examples<=4, memoryTips<=3. Keep each explanation to one concise sentence and avoid repeating the translation. No markdown.';

const CONVERSATION_CLASSIFICATION_SYSTEM_PROMPT =
  'You are the fast routing layer for an AI language-learning chat. Decide directly without explaining your reasoning. Classify only the latest user message in context. Use learning_candidate when the latest message contains a new word, phrase, sentence, translation request, rewriting request, or a clear expression the learner wants to study and save. Use follow_up when it asks about or continues a previous learning message and should not create a second study item. Use unrelated for casual chat, product questions, or content unrelated to language learning. Return compact valid JSON only: {"messageType":"learning_candidate|follow_up|unrelated","reply":"","tags":[""]}. reply must be one short helpful Simplified Chinese sentence. tags are short automatic learning categories such as casual, work, travel, grammar, pronunciation, film, or translation; return [] when no tag is useful. Never use markdown.';

interface ChatCompletionOverrides {
  enableThinking?: boolean;
  thinkingBudget?: number;
  maxTokens?: number;
}

const QUIZ_GENERATION_SYSTEM_PROMPT =
  'Return compact valid JSON only. Shape: {"questionType":"multiple_choice|fill_blank|short_answer","prompt":"","choices":[""],"answer":"","explanation":""}. Generate one practical language-learning exercise from the supplied source. Prefer multiple_choice with exactly 4 choices when possible. Use Simplified Chinese for explanations. No markdown.';

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly enableThinking?: boolean;
  private readonly thinkingBudget?: number;
  private readonly responseFormat?: "json_object";
  private readonly maxTokens?: number;
  private readonly classificationMaxTokens?: number;
  private readonly analysisMaxTokens?: number;
  private readonly requestTimeoutMs?: number;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.enableThinking = options.enableThinking;
    this.thinkingBudget = options.thinkingBudget;
    this.responseFormat = options.responseFormat;
    this.maxTokens = options.maxTokens;
    this.classificationMaxTokens = options.classificationMaxTokens;
    this.analysisMaxTokens = options.analysisMaxTokens;
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

  async analyzeText(request: AiTextAnalysisRequest, callbacks?: AiStreamCallbacks): Promise<AiTextAnalysisResult> {
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
    ], callbacks, {
      enableThinking: this.enableThinking,
      thinkingBudget: this.thinkingBudget,
      maxTokens: this.analysisMaxTokens
    });
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

  async classifyConversation(
    request: AiConversationClassificationRequest,
    callbacks?: AiStreamCallbacks
  ): Promise<AiConversationClassificationResult> {
    const completion = await this.createChatCompletion([
      {
        role: "system",
        content: CONVERSATION_CLASSIFICATION_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          language: request.language,
          latestMessage: request.message,
          history: request.history
        })
      }
    ], callbacks, {
      enableThinking: this.enableThinking === undefined ? undefined : false,
      maxTokens: this.classificationMaxTokens
    });
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty response");
    }

    const decision = parseProviderStructuredResponse(content, parseConversationClassificationJson);

    return {
      ...decision,
      modelName: completion.model ?? this.model,
      usage: {
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
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
    messages: Array<{ role: "system" | "user"; content: string }>,
    callbacks?: AiStreamCallbacks,
    overrides?: ChatCompletionOverrides
  ): Promise<ChatCompletionResponse> {
    const abortController = new AbortController();
    const timeout = this.requestTimeoutMs
      ? setTimeout(() => abortController.abort(), this.requestTimeoutMs)
      : undefined;
    const enableThinking = overrides?.enableThinking ?? this.enableThinking;
    const thinkingBudget = enableThinking === false
      ? undefined
      : overrides?.thinkingBudget ?? this.thinkingBudget;
    const maxTokens = overrides?.maxTokens ?? this.maxTokens;
    const providerOptions = {
      ...(enableThinking === undefined ? {} : { enable_thinking: enableThinking }),
      ...(thinkingBudget === undefined ? {} : { thinking_budget: thinkingBudget }),
      ...(this.responseFormat === undefined ? {} : { response_format: { type: this.responseFormat } }),
      ...(maxTokens === undefined ? {} : { max_tokens: maxTokens })
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
          ...(callbacks ? { stream: true } : {}),
          ...providerOptions,
          messages
        })
      });

      if (!response.ok) {
        throw new Error(`AI provider request failed: ${response.status}`);
      }

      if (callbacks && response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
        return readStreamingChatCompletion(response.body, callbacks, this.model);
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

export function parseConversationClassificationJson(content: string): ConversationClassificationJsonSchema {
  const parsed = parseJsonContent(content);

  return conversationClassificationJsonSchema.parse(parsed);
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

async function readStreamingChatCompletion(
  body: ReadableStream<Uint8Array>,
  callbacks: AiStreamCallbacks,
  fallbackModel: string
): Promise<ChatCompletionResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let model = fallbackModel;
  let usage: ChatCompletionResponse["usage"];

  const consumeLine = (line: string) => {
    const data = line.trim();
    if (!data || !data.startsWith("data:")) {
      return;
    }

    const payload = data.slice("data:".length).trim();
    if (!payload || payload === "[DONE]") {
      return;
    }

    let chunk: ChatCompletionChunk;
    try {
      chunk = JSON.parse(payload) as ChatCompletionChunk;
    } catch {
      return;
    }

    model = chunk.model ?? model;
    usage = chunk.usage ?? usage;
    const delta = chunk.choices?.[0]?.delta;
    const reasoning = delta?.reasoning_content ?? delta?.reasoning ?? delta?.thinking ?? "";
    const text = delta?.content ?? "";

    if (reasoning) {
      callbacks.onReasoningDelta?.(reasoning);
    }
    if (text) {
      content += text;
      callbacks.onContentDelta?.(text);
    }
  };

  while (true) {
    const result = await reader.read();
    buffer += decoder.decode(result.value ?? new Uint8Array(), { stream: !result.done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(consumeLine);

    if (result.done) {
      break;
    }
  }

  if (buffer) {
    consumeLine(buffer);
  }

  return {
    model,
    choices: [{ message: { content } }],
    usage
  };
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
