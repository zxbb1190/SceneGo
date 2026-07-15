import { Router } from "express";
import { z } from "zod";
import type { TextAnalysisJson } from "@scenego/shared";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import {
  analyzeTextForUser,
  classifyStudyText,
  normalizeStudyText
} from "../services/textAnalysisService.js";
import { classifyConversationForUser } from "../services/conversationService.js";
import {
  createStreamingTextAnalysisSnapshot,
  extractTopLevelJsonString,
  type StreamingTextAnalysisBase
} from "../services/streamingTextAnalysis.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { toStudyItemDetailDto } from "./studyItemDtos.js";
import { findStudyItemDetailOrThrow } from "./studyItemQueries.js";
import { toConversationDetailDto, toConversationSummaryDto } from "./conversationDtos.js";
import { studyItemDetailInclude } from "./studyItemQueries.js";

const studySourceTypeSchema = z.enum(["manual_input", "video_subtitle", "external_manual"]);

const analyzeTextSchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  language: z.string().trim().min(2).max(20).optional(),
  sourceNote: z.string().trim().max(255).optional(),
  sourceType: studySourceTypeSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional()
});

const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000)
});

const analyzeConversationSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  language: z.string().trim().min(2).max(20).optional(),
  history: z.array(conversationTurnSchema).max(500).transform((history) => history.slice(-12)).optional(),
  conversationId: z.string().uuid().optional()
});

export function createTextRouter(): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/conversation",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        include: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { messageIndex: "desc" },
            take: 1
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 100
      });

      response.json({ conversations: conversations.map(toConversationSummaryDto) });
    })
  );

  router.get(
    "/conversation/:conversationId",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const conversationId = getRequiredParam(request.params.conversationId, "Conversation id");
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { messageIndex: "asc" },
            include: {
              studyItem: {
                include: studyItemDetailInclude
              }
            }
          }
        }
      });

      if (!conversation) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found");
      }

      response.json({ conversation: toConversationDetailDto(conversation) });
    })
  );

  router.post(
    "/conversation",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = analyzeConversationSchema.parse(request.body);
      const decision = await classifyConversationForUser({
        userId,
        message: input.message,
        language: input.language,
        history: input.history
      });

      const conversation = input.conversationId
        ? await findConversationOrThrow(userId, input.conversationId)
        : await prisma.conversation.create({
            data: {
              userId,
              title: createConversationTitle(input.message)
            }
          });

      if (decision.messageType !== "learning_candidate") {
        await persistConversationTurn({
          conversationId: conversation.id,
          message: input.message,
          messageType: decision.messageType,
          reply: decision.reply,
          tags: decision.tags
        });
        response.json({
          ...decision,
          conversationId: conversation.id,
          shouldSave: false
        });
        return;
      }

      const result = await analyzeTextForUser({
        userId,
        text: input.message,
        language: input.language,
        tags: decision.tags
      });
      const item = await findStudyItemDetailOrThrow(userId, result.studyItemId);

      await persistConversationTurn({
        conversationId: conversation.id,
        message: input.message,
        messageType: decision.messageType,
        reply: decision.reply,
        tags: decision.tags,
        studyItemId: item.id
      });

      response.status(result.cached ? 200 : 201).json({
        ...decision,
        conversationId: conversation.id,
        shouldSave: true,
        item: toStudyItemDetailDto(item),
        analysis: result.analysis,
        cached: result.cached,
        modelName: result.modelName
      });
    })
  );

  router.post("/conversation/stream", async (request, response, next) => {
    const reasoningStreamer = new ReasoningSseStreamer(response);

    try {
      const { userId } = getAuth(request);
      const input = analyzeConversationSchema.parse(request.body);
      let classificationReasoning = "";
      let analysisReasoning = "";

      response.status(200);
      response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.setHeader("X-Accel-Buffering", "no");
      response.flushHeaders();

      const conversation = input.conversationId
        ? await findConversationOrThrow(userId, input.conversationId)
        : await prisma.conversation.create({
            data: {
              userId,
              title: createConversationTitle(input.message)
            }
          });
      const userMessage = await persistStreamingUserMessage(conversation.id, input.message);
      writeSseEvent(response, { type: "conversation", conversationId: conversation.id });
      const replyStreamer = new StructuredReplyStreamer(response);

      const onClassificationReasoningDelta = (delta: string) => {
        classificationReasoning = `${classificationReasoning}${delta}`.slice(-100_000);
        reasoningStreamer.push("classification", delta);
      };
      const decision = await classifyConversationForUser(
        {
          userId,
          message: input.message,
          language: input.language,
          history: input.history
        },
        {
          onReasoningDelta: onClassificationReasoningDelta,
          onContentDelta: (delta) => replyStreamer.push(delta)
        }
      );
      reasoningStreamer.flush();
      replyStreamer.finish(decision.reply);

      if (decision.messageType !== "learning_candidate") {
        const data = {
          ...decision,
          conversationId: conversation.id,
          shouldSave: false,
          reasoning: optionalString(classificationReasoning),
          classificationReasoning: optionalString(classificationReasoning)
        };
        await persistStreamingAssistantMessage({
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          messageType: decision.messageType,
          reply: decision.reply,
          tags: decision.tags,
          reasoning: optionalString(classificationReasoning),
          classificationReasoning: optionalString(classificationReasoning)
        });
        reasoningStreamer.flush();
        writeSseEvent(response, { type: "result", data });
        response.end();
        return;
      }

      const normalizedText = normalizeStudyText(input.message);
      const analysisStreamer = new StructuredAnalysisStreamer(response, {
        originalText: input.message.trim(),
        normalizedText,
        language: input.language?.trim() || "en",
        itemType: classifyStudyText(input.message, normalizedText)
      });
      analysisStreamer.start();
      const onAnalysisReasoningDelta = (delta: string) => {
        analysisReasoning = `${analysisReasoning}${delta}`.slice(-100_000);
        reasoningStreamer.push("analysis", delta);
      };

      const result = await analyzeTextForUser(
        {
          userId,
          text: input.message,
          language: input.language,
          tags: decision.tags
        },
        {
          onReasoningDelta: onAnalysisReasoningDelta,
          onContentDelta: (delta) => analysisStreamer.push(delta)
        }
      );
      reasoningStreamer.flush();
      analysisStreamer.finish(result.analysis);
      const item = await findStudyItemDetailOrThrow(userId, result.studyItemId);
      const data = {
        ...decision,
        conversationId: conversation.id,
        shouldSave: true,
        reasoning: optionalString(`${classificationReasoning}\n\n${analysisReasoning}`),
        classificationReasoning: optionalString(classificationReasoning),
        analysisReasoning: optionalString(analysisReasoning),
        item: toStudyItemDetailDto(item),
        analysis: result.analysis,
        cached: result.cached,
        modelName: result.modelName
      };

      await persistStreamingAssistantMessage({
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        messageType: decision.messageType,
        reply: decision.reply,
        tags: decision.tags,
        studyItemId: item.id,
        reasoning: optionalString(`${classificationReasoning}\n\n${analysisReasoning}`),
        classificationReasoning: optionalString(classificationReasoning),
        analysisReasoning: optionalString(analysisReasoning)
      });
      reasoningStreamer.flush();
      writeSseEvent(response, { type: "result", data });
      response.end();
    } catch (error) {
      reasoningStreamer.flush();
      if (!response.headersSent) {
        next(error);
        return;
      }

      writeSseEvent(response, {
        type: "error",
        code: error instanceof ApiError ? error.code : undefined,
        message: getStreamingErrorMessage(error)
      });
      response.end();
    }
  });

  router.post(
    "/analyze",
    asyncHandler(async (request, response) => {
      const { userId } = getAuth(request);
      const input = analyzeTextSchema.parse(request.body);
      const result = await analyzeTextForUser({
        userId,
        text: input.text,
        language: input.language,
        sourceNote: optionalString(input.sourceNote),
        sourceType: input.sourceType,
        tags: input.tags
      });
      const item = await findStudyItemDetailOrThrow(userId, result.studyItemId);

      response.status(result.cached ? 200 : 201).json({
        item: toStudyItemDetailDto(item),
        analysis: result.analysis,
        cached: result.cached,
        modelName: result.modelName
      });
    })
  );

  return router;
}

