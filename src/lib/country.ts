/** Detects country/language from channel name and group_title. */

type CountryInfo = { code: string; flag: string; label: string };

const PATTERNS: Array<{ regex: RegExp; country: CountryInfo }> = [
  { regex: /\b(BR|BRA|BRASIL|BRAZIL|BRASILEIR|GLOBO|SBT|RECORD|BAND|REDETV|MULTISHOW|SPORTV|PREMIERE|TELECINE|CANAL BRASIL)\b/i,
    country: { code: "BR", flag: "🇧🇷", label: "Brasil" } },
  { regex: /\b(PT|POR|PORTUGAL|RTP|SIC|TVI|CMTV|BENFICA TV|SPORTING TV)\b/i,
    country: { code: "PT", flag: "🇵🇹", label: "Portugal" } },
  { regex: /\b(US|USA|AMERICAN|CNN|FOX|NBC|ABC|CBS|ESPN|HBO|SHOWTIME|STARZ)\b/i,
    country: { code: "US", flag: "🇺🇸", label: "EUA" } },
  { regex: /\b(UK|GBR|BRITISH|BBC|ITV|SKY|CHANNEL 4|CHANNEL 5|BT SPORT)\b/i,
    country: { code: "UK", flag: "🇬🇧", label: "Reino Unido" } },
  { regex: /\b(ES|ESP|SPAIN|ESPAÑOL|MOVISTAR|MEDIASET|ANTENA 3|LA SEXTA|TVE)\b/i,
    country: { code: "ES", flag: "🇪🇸", label: "Espanha" } },
  { regex: /\b(IT|ITA|ITALY|ITALIANO|RAI|MEDIASET IT|CANALE 5|LA7)\b/i,
    country: { code: "IT", flag: "🇮🇹", label: "Itália" } },
  { regex: /\b(FR|FRA|FRANCE|FRANÇAIS|TF1|M6|CANAL\+|ARTE)\b/i,
    country: { code: "FR", flag: "🇫🇷", label: "França" } },
  { regex: /\b(DE|DEU|GERMANY|DEUTSCH|ARD|ZDF|SAT\.1|PRO7|RTL)\b/i,
    country: { code: "DE", flag: "🇩🇪", label: "Alemanha" } },
  { regex: /\b(AR|ARG|ARGENTINA|TN |CANAL 13|TELEFE|C5N)\b/i,
    country: { code: "AR", flag: "🇦🇷", label: "Argentina" } },
  { regex: /\b(MX|MEX|MEXICO|TELEVISA|TV AZTECA|CANAL DE LAS ESTRELLAS)\b/i,
    country: { code: "MX", flag: "🇲🇽", label: "México" } },
  { regex: /\b(ANIME|ANIMES|CRUNCHYROLL|FUNIMATION|JAPONÊS|JAPAN|JP |JPN)\b/i,
    country: { code: "JP", flag: "🇯🇵", label: "Japão / Anime" } },
  { regex: /\b(AR |ARB|ARABIC|ALJAZEERA|AL JAZEERA|MBC|OSN|ROTANA|BEIN)\b/i,
    country: { code: "AR_LANG", flag: "🇸🇦", label: "Árabe" } },
];

export function detectCountry(name: string, group?: string | null): CountryInfo | null {
  const haystack = `${name} ${group ?? ""}`;
  for (const { regex, country } of PATTERNS) {
    if (regex.test(haystack)) return country;
  }
  return null;
}

export function groupByCountry<T extends { name: string; groupTitle?: string | null }>(
  items: T[],
): Map<string, { country: CountryInfo; items: T[] }> {
  const map = new Map<string, { country: CountryInfo; items: T[] }>();
  const other: T[] = [];

  for (const item of items) {
    const c = detectCountry(item.name, item.groupTitle);
    if (c) {
      const key = c.code;
      if (!map.has(key)) map.set(key, { country: c, items: [] });
      map.get(key)!.items.push(item);
    } else {
      other.push(item);
    }
  }

  if (other.length > 0) {
    map.set("OTHER", { country: { code: "OTHER", flag: "🌍", label: "Outros" }, items: other });
  }

  return map;
}

export const ALL_COUNTRIES: CountryInfo[] = [
  { code: "BR", flag: "🇧🇷", label: "Brasil" },
  { code: "PT", flag: "🇵🇹", label: "Portugal" },
  { code: "US", flag: "🇺🇸", label: "EUA" },
  { code: "UK", flag: "🇬🇧", label: "Reino Unido" },
  { code: "ES", flag: "🇪🇸", label: "Espanha" },
  { code: "IT", flag: "🇮🇹", label: "Itália" },
  { code: "FR", flag: "🇫🇷", label: "França" },
  { code: "DE", flag: "🇩🇪", label: "Alemanha" },
  { code: "AR", flag: "🇦🇷", label: "Argentina" },
  { code: "MX", flag: "🇲🇽", label: "México" },
  { code: "JP", flag: "🇯🇵", label: "Japão / Anime" },
  { code: "AR_LANG", flag: "🇸🇦", label: "Árabe" },
];
