import { authCopy } from "@/lib/copy";

export const googleIdentityScopes = ["openid", "email", "profile"] as const;

export function googleAuthError(code: string | undefined): string | null {
  if (!code) return null;
  if (["account_not_linked", "account not linked", "unable_to_link_account"].includes(code)) {
    return authCopy.googleLinkRequired;
  }
  if (["email_does_not_match", "account_already_linked_to_different_user"].includes(code)) {
    return authCopy.googleAccountMismatch;
  }
  if (["email_not_verified", "google_email_not_verified"].includes(code)) {
    return authCopy.googleEmailUnverified;
  }
  if (["access_denied", "user_cancelled"].includes(code)) return authCopy.googleCancelled;
  return authCopy.googleFailed;
}

// Google is an identity provider here; Gmail credentials belong to mailbox storage.
export function discardOAuthTokens<T extends Record<string, unknown>>(account: T) {
  return {
    ...account,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
  };
}
