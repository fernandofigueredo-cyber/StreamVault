export const ADULT_KEYWORDS = [
  'adult', 'adulto', 'xxx', '+18', '18+', 'porn', 'sexo', 
  'hot', 'erotic', 'erotico', 'onlyfans', 'playboy'
];

export function isAdultContent(item: { category?: string, title?: string, name?: string, rating?: string }) {
  const text = `${item.category || ''} ${item.title || ''} ${item.name || ''} ${item.rating || ''}`.toLowerCase();
  return ADULT_KEYWORDS.some(k => text.includes(k));
}

export async function hashPin(pin: string): Promise<string> {
  // funciona no browser e no build
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  // fallback simples para o build não quebrar
  return `pin_${pin}`;
}

export function isUnlockValid(unlockedUntil: number | null) {
  if (!unlockedUntil) return false;
  return Date.now() < unlockedUntil;
}
