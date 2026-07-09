import type {
  StudyItem,
  StudyItemAnalysis,
  UserNote,
  VocabularyItem
} from "@prisma/client";
import { textAnalysisJsonSchema } from "../adapters/ai/analysisSchema.js";
import { toVocabularyDto, type VocabularyRecord } from "./vocabularyDtos.js";
import {
  PRISMA_TO_STUDY_ITEM_MASTERY_STATUS,
  PRISMA_TO_STUDY_ITEM_TYPE,
  PRISMA_TO_STUDY_SOURCE_TYPE
} from "./studyEnums.js";

export type StudyItemRecord = StudyItem & {
  analysis?: StudyItemAnalysis | null;
  notes?: UserNote[];
  vocabularyItems?: VocabularyRecord[];
  _count?: {
    vocabularyItems?: number;
  };
};

export function toStudyItemSummaryDto(item: StudyItemRecord) {
  const analysis = item.analysis?.analysisJson
    ? textAnalysisJsonSchema.safeParse(item.analysis.analysisJson)
    : null;

  return {
    id: item.id,
    userId: item.userId,
    projectId: item.projectId ?? undefined,
    subtitleLineId: item.subtitleLineId ?? undefined,
    itemType: PRISMA_TO_STUDY_ITEM_TYPE[item.itemType],
    sourceType: PRISMA_TO_STUDY_SOURCE_TYPE[item.sourceType],
    language: item.language,
    textOriginal: item.textOriginal,
    normalizedText: item.normalizedText,
    sourceNote: item.sourceNote ?? undefined,
    tags: parseTags(item.tags),
    isFavorite: item.isFavorite,
    masteryStatus: PRISMA_TO_STUDY_ITEM_MASTERY_STATUS[item.masteryStatus],
    reviewCount: item.reviewCount,
    lastViewedAt: item.lastViewedAt?.toISOString(),
    translation: analysis?.success ? analysis.data.translation : undefined,
    summary: analysis?.success ? analysis.data.summary : undefined,
    note: item.notes?.[0]?.noteText,
    vocabularyCount: item._count?.vocabularyItems ?? item.vocabularyItems?.length ?? 0,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function toStudyItemDetailDto(item: StudyItemRecord) {
  const summary = toStudyItemSummaryDto(item);
  const parsedAnalysis = item.analysis?.analysisJson
    ? textAnalysisJsonSchema.safeParse(item.analysis.analysisJson)
    : null;

  return {
    ...summary,
    analysis: parsedAnalysis?.success ? parsedAnalysis.data : undefined,
    notes: (item.notes ?? []).map((note) => ({
      id: note.id,
      noteText: note.noteText,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString()
    })),
    vocabulary: (item.vocabularyItems ?? []).map((vocabulary) =>
      toVocabularyDto(vocabulary as VocabularyItem & VocabularyRecord)
    )
  };
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
}
