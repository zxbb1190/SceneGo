import type { SentenceAnalysisJson, SentenceProgressStatus } from "@scenego/shared";
import { SentenceAnalysisCard } from "../StudyPanel/SentenceAnalysisCard.js";

export interface ExternalStudyPanelProps {
  externalUrl?: string;
  analysis?: SentenceAnalysisJson;
  analysisError?: string;
  isAnalyzing?: boolean;
  isFavorite?: boolean;
  manualText: string;
  note: string;
  status?: SentenceProgressStatus;
  vocabularyMeaning: string;
  vocabularyWord: string;
  onManualTextChange: (text: string) => void;
  onAnalyzeManual?: () => void;
  onFavoriteManual?: () => void;
  onStatusManual?: (status: SentenceProgressStatus) => void;
  onNoteChange: (note: string) => void;
  onSaveManualNote?: () => void;
  onVocabularyMeaningChange: (meaning: string) => void;
  onVocabularyWordChange: (word: string) => void;
  onAddVocabulary?: () => void;
}

export function ExternalStudyPanel({
  analysis,
  analysisError,
  externalUrl,
  isAnalyzing,
  isFavorite,
  manualText,
  note,
  status,
  onAnalyzeManual,
  onFavoriteManual,
  onManualTextChange,
  onStatusManual,
  onNoteChange,
  onSaveManualNote,
  onVocabularyMeaningChange,
  onVocabularyWordChange,
  onAddVocabulary,
  vocabularyMeaning,
  vocabularyWord
}: ExternalStudyPanelProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {externalUrl ? (
          <iframe
            className="aspect-video w-full rounded border border-line bg-white"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            src={externalUrl}
            title="外链伴学"
          />
        ) : null}
        {externalUrl ? (
          <a className="inline-flex rounded bg-ink px-4 py-2 text-sm font-semibold text-white" href={externalUrl} target="_blank" rel="noreferrer">
            外部打开
          </a>
        ) : null}
      </div>
      <div className="rounded border border-line bg-white p-4">
        <p className="text-sm font-medium text-slate-700">外链伴学模式</p>
        <p className="mt-2 text-sm text-slate-600">
          系统不会读取外部播放器内部状态。暂停后可手动输入当前句进行分析。
        </p>
        <textarea
          className="mt-4 min-h-36 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
          placeholder="输入当前句"
          value={manualText}
          onChange={(event) => onManualTextChange(event.target.value)}
        />
        <button
          className="mt-3 w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={!manualText.trim() || isAnalyzing}
          onClick={onAnalyzeManual}
        >
          {isAnalyzing ? "分析中..." : "分析手动输入"}
        </button>
        <div className="mt-3 rounded border border-line bg-white p-3">
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
                disabled={!manualText.trim()}
                onClick={() => onStatusManual?.(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50"
            type="button"
            disabled={!manualText.trim()}
            onClick={onFavoriteManual}
          >
            {isFavorite ? "取消收藏" : "收藏句子"}
          </button>
          <button
            className="rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50"
            type="button"
            disabled={!manualText.trim()}
            onClick={onSaveManualNote}
          >
            保存笔记
          </button>
        </div>
        <textarea
          className="mt-3 min-h-20 w-full rounded border border-line bg-white p-3 text-sm outline-none focus:border-accent"
          placeholder="手动句笔记"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
        <div className="mt-4 rounded border border-line bg-white p-3">
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
        {analysisError ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{analysisError}</p> : null}
        <div className="mt-4">
          <SentenceAnalysisCard analysis={analysis} />
        </div>
      </div>
    </section>
  );
}

const sentenceStatusOptions: Array<{ value: SentenceProgressStatus; label: string }> = [
  { value: "viewed", label: "看过" },
  { value: "learning", label: "学习中" },
  { value: "mastered", label: "已掌握" }
];
