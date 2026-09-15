import { test } from "node:test";
import assert from "node:assert/strict";
import { ciState } from "./deploy-gate.mjs";
const run = (fields = {}) => ({ id: 1, head_sha: "target", event: "push", status: "completed", conclusion: "success", ...fields });
test("requires CI success for the exact commit", () => {
  assert.equal(ciState([run()], "target"), "success");
  assert.equal(ciState([run()], "different"), "pending");
  assert.equal(ciState([run({ event: "pull_request_target" })], "target"), "pending");
});
test("blocks failed, cancelled, skipped and unfinished runs", () => {
  for (const conclusion of ["failure", "cancelled", "skipped", "timed_out"]) {
    assert.equal(ciState([run({ conclusion })], "target"), "failed");
  }
  assert.equal(ciState([run({ status: "in_progress" })], "target"), "pending");
});
test("a previous success cannot override a newer unsuccessful run", () => {
  assert.equal(ciState([run(), run({ id: 2, conclusion: "failure" })], "target"), "failed");
});
