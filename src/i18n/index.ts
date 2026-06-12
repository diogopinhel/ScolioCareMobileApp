import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';

import pt from './locales/pt';
import en from './locales/en';

// ─── Supported languages ──────────────────────────────────────────────────────
export const IDIOMAS_SUPORTADOS = ['pt-PT', 'en'] as const;
export type IdiomaSuportado = (typeof IDIOMAS_SUPORTADOS)[number];

export const IDIOMA_FALLBACK: IdiomaSuportado = 'pt-PT';

// ─── Device language detection (initial fallback only) ────────────────────────
// Maps the device locale to one of our supported languages.
// Anything that is not English falls back to pt-PT.
function detetarIdiomaDispositivo(): IdiomaSuportado {
  try {
    const locales = getLocales();
    const codigo = locales[0]?.languageCode?.toLowerCase() ?? 'pt';
    return codigo === 'en' ? 'en' : 'pt-PT';
  } catch {
    return IDIOMA_FALLBACK;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
i18n.use(initReactI18next).init({
  resources: {
    'pt-PT': { translation: pt },
    en: { translation: en },
  },
  lng: detetarIdiomaDispositivo(),
  fallbackLng: IDIOMA_FALLBACK,
  // 'pt' (without region) should resolve to 'pt-PT'
  nonExplicitSupportedLngs: true,
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
