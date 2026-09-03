export const ADULT_KEYWORDS = ['adult', 'xxx', 'porn', 'sex', '+18', '18+', 'hot', 'erotic', 'adulto'];

export function isAdultContent(item: { category?: string, title?: string, rating?: string }) {
  const text = `${item.category} ${item.title} ${item.rating}`.toLowerCase();
  return ADULT_KEYWORDS.some(k => text.includes(k));
}

export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
