import { z } from "zod";

export const sentenceAnalysisJsonSchema = z.object({
  originalText: z.string(),
  language: z.string(),
  translation: z.string(),
  tokens: z.array(
    z.object({
      text: z.string(),
      lemma: z.string().optional(),
      partOfSpeech: z.string().optional(),
      meaning: z.string(),
      note: z.string().optional()
    })
  ),
  grammar: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      examples: z.array(z.string()).optional()
    })
  ),
  usageNotes: z.array(z.string()),
  similarExpressions: z.array(z.string())
});

export type SentenceAnalysisJsonSchema = z.infer<typeof sentenceAnalysisJsonSchema>;

export const textAnalysisJsonSchema = z.object({
  originalText: z.string(),
  normalizedText: z.string(),
  language: z.string(),
  itemType: z.enum(["word", "phrase", "sentence", "paragraph", "mixed"]),
  translation: z.string(),
  summary: z.string(),
  chunks: z.array(
    z.object({
      text: z.string(),
      meaning: z.string(),
      note: z.string().optional()
    })
  ),
  vocabulary: z.array(
    z.object({
      word: z.string(),
      lemma: z.string().optional(),
      partOfSpeech: z.string().optional(),
      meaning: z.string(),
      example: z.string().optional(),
      note: z.string().optional()
    })
  ),
  grammar: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      examples: z.array(z.string()).optional()
    })
  ),
  naturalUsage: z.array(z.string()),
  similarExpressions: z.array(z.string()),
  examples: z.array(z.string()),
  memoryTips: z.array(z.string())
});

export type TextAnalysisJsonSchema = z.infer<typeof textAnalysisJsonSchema>;
