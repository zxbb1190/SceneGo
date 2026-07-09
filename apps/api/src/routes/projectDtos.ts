import {
  ProjectStatus as PrismaProjectStatus,
  SourceType as PrismaSourceType,
  SentenceProgressStatus,
  type LearningProject as PrismaLearningProject,
  type SubtitleLine as PrismaSubtitleLine
} from "@prisma/client";
import type { ProjectStatus, SourceType } from "@scenego/shared";

export const SOURCE_TYPE_TO_PRISMA = {
  local_file: PrismaSourceType.LOCAL_FILE,
  network_url: PrismaSourceType.NETWORK_URL,
  external_embed: PrismaSourceType.EXTERNAL_EMBED,
  official_licensed: PrismaSourceType.OFFICIAL_LICENSED,
  public_domain: PrismaSourceType.PUBLIC_DOMAIN,
  creative_commons: PrismaSourceType.CREATIVE_COMMONS
} satisfies Record<SourceType, PrismaSourceType>;

export const PRISMA_TO_SOURCE_TYPE = {
  [PrismaSourceType.LOCAL_FILE]: "local_file",
  [PrismaSourceType.NETWORK_URL]: "network_url",
  [PrismaSourceType.EXTERNAL_EMBED]: "external_embed",
  [PrismaSourceType.OFFICIAL_LICENSED]: "official_licensed",
  [PrismaSourceType.PUBLIC_DOMAIN]: "public_domain",
  [PrismaSourceType.CREATIVE_COMMONS]: "creative_commons"
} satisfies Record<PrismaSourceType, SourceType>;

export const PROJECT_STATUS_TO_PRISMA = {
  active: PrismaProjectStatus.ACTIVE,
  archived: PrismaProjectStatus.ARCHIVED
} satisfies Record<ProjectStatus, PrismaProjectStatus>;

export const PRISMA_TO_PROJECT_STATUS = {
  [PrismaProjectStatus.ACTIVE]: "active",
  [PrismaProjectStatus.ARCHIVED]: "archived"
} satisfies Record<PrismaProjectStatus, ProjectStatus>;

export const LEARNED_SENTENCE_STATUSES = [
  SentenceProgressStatus.VIEWED,
  SentenceProgressStatus.LEARNING,
  SentenceProgressStatus.MASTERED
] as const;

export type ProjectWithSubtitleCount = PrismaLearningProject & {
  _count: {
    subtitleLines: number;
  };
};

export type ProjectDetailRecord = PrismaLearningProject & {
  subtitleLines: PrismaSubtitleLine[];
  _count: {
    subtitleLines: number;
  };
};

export function toProjectDto(
  project: ProjectWithSubtitleCount,
  counts: {
    learnedSentenceCount?: number;
    favoriteSentenceCount?: number;
    vocabularyCount?: number;
  } = {}
) {
  return {
    id: project.id,
    userId: project.userId,
    title: project.title,
    language: project.language,
    sourceType: PRISMA_TO_SOURCE_TYPE[project.sourceType],
    sourceUrl: project.sourceUrl ?? undefined,
    videoFileName: project.videoFileName ?? undefined,
    subtitleFileName: project.subtitleFileName ?? undefined,
    duration: project.duration ?? undefined,
    lastPosition: project.lastPosition,
    status: PRISMA_TO_PROJECT_STATUS[project.status],
    subtitleLineCount: project._count.subtitleLines,
    learnedSentenceCount: counts.learnedSentenceCount ?? 0,
    favoriteSentenceCount: counts.favoriteSentenceCount ?? 0,
    vocabularyCount: counts.vocabularyCount ?? 0,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}

export function toSubtitleLineDto(line: PrismaSubtitleLine) {
  return {
    id: line.id,
    projectId: line.projectId,
    lineIndex: line.lineIndex,
    startTime: line.startTime,
    endTime: line.endTime,
    textOriginal: line.textOriginal,
    textTranslation: line.textTranslation ?? undefined,
    createdAt: line.createdAt.toISOString()
  };
}

