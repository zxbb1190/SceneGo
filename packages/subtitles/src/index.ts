export type SubtitleFormat = "srt" | "vtt";

export interface ParsedSubtitleLine {
  lineIndex: number;
  startTime: number;
  endTime: number;
  textOriginal: string;
  textTranslation?: string;
}

interface CueTiming {
  startTime: number;
  endTime: number;
}

const TIMESTAMP_PATTERN = /^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{3})$/;

export function parseSubtitle(
  input: string,
  format: SubtitleFormat = detectSubtitleFormat(input)
): ParsedSubtitleLine[] {
  return format === "vtt" ? parseVtt(input) : parseSrt(input);
}

export function parseSrt(input: string): ParsedSubtitleLine[] {
  return parseCueBlocks(input).map(toIndexedLine);
}

export function parseVtt(input: string): ParsedSubtitleLine[] {
  const withoutHeader = normalizeLineEndings(input)
    .split("\n")
    .filter((line) => !line.trim().startsWith("WEBVTT"))
    .join("\n");

  return parseCueBlocks(withoutHeader).map(toIndexedLine);
}

export function matchSubtitleLine<T extends Pick<ParsedSubtitleLine, "startTime" | "endTime">>(
  lines: readonly T[],
  currentTime: number
): T | null {
  let low = 0;
  let high = lines.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const line = lines[mid];

    if (!line) {
      return null;
    }

    if (currentTime < line.startTime) {
      high = mid - 1;
      continue;
    }

    if (currentTime >= line.endTime) {
      low = mid + 1;
      continue;
    }

    return line;
  }

  return null;
}

function detectSubtitleFormat(input: string): SubtitleFormat {
  return normalizeLineEndings(input).trimStart().startsWith("WEBVTT") ? "vtt" : "srt";
}

function parseCueBlocks(input: string): Omit<ParsedSubtitleLine, "lineIndex">[] {
  return normalizeLineEndings(input)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseCueBlock)
    .filter((line): line is Omit<ParsedSubtitleLine, "lineIndex"> => line !== null)
    .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
}

function parseCueBlock(block: string): Omit<ParsedSubtitleLine, "lineIndex"> | null {
  const rows = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const timingIndex = rows.findIndex((line) => line.includes("-->"));
  if (timingIndex === -1) {
    return null;
  }

  const timing = parseCueTiming(rows[timingIndex] ?? "");
  if (!timing) {
    return null;
  }

  const textOriginal = cleanCueText(rows.slice(timingIndex + 1));
  if (!textOriginal) {
    return null;
  }

  return {
    startTime: timing.startTime,
    endTime: timing.endTime,
    textOriginal
  };
}

function parseCueTiming(value: string): CueTiming | null {
  const [startValue, endValueWithSettings] = value.split(/\s+-->\s+/);
  const endValue = endValueWithSettings?.split(/\s+/)[0];

  if (!startValue || !endValue) {
    return null;
  }

  const startTime = parseTimestamp(startValue);
  const endTime = parseTimestamp(endValue);

  if (startTime === null || endTime === null || endTime <= startTime) {
    return null;
  }

  return { startTime, endTime };
}

function parseTimestamp(value: string): number | null {
  const match = TIMESTAMP_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function normalizeLineEndings(input: string): string {
  return input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function cleanCueText(rows: string[]): string {
  return rows
    .map((line) =>
      line
        .replace(/<\d{2}:\d{2}:\d{2}[.,]\d{3}>/g, "")
        .replace(/<\d{2}:\d{2}[.,]\d{3}>/g, "")
        .replace(/<[^>]+>/g, "")
        .trim()
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function toIndexedLine(
  line: Omit<ParsedSubtitleLine, "lineIndex">,
  index: number
): ParsedSubtitleLine {
  return {
    ...line,
    lineIndex: index
  };
}