async function findConversationOrThrow(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true }
  });

  if (!conversation) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found");
  }

  return conversation;
}

async function persistConversationTurn(input: {
  conversationId: string;
  message: string;
  messageType: "learning_candidate" | "follow_up" | "unrelated";
  reply: string;
  tags: string[];
  studyItemId?: string;
  reasoning?: string;
  classificationReasoning?: string;
  analysisReasoning?: string;
}) {
  await prisma.$transaction(async (transaction) => {
    const latest = await transaction.conversationMessage.aggregate({
      where: { conversationId: input.conversationId },
      _max: { messageIndex: true }
    });
    const firstIndex = (latest._max.messageIndex ?? -1) + 1;

    await transaction.conversationMessage.create({
      data: {
        conversationId: input.conversationId,
        role: "user",
        content: input.message.trim(),
        messageIndex: firstIndex,
        messageType: input.messageType,
        shouldSave: input.messageType === "learning_candidate",
        tags: input.tags,
        studyItemId: input.studyItemId
      }
    });
    await transaction.conversationMessage.create({
      data: {
        conversationId: input.conversationId,
        role: "assistant",
        content: input.reply,
        messageIndex: firstIndex + 1,
        messageType: input.messageType,
        shouldSave: input.messageType === "learning_candidate",
        tags: input.tags,
        studyItemId: input.studyItemId,
        reasoning: input.reasoning,
        classificationReasoning: input.classificationReasoning,
        analysisReasoning: input.analysisReasoning
      }
    });
    await transaction.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() }
    });
  });
}

