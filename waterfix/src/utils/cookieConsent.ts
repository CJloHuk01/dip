import { legalConfig } from '../legal/legalConfig';

export const COOKIE_CONSENT_KEY = 'waterfix_cookie_consent';

export type CookieCategory = 'necessary' | 'analytics' | 'marketing';

export interface CookieConsent {
  version: string;
  date: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

/**
 * Читает сохранённое согласие. Возвращает null, если согласия нет
 * или версия документов изменилась — тогда баннер показывается снова.
 */
export function readCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== legalConfig.docsVersion) return null;

    return {
      version: parsed.version,
      date: typeof parsed.date === 'string' ? parsed.date : '',
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(analytics: boolean, marketing: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: legalConfig.docsVersion,
    date: new Date().toISOString(),
    necessary: true,
    analytics,
    marketing,
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

/**
 * Проверка согласия для конкретной категории. Необходимые cookie
 * не требуют согласия и работают всегда.
 */
export function hasCookieConsent(category: CookieCategory = 'necessary'): boolean {
  if (category === 'necessary') return true;

  const consent = readCookieConsent();
  return Boolean(consent?.[category]);
}
