/**
 * A 4-digit PIN that lives on this device. There is no account, no email, and
 * no cloud login — kids on a shared iPad or classroom Chromebook pick a name,
 * and the PIN is what stops the person next to them opening their game.
 *
 * Hashed with the profile id as salt so two players who pick 1234 do not
 * store the same string, and so the PIN is not sitting in the save file.
 */
export function isFourDigitPin(value: string): boolean {
  return /^\d{4}$/.test(value);
}

export async function hashPin(profileId: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`bossmode.pin.${profileId}.${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function pinMatches(
  profileId: string,
  pin: string,
  hash: string | undefined,
): Promise<boolean> {
  if (!hash) return true;
  if (!isFourDigitPin(pin)) return false;
  return (await hashPin(profileId, pin)) === hash;
}