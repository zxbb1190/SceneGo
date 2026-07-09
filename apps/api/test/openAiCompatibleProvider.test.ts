import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import {
  OpenAiCompatibleProvider,
  parseAnalysisJson,
  parseTextAnalysisJson
} from "../src/adapters/ai/openAiCompatibleProvider.js";
import { AiProviderInvalidResponseError } from "../src/adapters/ai/types.js";
import {
  classifyStudyText,
  normalizeStudyText
} from "../src/services/textAnalysisService.js";

const validAnalysisJson = {
  originalText: "Hello world.",
  language: "en",
  translation: "你好，世界。",
  tokens: [
    {
      text: "Hello",
      lemma: "hello",
      partOfSpeech: "interjection",
      meaning: "你好"
    }
  ],
  grammar: [
    {
      title: "Simple greeting",
      explanation: "A short greeting sentence.",
      examples: ["Hello there."]
    }
  ],
  usageNotes: ["Common in everyday speech."],
  similarExpressions: ["Hi."]
};

const validTextAnalysisJson = {
  originalText: "impressive",
  normalizedText: "impressive",
  language: "en",
  itemType: "word",
  translation: "令人印象深刻的",
  summary: "An adjective for something that leaves a strong positive impression.",
  chunks: [
    {
      text: "impress",
      meaning: "留下印象"
    }
  ],
  vocabulary: [
    {
      word: "impressive",
      lemma: "impressive",
      partOfSpeech: "adjective",
      meaning: "令人印象深刻的",
      example: "That was pretty impressive."
    }
  ],
  grammar: [],
  naturalUsage: ["Often used after pretty, really, or very."],
  similarExpressions: ["remarkable"],
  examples: ["Your presentation was impressive."],
  memoryTips: ["impress + ive means able to impress people."]
};

describe("parseAnalysisJson", () => {
  it("accepts valid structured sentence analysis JSON", () => {
    const parsed = parseAnalysisJson(JSON.stringify(validAnalysisJson));

    assert.equal(parsed.originalText, "Hello world.");
    assert.equal(parsed.tokens[0]?.meaning, "你好");
    assert.equal(parsed.grammar[0]?.examples?.[0], "Hello there.");
  });

  it("accepts JSON wrapped in a markdown code fence", () => {
    const parsed = parseAnalysisJson(`\`\`\`json
${JSON.stringify(validAnalysisJson)}
\`\`\``);

    assert.equal(parsed.translation, "你好，世界。");
  });

  it("rejects syntactically invalid JSON", () => {
    assert.throws(() => parseAnalysisJson("{not-json"));
  });

  it("rejects JSON that does not match the sentence analysis schema", () => {
    assert.throws(
      () => parseAnalysisJson(JSON.stringify({ originalText: "Missing required fields" })),
      ZodError
    );
  });
});

describe("parseTextAnalysisJson", () => {
  it("accepts valid structured text analysis JSON", () => {
    const parsed = parseTextAnalysisJson(JSON.stringify(validTextAnalysisJson));

    assert.equal(parsed.itemType, "word");
    assert.equal(parsed.vocabulary[0]?.word, "impressive");
  });
});

describe("OpenAiCompatibleProvider", () => {
  it("passes configured provider request options", async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    let requestBody: Record<string, unknown> = {};

    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

      return new Response(
        JSON.stringify({
          model: "test-model",
          choices: [
            {
              message: {
                content: JSON.stringify(validAnalysisJson)
              }
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    };

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1/",
        apiKey: "test-key",
        model: "test-model",
        enableThinking: false,
        responseFormat: "json_object",
        maxTokens: 2048
      });

      const result = await provider.analyzeSentence({
        projectId: "project-1",
        language: "en",
        text: "Hello world."
      });

      assert.equal(requestUrl, "https://example.test/v1/chat/completions");
      assert.equal(requestBody.enable_thinking, false);
      assert.deepEqual(requestBody.response_format, { type: "json_object" });
      assert.equal(requestBody.max_tokens, 2048);
      assert.equal(result.usage?.totalTokens, 30);
      assert.equal(result.analysis.originalText, validAnalysisJson.originalText);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("analyzes text with configured provider request options", async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> = {};

    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

      return new Response(
        JSON.stringify({
          model: "test-model",
          choices: [
            {
              message: {
                content: JSON.stringify(validTextAnalysisJson)
              }
            }
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 15,
            total_tokens: 20
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    };

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "test-key",
        model: "test-model",
        enableThinking: false,
        maxTokens: 2048
      });

      const result = await provider.analyzeText({
        userId: "user-1",
        studyItemId: "study-item-1",
        language: "en",
        itemType: "word",
        text: "Impressive",
        normalizedText: "impressive"
      });

      assert.equal(requestBody.enable_thinking, false);
      assert.equal(requestBody.max_tokens, 2048);
      assert.equal(result.analysis.originalText, "Impressive");
      assert.equal(result.analysis.normalizedText, "impressive");
      assert.equal(result.usage?.totalTokens, 20);
      assert.equal(requestBody.response_format, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("wraps invalid provider JSON as an AI response error", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          model: "test-model",
          choices: [
            {
              message: {
                content: '{"originalText":"unterminated'
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "test-key",
        model: "test-model"
      });

      await assert.rejects(
        () =>
          provider.analyzeText({
            userId: "user-1",
            studyItemId: "study-item-1",
            language: "en",
            itemType: "word",
            text: "Impressive",
            normalizedText: "impressive"
          }),
        AiProviderInvalidResponseError
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("text study helpers", () => {
  it("normalizes and classifies common text inputs", () => {
    assert.equal(normalizeStudyText("  Impressive  "), "impressive");
    assert.equal(classifyStudyText("impressive", "impressive"), "word");
    assert.equal(classifyStudyText("pretty impressive", "pretty impressive"), "phrase");
    assert.equal(
      classifyStudyText(
        "I'm not gonna lie, that was pretty impressive.",
        "i'm not gonna lie, that was pretty impressive."
      ),
      "sentence"
    );
    assert.equal(
      classifyStudyText("First sentence. Second sentence.", "first sentence. second sentence."),
      "paragraph"
    );
  });
});
