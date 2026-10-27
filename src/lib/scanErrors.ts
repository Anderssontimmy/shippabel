// GitHub answers "not found" for a private repository the scanner cannot read, so the scan says
// "private app ... connect GitHub". That is the one scan failure with a one-click fix.
export const needsGitHubAccess = (message: string | null): boolean =>
  !!message && /private app|connect (your )?github/i.test(message);
