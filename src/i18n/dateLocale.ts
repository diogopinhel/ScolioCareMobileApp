import { i18n } from './index';

// Mapeia o idioma ativo para o locale BCP-47 usado em toLocale*String.
// Inglês → 'en-GB' ; restante → 'pt-PT'.
export function localeDeData(): string {
  return i18n.language === 'en' ? 'en-GB' : 'pt-PT';
}
