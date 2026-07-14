import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateNextReviewPlan,
  scoreQuizAnswer
} from "../src/services/reviewService.js";

describe("review service helpers", () => {
  it("uses deterministic review intervals", () => {
    const now = new Date("2026-07-09T10:30:00.000Z");

    const knownFirst = calculateNextReviewPlan("known", 0, now);
    assert.equal(knownFirst.masteryStatus, "mastered");
    assert.equal(knownFirst.intervalDays, 3);
    assert.equal(knownFirst.nextReviewAt.getTime(), startOfLocalDayAfter(now, 3).getTime());

    const knownLater = calculateNextReviewPlan("known", 3, now);
    assert.equal(knownLater.intervalDays, 6);

    const fuzzy = calculateNextReviewPlan("fuzzy", 6, now);
    assert.equal(fuzzy.masteryStatus, "learning");
    assert.equal(fuzzy.intervalDays, 1);
    assert.equal(fuzzy.nextReviewAt.getTime(), startOfLocalDayAfter(now, 1).getTime());

    const unknown = calculateNextReviewPlan("unknown", 6, now);
    assert.equal(unknown.masteryStatus, "new");
    assert.equal(unknown.intervalDays, 1);
  });

  it("scores quiz answers with normalized punctuation and spacing", () => {
    assert.equal(scoreQuizAnswer("  Hello, world! ", "hello world"), true);
    assert.equal(scoreQuizAnswer("令人印象深刻的。", "令人印象深刻的"), true);
    assert.equal(scoreQuizAnswer("普通的", "令人印象深刻的"), false);
  });
});

function startOfLocalDayAfter(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}
