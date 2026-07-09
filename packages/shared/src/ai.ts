export interface SentenceTokenAnalysis {
  text: string;
  lemma?: string;
  partOfSpeech?: string;
  meaning: string;
  note?: string;
}

export interface GrammarPoint {
  title: string;
  explanation: string;
  examples?: string[];
}

export interface SentenceAnalysisJson {
  originalText: string;
  language: string;
  translation: string;
  tokens: SentenceTokenAnalysis[];
  grammar: GrammarPoint[];
  usageNotes: string[];
  similarExpressions: string[];
}

export type TextInputType = "word" | "phrase" | "sentence" | "paragraph" | "mixed";

export interface TextChunkAnalysis {
  text: string;
  meaning: string;
  note?: string;
}

export interface TextVocabularyAnalysis {
  word: string;
  lemma?: string;
  partOfSpeech?: string;
  meaning: string;
  example?: string;
  note?: string;
}

export interface TextGrammarAnalysis {
  title: string;
  explanation: string;
  examples?: string[];
}

export interface TextAnalysisJson {
  originalText: string;
  normalizedText: string;
  language: string;
  itemType: TextInputType;
  translation: string;
  summary: string;
  chunks: TextChunkAnalysis[];
  vocabulary: TextVocabularyAnalysis[];
  grammar: TextGrammarAnalysis[];
  naturalUsage: string[];
  similarExpressions: string[];
  examples: string[];
  memoryTips: string[];
}

export interface AiSentenceAnalysisRequest {
  projectId: string;
  subtitleLineId?: string;
  language: string;
  text: string;
  contextBefore?: string;
  contextAfter?: string;
}

export interface AiSentenceAnalysisResult {
  cacheKey: {
    projectId: string;
    subtitleLineId?: string;
    language: string;
  };
  modelName?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  analysis: SentenceAnalysisJson;
}

export interface AiTextAnalysisRequest {
  userId: string;
  studyItemId: string;
  language: string;
  itemType: TextInputType;
  text: string;
  normalizedText: string;
  sourceNote?: string;
  tags?: string[];
}

export interface AiTextAnalysisResult {
  cacheKey: {
    studyItemId: string;
    language: string;
  };
  modelName?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  analysis: TextAnalysisJson;
}

export interface AnalyzeSentenceApiResponse {
  analysisId: string;
  cached: boolean;
  modelName?: string;
  analysis: SentenceAnalysisJson;
}

export const AI_ANALYSIS_CACHE_FIELDS = [
  "project_id",
  "subtitle_line_id",
  "language"
] as const;
