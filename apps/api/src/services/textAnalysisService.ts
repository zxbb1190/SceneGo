import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { StudyItemType, StudySourceType, TextAnalysisJson } from "@scenego/shared";
import { textAnalysisJsonSchema } from "../adapters/ai/analysisSchema.js";
import { createAiProvider } from "../adapters/ai/providerFactory.js";
import type { AiStreamCallbacks } from "../adapters/ai/types.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import {
  STUDY_ITEM_TYPE_TO_PRISMA,
  STUDY_SOURCE_TYPE_TO_PRISMA
} from "../routes/studyEnums.js";

export interface AnalyzeTextForUserInput {
  userId: string;
  text: string;
  language?: string;
  sourceNote?: string;
  sourceType?: StudySourceType;
  tags?: string[];
}

export interface AnalyzeTextForUserResult {
  studyItemId: string;
  cached: boolean;
  modelName?: string;
  analysis: TextAnalysisJson;
}

export async function analyzeTextForUser(
  input: AnalyzeTextForUserInput,
  callbacks?: AiStreamCallbacks
): Promise<AnalyzeTextForUserResult> {
  const normalizedText = normalizeStudyText(input.text);
  if (!normalizedText) {
    throw new ApiError(400, "TEXT_REQUIRED", "Text is required");
  }

  const language = input.language?.trim() || "en";
  const itemType = classifyStudyText(input.text, normalizedText);
  const normalizedTextHash = hashStudyText(normalizedText);
  const tags = sanitizeTags(input.tags);
  const sourceType = input.sourceType ?? "manual_input";
  const now = new Date();
  const existing = await prisma.studyItem.findUnique({
    where: {
      userId_normalizedTextHash_language: {
        userId: input.userId,
        normalizedTextHash,
        language
      }
    },
    include: {
      analysis: true
    }
  });

  if (existing?.analysis) {
    const analysis = textAnalysisJsonSchema.parse(existing.analysis.analysisJson);
    await prisma.studyItem.update({
      where: { id: existing.id },
      data: {
        sourceNote: input.sourceNote ?? undefined,
        sourceType: STUDY_SOURCE_TYPE_TO_PRISMA[sourceType],
        tags: input.tags ? (tags as Prisma.InputJsonArray) : undefined,
        reviewCount: { increment: 1 },
        lastViewedAt: now
      }
    });

    return {
      studyItemId: existing.id,
      cached: true,
      modelName: existing.analysis.modelName ?? undefined,
      analysis
    };
  }

  const provider = createAiProvider();
  if (!provider) {
    throw new ApiError(
      503,
      "AI_PROVIDER_NOT_CONFIGURED",
      "AI provider is not configured. Set OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, and AI_MODEL."
    );
  }

  const studyItem =
    existing ??
    (await prisma.studyItem.create({
      data: {
        userId: input.userId,
        itemType: STUDY_ITEM_TYPE_TO_PRISMA[itemType],
        sourceType: STUDY_SOURCE_TYPE_TO_PRISMA[sourceType],
        language,
        textOriginal: input.text.trim(),
        normalizedText,
        normalizedTextHash,
        sourceNote: input.sourceNote,
        tags: tags as Prisma.InputJsonArray,
        reviewCount: 1,
        lastViewedAt: now
      }
    }));

  if (existing) {
    await prisma.studyItem.update({
      where: { id: existing.id },
      data: {
        itemType: STUDY_ITEM_TYPE_TO_PRISMA[itemType],
        sourceType: STUDY_SOURCE_TYPE_TO_PRISMA[sourceType],
        textOriginal: input.text.trim(),
        sourceNote: input.sourceNote ?? undefined,
        tags: input.tags ? (tags as Prisma.InputJsonArray) : undefined,
        reviewCount: { increment: 1 },
        lastViewedAt: now
      }
    });
  }

  const result = await provider.analyzeText({
    userId: input.userId,
    studyItemId: studyItem.id,
    language,
    itemType,
    text: input.text.trim(),
    normalizedText,
    sourceNote: input.sourceNote,
    tags
  }, callbacks);

  await prisma.studyItemAnalysis.upsert({
    where: { studyItemId: studyItem.id },
    create: {
      studyItemId: studyItem.id,
      language,
      analysisJson: result.analysis as unknown as Prisma.InputJsonObject,
      modelName: result.modelName
    },
    update: {
      language,
      analysisJson: result.analysis as unknown as Prisma.InputJsonObject,
      modelName: result.modelName
    }
  });

  await prisma.aiUsageLog.create({
    data: {
      userId: input.userId,
      studyItemId: studyItem.id,
      actionType: "text_analysis",
      sourceType: STUDY_SOURCE_TYPE_TO_PRISMA[sourceType],
      inputHash: normalizedTextHash,
      modelName: result.modelName,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      totalTokens: result.usage?.totalTokens
    }
  });

  return {
    studyItemId: studyItem.id,
    cached: false,
    modelName: result.modelName,
    analysis: result.analysis
  };
}

export function normalizeStudyText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hashStudyText(normalizedText: string): string {
  return createHash("sha256").update(normalizedText).digest("hex");
}

export function sanitizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags ?? []) {
    const normalizedTag = tag.trim().slice(0, 32);
    if (!normalizedTag || seen.has(normalizedTag)) {
      continue;
    }

    normalizedTags.push(normalizedTag);
    seen.add(normalizedTag);

    if (normalizedTags.length >= 12) {
      break;
    }
  }

  return normalizedTags;
}

export function classifyStudyText(originalText: string, normalizedText: string): StudyItemType {
  const lineCount = originalText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const words = normalizedText.match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  const sentenceCount = normalizedText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;

  if (lineCount > 1 && sentenceCount <= 1) {
    return "mixed";
  }

  if (words.length === 1 && /^[a-z]+(?:['-][a-z]+)?$/.test(normalizedText)) {
    return "word";
  }

  if (sentenceCount > 1 || words.length > 35 || normalizedText.length > 180) {
    return "paragraph";
  }

  if (words.length > 1 && words.length <= 5 && !/[.!?。！？]/.test(normalizedText)) {
    return "phrase";
  }

  if (words.length > 0) {
    return "sentence";
  }

  return "mixed";
}
