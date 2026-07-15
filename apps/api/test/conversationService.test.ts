import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldTreatAsFollowUp } from "../src/services/conversationService.js";

const history = [{ role: "user" as const, content: "That was pretty impressive." }];

describe("conversation routing guard", () => {
  it("keeps questions about the previous expression out of the study library", () => {
    assert.equal(shouldTreatAsFollowUp("这里的 pretty 在这句话里是什么意思？", history), true);
    assert.equal(shouldTreatAsFollowUp("Can you explain the grammar?", history), true);
  });

  it("does not block a normal new message", () => {
    assert.equal(shouldTreatAsFollowUp("I love that movie.", history), false);
    assert.equal(shouldTreatAsFollowUp("This is a useful new sentence.", history), false);
  });
});