async function persistStreamingUserMessage(conversationId: string, message: string) {
  return prisma.$transaction(async (transaction) => {
    const latest = await transaction.conversationMessage.aggregate({
      where: { conversationId },
      _max: { messageIndex: true }
    });
    const userMessage = await transaction.conversationMessage.create({
      data: {
        conversationId,
        role: "user",
        content: message.trim(),
        messageIndex: (latest._max.messageIndex ?? -1) + 1,
        shouldSave: false,
        tags: []
      }
    });

    await transaction.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return userMessage;
  });
}

async function persistStreamingAssistantMessage(input: {
  conversationId: string;
  userMessageId: string;
  messageType: "learning_candidate" | "follow_up" | "unrelated";
  reply: string;
  tags: string[];
  studyItemId?: string;
  reasoning?: string;
  classificationReasoning?: string;
  analysisReasoning?: string;
}) {
  await prisma.$transaction(async (transaction) => {
    const latest = await transaction.conversationMessage.aggregate({
      where: { conversationId: input.conversationId },
      _max: { messageIndex: true }
    });

    await transaction.conversationMessage.update({
      where: { id: input.userMessageId },
      data: {
        messageType: input.messageType,
        shouldSave: input.messageType === "learning_candidate",
        tags: input.tags,
        studyItemId: input.studyItemId
      }
    });
    await transaction.conversationMessage.create({
      data: {
        conversationId: input.conversationId,
        role: "assistant",
        content: input.reply,
        messageIndex: (latest._max.messageIndex ?? -1) + 1,
        messageType: input.messageType,
        shouldSave: input.messageType === "learning_candidate",
        tags: input.tags,
        studyItemId: input.studyItemId,
        reasoning: input.reasoning,
        classificationReasoning: input.classificationReasoning,
        analysisReasoning: input.analysisReasoning
      }
    });
    await transaction.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() }
    });
  });
}

function createConversationTitle(message: string): string {
  const compact = message.trim().replace(/\s+/g, " ");
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

function getRequiredParam(value: string | undefined, label: string): string {
  if (!value) {
    throw new ApiError(400, "PARAM_REQUIRED", `${label} is required`);
  }

  return value;
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

interface SseResponse {
  write: (chunk: string) => unknown;
  flush?: () => unknown;
}

function writeSseEvent(response: SseResponse, event: unknown): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
  response.flush?.();
}

class ReasoningSseStreamer {
  private readonly pending = { classification: "", analysis: "" };
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private readonly response: SseResponse) {}

  push(phase: "classification" | "analysis", delta: string): void {
    this.pending[phase] += delta;
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 32);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    for (const phase of ["classification", "analysis"] as const) {
      const delta = this.pending[phase];
      if (!delta) {
        continue;
      }

      this.pending[phase] = "";
      writeSseEvent(this.response, { type: "reasoning_delta", phase, delta });
    }
  }
}

class StructuredReplyStreamer {
  private content = "";
  private emittedReply = "";

  constructor(private readonly response: SseResponse) {}

  push(delta: string): void {
    this.content += delta;
    const reply = extractTopLevelJsonString(this.content, "reply");
    if (reply === undefined || !reply.startsWith(this.emittedReply)) {
      return;
    }

    const nextDelta = reply.slice(this.emittedReply.length);
    if (nextDelta) {
      this.emittedReply = reply;
      writeSseEvent(this.response, { type: "content_delta", delta: nextDelta });
    }
  }

  finish(reply: string): void {
    const remainder = reply.startsWith(this.emittedReply)
      ? reply.slice(this.emittedReply.length)
      : reply;

    if (!reply.startsWith(this.emittedReply)) {
      this.emittedReply = "";
    }
    if (remainder) {
      writeSseEvent(this.response, { type: "content_delta", delta: remainder });
    }
    this.emittedReply = reply;
  }
}

class StructuredAnalysisStreamer {
  private content = "";
  private lastSnapshot = "";

  constructor(
    private readonly response: SseResponse,
    private readonly base: StreamingTextAnalysisBase
  ) {}

  start(): void {
    this.emit(createStreamingTextAnalysisSnapshot("", this.base));
  }

  push(delta: string): void {
    this.content += delta;
    this.emit(createStreamingTextAnalysisSnapshot(this.content, this.base));
  }

  finish(analysis: TextAnalysisJson): void {
    this.emit(analysis);
  }

  private emit(analysis: TextAnalysisJson): void {
    const snapshot = JSON.stringify(analysis);
    if (snapshot === this.lastSnapshot) {
      return;
    }

    this.lastSnapshot = snapshot;
    writeSseEvent(this.response, { type: "analysis_delta", analysis });
  }
}

export function extractJsonStringField(content: string, field: string): string | undefined {
  return extractTopLevelJsonString(content, field);
}

function getStreamingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message === "AI provider request timed out") {
    return "AI provider request timed out. Try again or use a faster model.";
  }

  return "Conversation stream failed";
}
