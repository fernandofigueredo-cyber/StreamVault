export const ADULT_KEYWORDS = ['adult','adulto','xxx','+18','18+','porn','sexo','hot','erotic','erotico'];

export function isAdultContent(item: { category?: string, title?: string, name?: string }) {
  const text = `${item.category || ''} ${item.title || ''} ${item.name || ''}`.toLowerCase();
  return ADULT_KEYWORDS.some(k => text.includes(k));
}

export async function hashPin(pin: string): Promise<string> {
  return `hash_${pin}`;
}

export function isUnlockValid(unlockedUntil: number | null) {
  if (!unlockedUntil) return false;
  return Date.now() < unlockedUntil;
}
