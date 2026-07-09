import {
  SentenceProgressStatus as PrismaSentenceProgressStatus,
  type LearningProject,
  type SubtitleLine,
  type UserSentenceProgress
} from "@prisma/client";
import type { SentenceProgressStatus } from "@scenego/shared";
import { PRISMA_TO_SOURCE_TYPE } from "./projectDtos.js";

export const SENTENCE_PROGRESS_STATUS_TO_PRISMA = {
  viewed: PrismaSentenceProgressStatus.VIEWED,
  learning: PrismaSentenceProgressStatus.LEARNING,
  mastered: PrismaSentenceProgressStatus.MASTERED
} satisfies Record<SentenceProgressStatus, PrismaSentenceProgressStatus>;

export const PRISMA_TO_SENTENCE_PROGRESS_STATUS = {
  [PrismaSentenceProgressStatus.VIEWED]: "viewed",
  [PrismaSentenceProgressStatus.LEARNING]: "learning",
  [PrismaSentenceProgressStatus.MASTERED]: "mastered"
} satisfies Record<PrismaSentenceProgressStatus, SentenceProgressStatus>;

export type SentenceProgressRecord = UserSentenceProgress & {
  project?: Pick<LearningProject, "id" | "title" | "language" | "sourceType">;
  subtitleLine?: Pick<SubtitleLine, "id" | "lineIndex" | "startTime" | "endTime" | "textOriginal"> | null;
};

export function toSentenceProgressDto(progress: SentenceProgressRecord) {
  return {
    id: progress.id,
    userId: progress.userId,
    projectId: progress.projectId,
    subtitleLineId: progress.subtitleLineId ?? undefined,
    manualText: progress.manualText ?? undefined,
    status: PRISMA_TO_SENTENCE_PROGRESS_STATUS[progress.status],
    listenCount: progress.listenCount,
    isFavorite: progress.isFavorite,
    note: progress.note ?? undefined,
    lastViewedAt: progress.lastViewedAt?.toISOString(),
    textOriginal: progress.subtitleLine?.textOriginal ?? progress.manualText ?? undefined,
    project: progress.project
      ? {
          id: progress.project.id,
          title: progress.project.title,
          language: progress.project.language,
          sourceType: PRISMA_TO_SOURCE_TYPE[progress.project.sourceType]
        }
      : undefined,
    subtitleLine: progress.subtitleLine
      ? {
          id: progress.subtitleLine.id,
          lineIndex: progress.subtitleLine.lineIndex,
          startTime: progress.subtitleLine.startTime,
          endTime: progress.subtitleLine.endTime,
          textOriginal: progress.subtitleLine.textOriginal
        }
      : undefined,
    createdAt: progress.createdAt.toISOString(),
    updatedAt: progress.updatedAt.toISOString()
  };
}

