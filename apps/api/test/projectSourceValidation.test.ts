import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../src/http/apiError.js";
import {
  validateProjectSource,
  validateProjectSourceUpdate
} from "../src/routes/projectSourceValidation.js";

const subtitleText = `1
00:00:01,000 --> 00:00:02,000
Hello.`;

describe("validateProjectSource", () => {
  it("allows v0.1 local video projects with user-provided subtitles", () => {
    assert.doesNotThrow(() =>
      validateProjectSource({
        sourceType: "local_file",
        videoFileName: "demo.mp4",
        subtitleText
      })
    );
  });

  it("allows v0.1 network URL projects only with direct URL and subtitles", () => {
    assert.doesNotThrow(() =>
      validateProjectSource({
        sourceType: "network_url",
        sourceUrl: "https://example.com/video.mp4",
        subtitleText
      })
    );
  });

  it("allows external companion mode without importing full subtitles", () => {
    assert.doesNotThrow(() =>
      validateProjectSource({
        sourceType: "external_embed",
        sourceUrl: "https://example.com/watch"
      })
    );
  });

  it("rejects future source types in v0.1", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "official_licensed",
          sourceUrl: "https://example.com/video.mp4"
        }),
      "SOURCE_TYPE_NOT_SUPPORTED"
    );
  });

  it("rejects storing source URLs on local video projects", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "local_file",
          sourceUrl: "https://example.com/video.mp4",
          subtitleText
        }),
      "SOURCE_URL_NOT_ALLOWED"
    );
  });

  it("rejects external companion mode subtitle imports", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "external_embed",
          sourceUrl: "https://example.com/watch",
          subtitleText
        }),
      "EXTERNAL_MODE_MANUAL_ONLY"
    );
  });

  it("requires subtitles for video learning projects", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "local_file",
          videoFileName: "demo.mp4"
        }),
      "SUBTITLE_REQUIRED"
    );
  });

  it("requires a selected video file for local video projects", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "local_file",
          subtitleText
        }),
      "LOCAL_VIDEO_REQUIRED"
    );
  });

  it("rejects local video file names on URL-based projects", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "network_url",
          sourceUrl: "https://example.com/video.mp4",
          videoFileName: "demo.mp4",
          subtitleText
        }),
      "VIDEO_FILE_NOT_ALLOWED"
    );
  });

  it("requires a source URL for network video projects", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "network_url",
          subtitleText
        }),
      "SOURCE_URL_REQUIRED"
    );
  });

  it("requires a source URL for external companion projects", () => {
    assertApiError(
      () =>
        validateProjectSource({
          sourceType: "external_embed"
        }),
      "SOURCE_URL_REQUIRED"
    );
  });
});

describe("validateProjectSourceUpdate", () => {
  it("allows updating a URL source to another valid URL", () => {
    assert.doesNotThrow(() =>
      validateProjectSourceUpdate({
        sourceType: "network_url",
        sourceUrl: "https://example.com/new-video.mp4"
      })
    );
  });

  it("allows clearing sourceUrl on local video projects", () => {
    assert.doesNotThrow(() =>
      validateProjectSourceUpdate({
        sourceType: "local_file",
        sourceUrl: null
      })
    );
  });

  it("allows updating the selected video file name on local video projects", () => {
    assert.doesNotThrow(() =>
      validateProjectSourceUpdate({
        sourceType: "local_file",
        videoFileName: "new-demo.mp4"
      })
    );
  });

  it("rejects clearing URL-based project source URLs", () => {
    assertApiError(
      () =>
        validateProjectSourceUpdate({
          sourceType: "external_embed",
          sourceUrl: null
        }),
      "SOURCE_URL_REQUIRED"
    );
  });

  it("rejects adding a source URL to local video projects", () => {
    assertApiError(
      () =>
        validateProjectSourceUpdate({
          sourceType: "local_file",
          sourceUrl: "https://example.com/video.mp4"
        }),
      "SOURCE_URL_NOT_ALLOWED"
    );
  });

  it("rejects clearing the selected video file name on local video projects", () => {
    assertApiError(
      () =>
        validateProjectSourceUpdate({
          sourceType: "local_file",
          videoFileName: null
        }),
      "LOCAL_VIDEO_REQUIRED"
    );
  });

  it("rejects setting a local video file name on URL-based projects", () => {
    assertApiError(
      () =>
        validateProjectSourceUpdate({
          sourceType: "external_embed",
          videoFileName: "demo.mp4"
        }),
      "VIDEO_FILE_NOT_ALLOWED"
    );
  });

  it("allows clearing an accidental local video file name on URL-based projects", () => {
    assert.doesNotThrow(() =>
      validateProjectSourceUpdate({
        sourceType: "network_url",
        videoFileName: null
      })
    );
  });
});

function assertApiError(fn: () => void, code: string): void {
  assert.throws(fn, (error: unknown) => error instanceof ApiError && error.code === code);
}
