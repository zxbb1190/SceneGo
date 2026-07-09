import {
  VocabularyMasteryStatus as PrismaVocabularyMasteryStatus,
  type LearningProject,
  type StudyItem,
  type SubtitleLine,
  type VocabularyItem
} from "@prisma/client";
import type { VocabularyMasteryStatus } from "@scenego/shared";
import {
  PRISMA_TO_STUDY_ITEM_TYPE,
  PRISMA_TO_STUDY_SOURCE_TYPE
} from "./studyEnums.js";

export const VOCABULARY_MASTERY_STATUS_TO_PRISMA = {
  new: PrismaVocabularyMasteryStatus.NEW,
  learning: PrismaVocabularyMasteryStatus.LEARNING,
  mastered: PrismaVocabularyMasteryStatus.MASTERED
} satisfies Record<VocabularyMasteryStatus, PrismaVocabularyMasteryStatus>;

export const PRISMA_TO_VOCABULARY_MASTERY_STATUS = {
  [PrismaVocabularyMasteryStatus.NEW]: "new",
  [PrismaVocabularyMasteryStatus.LEARNING]: "learning",
  [PrismaVocabularyMasteryStatus.MASTERED]: "mastered"
} satisfies Record<PrismaVocabularyMasteryStatus, VocabularyMasteryStatus>;

export type VocabularyRecord = VocabularyItem & {
  project?: Pick<LearningProject, "id" | "title" | "language"> | null;
  subtitleLine?: Pick<SubtitleLine, "id" | "lineIndex" | "startTime" | "endTime" | "textOriginal"> | null;
  studyItem?: Pick<StudyItem, "id" | "itemType" | "textOriginal" | "sourceType"> | null;
};

export function toVocabularyDto(item: VocabularyRecord) {
  return {
    id: item.id,
    userId: item.userId,
    projectId: item.projectId ?? undefined,
    subtitleLineId: item.subtitleLineId ?? undefined,
    studyItemId: item.studyItemId ?? undefined,
    word: item.word,
    meaning: item.meaning ?? undefined,
    language: item.language,
    sourceText: item.sourceText ?? undefined,
    sourceType: item.sourceType ? PRISMA_TO_STUDY_SOURCE_TYPE[item.sourceType] : undefined,
    note: item.note ?? undefined,
    masteryStatus: PRISMA_TO_VOCABULARY_MASTERY_STATUS[item.masteryStatus],
    project: item.project
      ? {
          id: item.project.id,
          title: item.project.title,
          language: item.project.language
        }
      : undefined,
    subtitleLine: item.subtitleLine
      ? {
          id: item.subtitleLine.id,
          lineIndex: item.subtitleLine.lineIndex,
          startTime: item.subtitleLine.startTime,
          endTime: item.subtitleLine.endTime,
          textOriginal: item.subtitleLine.textOriginal
      }
      : undefined,
    studyItem: item.studyItem
      ? {
          id: item.studyItem.id,
          itemType: PRISMA_TO_STUDY_ITEM_TYPE[item.studyItem.itemType],
          textOriginal: item.studyItem.textOriginal,
          sourceType: PRISMA_TO_STUDY_SOURCE_TYPE[item.studyItem.sourceType]
        }
      : undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}
