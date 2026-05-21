import type { FamiliaConfig, MemberId } from "../types/models";

/**
 * Resolves the memberId for a given email by searching through
 * /config/familia.miembros[*].mails. Case-insensitive match.
 *
 * Returns null if the email is not authorized.
 */
export function resolveMemberId(
  email: string,
  familia: FamiliaConfig
): MemberId | null {
  const normalized = email.trim().toLowerCase();

  for (const [memberId, info] of Object.entries(familia.miembros)) {
    const matches = info.mails.some(
      (m) => m.trim().toLowerCase() === normalized
    );
    if (matches) {
      return memberId as MemberId;
    }
  }

  return null;
}
