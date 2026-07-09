import type { SentenceAnalysisJson, SentenceProgressStatus, SubtitleLine } from "@scenego/shared";
import { SentenceAnalysisCard } from "./SentenceAnalysisCard.js";

export interface StudyPanelProps {
  currentLine?: SubtitleLine;
  analysis?: SentenceAnalysisJson;
  analysisError?: string;
  isAnalyzing?: boolean;
  isFavorite?: boolean;
  listenCount?: number;
  note: string;
  status?: SentenceProgressStatus;
  onAnalyze?: () => void;
  onFavorite?: () => void;
  onStatusChange?: (status: SentenceProgressStatus) => void;
  onAddVocabulary?: () => void;
  onNoteChange: (note: string) => void;
  onSaveNote?: () => void;
  vocabularyMeaning: string;
  vocabularyWord: string;
  onVocabularyMeaningChange: (meaning: string) => void;
  onVocabularyWordChange: (word: string) => void;
}

export function StudyPanel({
  analysis,
  analysisError,
  currentLine,
  isFavorite,
  isAnalyzing,
  listenCount,
  note,
  status,
  onAddVocabulary,
  onAnalyze,
  onFavorite,
  onStatusChange,
  onNoteChange,
  onSaveNote,
  onVocabularyMeaningChange,
  onVocabularyWordChange,
  vocabularyMeaning,
  vocabularyWord
}: StudyPanelProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded border border-line bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">当前句</p>
        <p className="mt-2 text-base text-ink">{currentLine?.textOriginal ?? "暂停后显示当前句"}</p>
        {currentLine ? <p className="mt-2 text-xs text-slate-500">已听 {listenCount ?? 0} 次</p> : null}
      </div>
      <div className="rounded border border-line bg-white p-3">
        <p className="text-sm font-semibold">学习状态</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {sentenceStatusOptions.map((option) => (
            <button
              key={option.value}
              className={[
                "rounded border px-3 py-2 text-sm disabled:opacity-50",
                status === option.value ? "border-accent bg-accent text-white" : "border-line bg-white text-slate-700"
              ].join(" ")}
              type="button"
              disabled={!currentLine}
              onClick={() => onStatusChange?.(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <button
        className="w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        type="button"
        disabled={!currentLine || isAnalyzing}
        onClick={onAnalyze}
      >
        {isAnalyzing ? "分析中..." : "分析当前句"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" type="button" disabled={!currentLine} onClick={onFavorite}>
          {isFavorite ? "取消收藏" : "收藏句子"}
        </button>
        <button className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50" type="button" disabled={!currentLine} onClick={onSaveNote}>
          保存笔记
        </button>
      </div>
      <textarea
        className="min-h-24 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
        placeholder="句子笔记"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
      />
      <div className="rounded border border-line bg-white p-4">
        <p className="text-sm font-semibold">添加生词</p>
        <div className="mt-3 grid gap-2">
          <input
            className="rounded border border-line px-3 py-2 text-sm"
            placeholder="单词或表达"
            value={vocabularyWord}
            onChange={(event) => onVocabularyWordChange(event.target.value)}
          />
          <input
            className="rounded border border-line px-3 py-2 text-sm"
            placeholder="释义"
            value={vocabularyMeaning}
            onChange={(event) => onVocabularyMeaningChange(event.target.value)}
          />
          <button
            className="rounded border border-line px-3 py-2 text-sm disabled:opacity-50"
            type="button"
            disabled={!vocabularyWord.trim()}
            onClick={onAddVocabulary}
          >
            加入生词本
          </button>
        </div>
      </div>
      {analysisError ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{analysisError}</p> : null}
      <SentenceAnalysisCard analysis={analysis} />
    </aside>
  );
}

const sentenceStatusOptions: Array<{ value: SentenceProgressStatus; label: string }> = [
  { value: "viewed", label: "看过" },
  { value: "learning", label: "学习中" },
  { value: "mastered", label: "已掌握" }
];
