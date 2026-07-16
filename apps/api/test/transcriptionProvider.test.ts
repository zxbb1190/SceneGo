import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OpenAiCompatibleTranscriptionProvider } from "../src/adapters/transcription/openAiCompatibleTranscriptionProvider.js";
import { TranscriptionProviderInvalidResponseError } from "../src/adapters/transcription/types.js";

describe("OpenAiCompatibleTranscriptionProvider", () => {
  it("uploads audio using the OpenAI-compatible transcription contract", async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    let requestInit: RequestInit | undefined;

    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ text: "He was not like this in the past." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    try {
      const provider = new OpenAiCompatibleTranscriptionProvider({
        baseUrl: "https://example.test/v1/",
        apiKey: "test-key",
        model: "test-stt-model",
        transcriptionPath: "/audio/transcriptions",
        requestTimeoutMs: 5_000
      });
      const result = await provider.transcribe({
        audio: new Uint8Array([1, 2, 3, 4]),
        mimeType: "audio/webm",
        fileName: "recording.webm"
      });

      assert.equal(requestUrl, "https://example.test/v1/audio/transcriptions");
      assert.equal(new Headers(requestInit?.headers).get("Authorization"), "Bearer test-key");
      assert.ok(requestInit?.body instanceof FormData);
      assert.equal(requestInit.body.get("model"), "test-stt-model");
      const file = requestInit.body.get("file");
      assert.ok(file instanceof Blob);
      assert.equal(file.size, 4);
      assert.equal(file.type, "audio/webm");
      assert.equal(result.text, "He was not like this in the past.");
      assert.equal(result.modelName, "test-stt-model");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects provider responses without transcription text", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ result: "missing text" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

    try {
      const provider = new OpenAiCompatibleTranscriptionProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "test-key",
        model: "test-stt-model",
        transcriptionPath: "audio/transcriptions",
        requestTimeoutMs: 5_000
      });

      await assert.rejects(
        () => provider.transcribe({
          audio: new Uint8Array([1]),
          mimeType: "audio/webm",
          fileName: "recording.webm"
        }),
        TranscriptionProviderInvalidResponseError
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
