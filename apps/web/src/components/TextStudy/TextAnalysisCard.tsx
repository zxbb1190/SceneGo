import type { TextAnalysisJson, TextVocabularyAnalysis } from "@scenego/shared";
import { BookPlus } from "lucide-react";

export interface TextAnalysisCardProps {
  analysis?: TextAnalysisJson;
  onAddVocabulary?: (vocabulary: TextVocabularyAnalysis) => void;
  addingVocabularyKey?: string;
  streaming?: boolean;
}

export function TextAnalysisCard({
  addingVocabularyKey,
  analysis,
  onAddVocabulary,
  streaming = false
}: TextAnalysisCardProps) {
  if (!analysis) {
    return (
      <div className="text-analysis-empty">AI 分析结果</div>
    );
  }

  return (
    <article className={streaming ? "text-analysis is-streaming" : "text-analysis"}>
      <header className="text-analysis-header">
        <div className="text-analysis-kicker">
          <span>{itemTypeLabels[analysis.itemType]}</span>
          <span>{analysis.language}</span>
          {streaming ? <i className="text-analysis-stream-indicator" aria-label="分析生成中" /> : null}
        </div>
        <h2>{analysis.originalText}</h2>
        {analysis.translation ? <p className="text-analysis-translation">{analysis.translation}</p> : null}
        {analysis.summary ? <p className="text-analysis-summary">{analysis.summary}</p> : null}
      </header>

      {analysis.chunks.length ? (
        <section className="text-analysis-section">
          <h3>拆解</h3>
          <div className="text-analysis-chunks">
            {analysis.chunks.map((chunk, index) => (
              <div key={`${chunk.text}-${index}`}>
                <p>{chunk.text}</p>
                <span>{chunk.meaning}</span>
                {chunk.note ? <small>{chunk.note}</small> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {analysis.vocabulary.length ? (
        <section className="text-analysis-section">
          <h3>词汇</h3>
          <div className="text-analysis-vocabulary">
            {analysis.vocabulary.map((vocabulary, index) => {
              const vocabularyKey = getVocabularyKey(vocabulary, index);

              return (
                <div key={vocabularyKey}>
                  <div>
                    <p>
                      {vocabulary.word}
                      {vocabulary.partOfSpeech ? <small>{vocabulary.partOfSpeech}</small> : null}
                    </p>
                    <span>{vocabulary.meaning}</span>
                    {vocabulary.example ? <small>{vocabulary.example}</small> : null}
                  </div>
                  {onAddVocabulary ? (
                    <button
                      type="button"
                      disabled={addingVocabularyKey === vocabularyKey}
                      onClick={() => onAddVocabulary(vocabulary)}
                    >
                      <BookPlus aria-hidden="true" />
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
        <section className="text-analysis-section">
          <h3>语法</h3>
          <div className="text-analysis-grammar">
            {analysis.grammar.map((point) => (
              <div key={point.title}>
                <p>{point.title}</p>
                <span>{point.explanation}</span>
                {point.examples?.length ? <small>{point.examples.join(" / ")}</small> : null}
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
    <section className="text-analysis-section text-analysis-list">
      <h3>{title}</h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
