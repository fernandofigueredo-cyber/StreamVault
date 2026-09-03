export const ADULT_KEYWORDS = ['adult','adulto','xxx','+18','18+','porn','sexo','hot','erotic','erotico','onlyfans','playboy'];

export function isAdultContent(item: { category?: string | null, title?: string | null, name?: string | null, rating?: string | null }) {
  const text = `${item.category || ''} ${item.title || ''} ${item.name || ''} ${item.rating || ''}`.toLowerCase();
  return ADULT_KEYWORDS.some(k => text.includes(k));
}

export async function hashPin(pin: string): Promise<string> {
  return `hash_${pin}`;
}

export function isUnlockValid(unlockedUntil: number | null) {
  if (!unlockedUntil) return false;
  return Date.now() < unlockedUntil;
}
