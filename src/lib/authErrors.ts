type AuthLikeError = Error & { status?: number; code?: string };

// Supabase's built-in mail sender allows only a couple of emails per hour for the whole
// project, and one per minute per address. Say what to do instead of showing its raw message.
export const signInEmailError = (error: AuthLikeError): string => {
  if (error.status !== 429 && error.code !== "over_email_send_rate_limit") return error.message;
  if (/after \d+ seconds?/i.test(error.message)) return "Please wait a minute before asking for another sign-in link.";
  return "We can't send more sign-in emails right now. Sign in with Google or GitHub instead, or try again in an hour.";
};
