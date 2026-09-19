// Play's internal-track completion is not a public production release.
export function internalTrackStatus(status: string): { status: string; rejection_reason?: string } | null {
  if (status === "completed" || status === "inProgress") return { status: "internal_testing" };
  if (status === "draft") return { status: "pending_credentials", rejection_reason: "The internal release is a draft. Complete its setup in Play Console." };
  if (status === "halted") return { status: "pending_credentials", rejection_reason: "The internal testing release is halted in Play Console." };
  return null;
}
