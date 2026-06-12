import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import pt from './locales/pt';
import en from './locales/en';

// ─── Supported languages ──────────────────────────────────────────────────────
export const IDIOMAS_SUPORTADOS = ['pt-PT', 'en'] as const;
export type IdiomaSuportado = (typeof IDIOMAS_SUPORTADOS)[number];

export const IDIOMA_FALLBACK: IdiomaSuportado = 'pt-PT';

// ─── Init ─────────────────────────────────────────────────────────────────────
// O idioma de arranque é SEMPRE pt-PT (não segue o idioma do dispositivo).
// A preferência guardada do utilizador (utilizadores.idioma) é aplicada no
// login/restauro de sessão pelo AuthContext.
i18n.use(initReactI18next).init({
  resources: {
    'pt-PT': { translation: pt },
    en: { translation: en },
  },
  lng: IDIOMA_FALLBACK,
  fallbackLng: IDIOMA_FALLBACK,
  supportedLngs: [...IDIOMAS_SUPORTADOS],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnNull: false,
  // Plural keys use the v4 JSON format (`key_one` / `key_other`). Plural
  // selection is driven by the `count` option passed at each call site
  // (alongside `contagem` for display interpolation).
  compatibilityJSON: 'v4',
});

export { i18n, useTranslation };
export default i18n;
