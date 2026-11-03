export function classifySignInError(message: string): string {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox.";
  }
  return "Credentials are incorrect. Please try again.";
}
