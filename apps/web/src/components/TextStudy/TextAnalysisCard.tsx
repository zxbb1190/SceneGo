import type { TextAnalysisJson, TextVocabularyAnalysis } from "@scenego/shared";

export interface TextAnalysisCardProps {
  analysis?: TextAnalysisJson;
  onAddVocabulary?: (vocabulary: TextVocabularyAnalysis) => void;
  addingVocabularyKey?: string;
}

export function TextAnalysisCard({
  addingVocabularyKey,
  analysis,
  onAddVocabulary
}: TextAnalysisCardProps) {
  if (!analysis) {
    return (
      <div className="rounded border border-dashed border-line bg-white p-4 text-sm text-slate-500">
        AI 分析结果
      </div>
    );
  }

  return (
    <article className="space-y-5 rounded border border-line bg-white p-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-panel px-2 py-1 text-xs font-semibold text-slate-600">
            {itemTypeLabels[analysis.itemType]}
          </span>
          <span className="text-xs text-slate-500">{analysis.language}</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold">{analysis.originalText}</h2>
        <p className="mt-2 text-sm text-slate-700">{analysis.translation}</p>
        <p className="mt-2 text-sm text-slate-600">{analysis.summary}</p>
      </header>

      {analysis.chunks.length ? (
        <section>
          <h3 className="text-sm font-semibold">拆解</h3>
          <div className="mt-2 grid gap-2">
            {analysis.chunks.map((chunk, index) => (
              <div key={`${chunk.text}-${index}`} className="rounded bg-panel p-3 text-sm">
                <p className="font-medium">{chunk.text}</p>
                <p className="mt-1 text-slate-600">{chunk.meaning}</p>
                {chunk.note ? <p className="mt-1 text-xs text-slate-500">{chunk.note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {analysis.vocabulary.length ? (
        <section>
          <h3 className="text-sm font-semibold">词汇</h3>
          <div className="mt-2 grid gap-2">
            {analysis.vocabulary.map((vocabulary, index) => {
              const vocabularyKey = getVocabularyKey(vocabulary, index);

              return (
                <div
                  key={vocabularyKey}
                  className="grid gap-3 rounded bg-panel p-3 text-sm md:grid-cols-[minmax(0,1fr)_120px]"
                >
                  <div>
                    <p className="font-medium">
                      {vocabulary.word}
                      {vocabulary.partOfSpeech ? (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {vocabulary.partOfSpeech}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-slate-600">{vocabulary.meaning}</p>
                    {vocabulary.example ? (
                      <p className="mt-1 text-xs text-slate-500">{vocabulary.example}</p>
                    ) : null}
                  </div>
                  {onAddVocabulary ? (
                    <button
                      className="self-start rounded border border-line bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                      type="button"
                      disabled={addingVocabularyKey === vocabularyKey}
                      onClick={() => onAddVocabulary(vocabulary)}
                    >
                      加入生词本
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {analysis.grammar.length ? (
        <section>
          <h3 className="text-sm font-semibold">语法</h3>
          <div className="mt-2 space-y-2">
            {analysis.grammar.map((point) => (
              <div key={point.title} className="text-sm">
                <p className="font-medium">{point.title}</p>
                <p className="mt-1 text-slate-600">{point.explanation}</p>
                {point.examples?.length ? (
                  <p className="mt-1 text-xs text-slate-500">{point.examples.join(" / ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <TextListSection title="自然用法" items={analysis.naturalUsage} />
      <TextListSection title="相似表达" items={analysis.similarExpressions} />
      <TextListSection title="例句" items={analysis.examples} />
      <TextListSection title="记忆提示" items={analysis.memoryTips} />
    </article>
  );
}

export function getVocabularyKey(vocabulary: TextVocabularyAnalysis, index: number): string {
  return `${vocabulary.word}-${index}`;
}

const itemTypeLabels: Record<TextAnalysisJson["itemType"], string> = {
  word: "单词",
  phrase: "短语",
  sentence: "句子",
  paragraph: "段落",
  mixed: "混合"
};

function TextListSection({ items, title }: { items: string[]; title: string }) {
  if (!items.length) {
    return null;
  }

  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
