export const SOURCE_TYPES = [
  "local_file",
  "network_url",
  "external_embed",
  "official_licensed",
  "public_domain",
  "creative_commons"
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export type ProjectStatus = "active" | "archived";

export type SentenceProgressStatus = "viewed" | "learning" | "mastered";

export type VocabularyMasteryStatus = "new" | "learning" | "mastered";

export type StudyItemType = "word" | "phrase" | "sentence" | "paragraph" | "mixed";

export type StudySourceType = "manual_input" | "video_subtitle" | "external_manual";

export type StudyItemMasteryStatus = "new" | "learning" | "mastered";

export interface User {
  id: string;
  email: string;
  nickname?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProject {
  id: string;
  userId: string;
  title: string;
  language: string;
  sourceType: SourceType;
  sourceUrl?: string;
  videoFileName?: string;
  subtitleFileName?: string;
  duration?: number;
  lastPosition: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProjectSummary extends LearningProject {
  subtitleLineCount: number;
  learnedSentenceCount: number;
  favoriteSentenceCount: number;
  vocabularyCount: number;
}

export interface CreateLearningProjectInput {
  title: string;
  language: string;
  sourceType: SourceType;
  sourceUrl?: string;
  videoFileName?: string;
  subtitleFileName?: string;
  subtitleText?: string;
  subtitleFormat?: "srt" | "vtt";
  duration?: number;
}

export interface UpdateLearningProjectInput {
  title?: string;
  language?: string;
  sourceUrl?: string | null;
  videoFileName?: string | null;
  subtitleFileName?: string | null;
  duration?: number | null;
  lastPosition?: number;
  status?: ProjectStatus;
}

export interface ImportProjectSubtitlesInput {
  subtitleText: string;
  subtitleFileName?: string;
  subtitleFormat?: "srt" | "vtt";
}

export interface SubtitleLine {
  id: string;
  projectId: string;
  lineIndex: number;
  startTime: number;
  endTime: number;
  textOriginal: string;
  textTranslation?: string;
  createdAt: string;
}

export interface UserSentenceProgress {
  id: string;
  userId: string;
  projectId: string;
  subtitleLineId?: string;
  manualText?: string;
  status: SentenceProgressStatus;
  listenCount: number;
  isFavorite: boolean;
  note?: string;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SentenceProgressSummary extends UserSentenceProgress {
  textOriginal?: string;
  project?: {
    id: string;
    title: string;
    language: string;
    sourceType: SourceType;
  };
  subtitleLine?: {
    id: string;
    lineIndex: number;
    startTime: number;
    endTime: number;
    textOriginal: string;
  };
}

export interface UpsertSentenceProgressInput {
  projectId: string;
  subtitleLineId?: string;
  manualText?: string;
  status?: SentenceProgressStatus;
  listenCountIncrement?: number;
  isFavorite?: boolean;
  note?: string | null;
}

export interface VocabularyItem {
  id: string;
  userId: string;
  projectId?: string;
  subtitleLineId?: string;
  studyItemId?: string;
  word: string;
  meaning?: string;
  language: string;
  sourceText?: string;
  sourceType?: StudySourceType;
  note?: string;
  masteryStatus: VocabularyMasteryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyItemSummary extends VocabularyItem {
  project?: {
    id: string;
    title: string;
    language: string;
  };
  subtitleLine?: {
    id: string;
    lineIndex: number;
    startTime: number;
    endTime: number;
    textOriginal: string;
  };
  studyItem?: {
    id: string;
    itemType: StudyItemType;
    textOriginal: string;
    sourceType: StudySourceType;
  };
}

export interface CreateVocabularyItemInput {
  projectId?: string;
  subtitleLineId?: string;
  studyItemId?: string;
  word: string;
  meaning?: string;
  language?: string;
  sourceText?: string;
  sourceType?: StudySourceType;
  note?: string;
  masteryStatus?: VocabularyMasteryStatus;
}

export interface UpdateVocabularyItemInput {
  word?: string;
  meaning?: string | null;
  language?: string;
  sourceText?: string | null;
  sourceType?: StudySourceType | null;
  note?: string | null;
  masteryStatus?: VocabularyMasteryStatus;
}

export interface StudyItem {
  id: string;
  userId: string;
  projectId?: string;
  subtitleLineId?: string;
  itemType: StudyItemType;
  sourceType: StudySourceType;
  language: string;
  textOriginal: string;
  normalizedText: string;
  sourceNote?: string;
  tags: string[];
  isFavorite: boolean;
  masteryStatus: StudyItemMasteryStatus;
  reviewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyItemSummary extends StudyItem {
  translation?: string;
  summary?: string;
  note?: string;
  vocabularyCount: number;
}

export type FavoriteSentenceSource = "sentence_progress" | "study_item";

export interface FavoriteSentenceSummary {
  id: string;
  source: FavoriteSentenceSource;
  userId: string;
  textOriginal: string;
  translation?: string;
  note?: string;
  isFavorite: boolean;
  language?: string;
  projectId?: string;
  subtitleLineId?: string;
  project?: SentenceProgressSummary["project"];
  subtitleLine?: SentenceProgressSummary["subtitleLine"];
  studyItem?: Pick<
    StudyItemSummary,
    "id" | "itemType" | "sourceType" | "sourceNote" | "masteryStatus"
  >;
  createdAt: string;
  updatedAt: string;
}

export interface StudyItemDetail extends StudyItemSummary {
  analysis?: import("./ai.js").TextAnalysisJson;
  notes: Array<{
    id: string;
    noteText: string;
    createdAt: string;
    updatedAt: string;
  }>;
  vocabulary: VocabularyItemSummary[];
}

export interface AnalyzeTextInput {
  text: string;
  language?: string;
  sourceNote?: string;
  tags?: string[];
  sourceType?: StudySourceType;
}

export interface AnalyzeTextApiResponse {
  item: StudyItemDetail;
  analysis: import("./ai.js").TextAnalysisJson;
  cached: boolean;
  modelName?: string;
}

export interface StudyItemListFilters {
  keyword?: string;
  itemType?: StudyItemType;
  sourceType?: StudySourceType;
  tag?: string;
  isFavorite?: boolean;
}

export interface UpdateStudyItemInput {
  isFavorite?: boolean;
  masteryStatus?: StudyItemMasteryStatus;
  sourceNote?: string | null;
  tags?: string[];
  reviewCountIncrement?: number;
}

export interface UpdateStudyItemNoteInput {
  note: string;
}
