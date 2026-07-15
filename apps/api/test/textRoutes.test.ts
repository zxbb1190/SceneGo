import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJsonStringField } from "../src/routes/textRoutes.js";
import { createStreamingTextAnalysisSnapshot } from "../src/services/streamingTextAnalysis.js";

describe("streamed structured reply extraction", () => {
  it("extracts partial reply text before the JSON object is complete", () => {
    assert.equal(
      extractJsonStringField('{"messageType":"follow_up","reply":"正在流式', "reply"),
      "正在流式"
    );
    assert.equal(
      extractJsonStringField('{"messageType":"follow_up","reply":"正在流式回复。","tags":[]}', "reply"),
      "正在流式回复。"
    );
  });

  it("decodes escaped content without treating an escaped quote as the end", () => {
    assert.equal(
      extractJsonStringField('{"reply":"Use \\"pretty\\" here.","tags":[]}', "reply"),
      'Use "pretty" here.'
    );
  });
});

describe("streamed text analysis extraction", () => {
  const base = {
    originalText: "He wasn't like this in the past.",
    normalizedText: "he wasn't like this in the past.",
    language: "en",
    itemType: "sentence" as const
  };

  it("streams scalar fields and completed array items from incomplete JSON", () => {
    const snapshot = createStreamingTextAnalysisSnapshot(
      '{"originalText":"He wasn\'t like this in the past.","translation":"他过去不是这样的","summary":"描述过去和现在的差异",' +
        '"chunks":[{"text":"wasn\'t like this","meaning":"过去不是这样"},{"text":"in the past","meaning":"在过去"}],' +
        '"vocabulary":[{"word":"past","meaning":"过去"},{"word":"unfinished"',
      base
    );

    assert.equal(snapshot.translation, "他过去不是这样的");
    assert.equal(snapshot.summary, "描述过去和现在的差异");
    assert.equal(snapshot.chunks.length, 2);
    assert.equal(snapshot.vocabulary.length, 1);
    assert.equal(snapshot.vocabulary[0]?.word, "past");
  });

  it("keeps nested grammar examples separate from top-level examples", () => {
    const snapshot = createStreamingTextAnalysisSnapshot(
      '{"grammar":[{"title":"Past tense","explanation":"Use was not.","examples":["He was not ready."]}],' +
        '"naturalUsage":[],"similarExpressions":[],"examples":["Things were different then."],"memoryTips":["Past means before now."]}',
      base
    );

    assert.deepEqual(snapshot.grammar[0]?.examples, ["He was not ready."]);
    assert.deepEqual(snapshot.examples, ["Things were different then."]);
    assert.deepEqual(snapshot.memoryTips, ["Past means before now."]);
  });
});
