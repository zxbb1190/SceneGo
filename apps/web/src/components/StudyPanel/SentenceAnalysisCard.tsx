import type { SentenceAnalysisJson } from "@scenego/shared";

export interface SentenceAnalysisCardProps {
  analysis?: SentenceAnalysisJson;
}

export function SentenceAnalysisCard({ analysis }: SentenceAnalysisCardProps) {
  if (!analysis) {
    return (
      <div className="rounded border border-dashed border-line bg-white p-4 text-sm text-slate-500">
        AI 分析结果
      </div>
    );
  }

  return (
    <article className="space-y-4 rounded border border-line bg-white p-4">
      <div>
        <h2 className="text-base font-semibold">{analysis.originalText}</h2>
        <p className="mt-2 text-sm text-slate-700">{analysis.translation}</p>
      </div>
      {analysis.tokens.length ? (
        <section>
          <h3 className="text-sm font-semibold">词汇</h3>
          <div className="mt-2 space-y-2">
            {analysis.tokens.map((token, index) => (
              <div key={`${token.text}-${index}`} className="rounded bg-panel p-2 text-sm">
                <span className="font-medium">{token.text}</span>
                <span className="ml-2 text-slate-600">{token.meaning}</span>
              </div>
            ))}
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
                <p className="text-slate-600">{point.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
