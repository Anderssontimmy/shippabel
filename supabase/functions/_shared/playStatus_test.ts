import { assertEquals } from "jsr:@std/assert@1";
import { internalTrackStatus } from "./playStatus.ts";
Deno.test("internal rollout statuses never imply public approval or Google rejection", () => {
  for (const status of ["completed", "inProgress"]) assertEquals(internalTrackStatus(status)?.status, "internal_testing");
  for (const status of ["draft", "halted"]) assertEquals(internalTrackStatus(status)?.status, "pending_credentials");
  assertEquals(internalTrackStatus("unknown"), null);
});
