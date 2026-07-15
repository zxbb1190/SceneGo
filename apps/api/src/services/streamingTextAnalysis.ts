import type {
  TextAnalysisJson,
  TextChunkAnalysis,
  TextGrammarAnalysis,
  TextVocabularyAnalysis
} from "@scenego/shared";

export type StreamingTextAnalysisBase = Pick<
  TextAnalysisJson,
  "originalText" | "normalizedText" | "language" | "itemType"
>;

export function createStreamingTextAnalysisSnapshot(
  content: string,
  base: StreamingTextAnalysisBase
): TextAnalysisJson {
  return {
    ...base,
    translation: extractTopLevelJsonString(content, "translation") ?? "",
    summary: extractTopLevelJsonString(content, "summary") ?? "",
    chunks: extractObjectArray(content, "chunks", isTextChunkAnalysis),
    vocabulary: extractObjectArray(content, "vocabulary", isTextVocabularyAnalysis),
    grammar: extractObjectArray(content, "grammar", isTextGrammarAnalysis),
    naturalUsage: extractStringArray(content, "naturalUsage"),
    similarExpressions: extractStringArray(content, "similarExpressions"),
    examples: extractStringArray(content, "examples"),
    memoryTips: extractStringArray(content, "memoryTips")
  };
}

export function extractTopLevelJsonString(content: string, field: string): string | undefined {
  const valueStart = findTopLevelFieldValueStart(content, field);
  if (valueStart === undefined || content[valueStart] !== '"') {
    return undefined;
  }

  const parsed = readJsonString(content, valueStart, true);
  return parsed?.value;
}

function extractObjectArray<T>(
  content: string,
  field: string,
  guard: (value: unknown) => value is T
): T[] {
  return extractCompletedArrayItems(content, field).filter(guard);
}

function extractStringArray(content: string, field: string): string[] {
  return extractCompletedArrayItems(content, field).filter((value): value is string => typeof value === "string");
}

function extractCompletedArrayItems(content: string, field: string): unknown[] {
  const valueStart = findTopLevelFieldValueStart(content, field);
  if (valueStart === undefined || content[valueStart] !== "[") {
    return [];
  }

  const items: unknown[] = [];
  let itemStart = -1;
  let nestedDepth = 0;
  let inString = false;
  let escaped = false;

  for (let index = valueStart + 1; index < content.length; index += 1) {
    const character = content[index];

    if (itemStart === -1) {
      if (character === "]") {
        break;
      }
      if (character === "," || /\s/.test(character ?? "")) {
        continue;
      }
      itemStart = index;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === '"') {
        inString = false;
        if (nestedDepth === 0 && content[itemStart] === '"') {
          pushParsedItem(items, content.slice(itemStart, index + 1));
          itemStart = -1;
        }
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      nestedDepth += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      if (character === "]" && nestedDepth === 0) {
        break;
      }
      nestedDepth -= 1;
      if (nestedDepth === 0 && itemStart !== -1) {
        pushParsedItem(items, content.slice(itemStart, index + 1));
        itemStart = -1;
      }
    }
  }

  return items;
}

function pushParsedItem(items: unknown[], rawItem: string): void {
  try {
    items.push(JSON.parse(rawItem) as unknown);
  } catch {
    // The next provider delta may complete the current value.
  }
}

function findTopLevelFieldValueStart(content: string, field: string): number | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === "{" || character === "[") {
      depth += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      depth -= 1;
      continue;
    }
    if (character !== '"') {
      continue;
    }

    const key = readJsonString(content, index, false);
    if (!key) {
      return undefined;
    }
    index = key.endIndex;
    if (depth !== 1 || key.value !== field) {
      continue;
    }

    let colonIndex = index + 1;
    while (/\s/.test(content[colonIndex] ?? "")) {
      colonIndex += 1;
    }
    if (content[colonIndex] !== ":") {
      continue;
    }

    let valueStart = colonIndex + 1;
    while (/\s/.test(content[valueStart] ?? "")) {
      valueStart += 1;
    }
    return valueStart < content.length ? valueStart : undefined;
  }

  return undefined;
}

function readJsonString(
  content: string,
  startIndex: number,
  allowPartial: boolean
): { value: string; endIndex: number } | undefined {
  if (content[startIndex] !== '"') {
    return undefined;
  }

  let rawValue = "";
  for (let index = startIndex + 1; index < content.length; index += 1) {
    const character = content[index];
    if (character === "\\") {
      const escapedCharacter = content[index + 1];
      if (escapedCharacter === undefined) {
        return allowPartial ? parseRawJsonString(rawValue, index) : undefined;
      }
      rawValue += `${character}${escapedCharacter}`;
      index += 1;
      continue;
    }
    if (character === '"') {
      return parseRawJsonString(rawValue, index);
    }
    rawValue += character;
  }

  return allowPartial ? parseRawJsonString(rawValue, content.length - 1) : undefined;
}

function parseRawJsonString(rawValue: string, endIndex: number) {
  try {
    return {
      value: JSON.parse(`"${rawValue}"`) as string,
      endIndex
    };
  } catch {
    return undefined;
  }
}

function isTextChunkAnalysis(value: unknown): value is TextChunkAnalysis {
  return isRecord(value) && typeof value.text === "string" && typeof value.meaning === "string";
}

function isTextVocabularyAnalysis(value: unknown): value is TextVocabularyAnalysis {
  return isRecord(value) && typeof value.word === "string" && typeof value.meaning === "string";
}

function isTextGrammarAnalysis(value: unknown): value is TextGrammarAnalysis {
  return isRecord(value) && typeof value.title === "string" && typeof value.explanation === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
