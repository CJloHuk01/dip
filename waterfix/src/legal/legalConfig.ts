/**
 * Единый конфиг юридических реквизитов.
 * Замени значения в квадратных скобках на реальные данные оператора.
 * Версия документов используется в cookie-баннере и при регистрации:
 * при изменении версии пользователям снова покажется уведомление о cookie,
 * а в БД будет сохранена версия, которую принял пользователь.
 */
export const legalConfig = {
  siteName: 'WaterFix',
  siteDomain: '[ДОМЕН САЙТА]',

  operatorName: '[НАИМЕНОВАНИЕ ОПЕРАТОРА]',
  operatorInn: '[ИНН]',
  operatorOgrn: '[ОГРН / ОГРНИП]',
  operatorAddress: '[ЮРИДИЧЕСКИЙ АДРЕС]',

  privacyEmail: '[EMAIL ДЛЯ ОБРАЩЕНИЙ]',
  privacyPhone: '[ТЕЛЕФОН]',

  docsVersion: '1.0',
  docsDate: '01.01.2026',
} as const;

export type LegalDocId = 'terms' | 'privacy' | 'cookies';

export const legalRoutes: Record<LegalDocId, string> = {
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  cookies: '/legal/cookies',
};
