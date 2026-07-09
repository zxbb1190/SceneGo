import { describe, expect, it } from "vitest";
import { matchSubtitleLine, parseSubtitle } from "../src/index.js";

describe("parseSubtitle", () => {
  it("parses SRT cues in timeline order", () => {
    const lines = parseSubtitle(`2
00:00:03,000 --> 00:00:04,000
Second line

1
00:00:01,000 --> 00:00:02,500
First line`);

    expect(lines).toEqual([
      {
        lineIndex: 0,
        startTime: 1,
        endTime: 2.5,
        textOriginal: "First line"
      },
      {
        lineIndex: 1,
        startTime: 3,
        endTime: 4,
        textOriginal: "Second line"
      }
    ]);
  });

  it("parses VTT cues with cue settings", () => {
    const lines = parseSubtitle(`WEBVTT

00:00:01.000 --> 00:00:02.000 align:start
Hello`);

    expect(lines[0]?.textOriginal).toBe("Hello");
    expect(lines[0]?.startTime).toBe(1);
  });

  it("normalizes BOM and subtitle markup before storing cue text", () => {
    const lines = parseSubtitle(`\uFEFFWEBVTT

00:00:01.000 --> 00:00:03.000
<v Jane><i>Hello</i> <00:00:02.000>world</v>`);

    expect(lines).toEqual([
      {
        lineIndex: 0,
        startTime: 1,
        endTime: 3,
        textOriginal: "Hello world"
      }
    ]);
  });

  it("parses timestamps with more than two hour digits", () => {
    const lines = parseSubtitle(`1
100:00:01,000 --> 100:00:02,000
Long lecture`);

    expect(lines[0]?.startTime).toBe(360001);
    expect(lines[0]?.endTime).toBe(360002);
  });
});

describe("matchSubtitleLine", () => {
  it("matches the active line using current time", () => {
    const lines = parseSubtitle(`1
00:00:01,000 --> 00:00:02,000
Hello

2
00:00:02,000 --> 00:00:03,000
World`);

    expect(matchSubtitleLine(lines, 1.5)?.textOriginal).toBe("Hello");
    expect(matchSubtitleLine(lines, 2)?.textOriginal).toBe("World");
    expect(matchSubtitleLine(lines, 3)).toBeNull();
  });
});
